// Vercel serverless function: POST { postcode, count } -> { locations: [...] }
//
// Pipeline:
//   1. Geocode the postcode with the free postcodes.io API (no key required).
//   2. Query OpenStreetMap's Overpass API for real nearby places (no key required),
//      prioritising named chains/brands ("large enterprises") and filling the rest with a
//      mix of shops, cafes, transport, workplaces and landmarks.
//   3. Generate an image for each place with the OpenAI Images API, using OPENAI_API_KEY
//      (server-side only — never sent to the client).
//
// Required environment variable (set in your Vercel project settings):
//   OPENAI_API_KEY = sk-...
//
// If OPENAI_API_KEY is missing, image generation is skipped and locations are returned
// without imageUrl so the client can still render them with its gradient placeholders.

const POSTCODES_IO = 'https://api.postcodes.io/postcodes/';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { postcode, count } = req.body || {};
    const cleanPostcode = String(postcode || '').trim();
    const targetCount = Math.min(Math.max(Number(count) || 20, 1), 100);

    if (!UK_POSTCODE_RE.test(cleanPostcode)) {
      res.status(400).json({ error: 'Please provide a valid UK postcode.' });
      return;
    }

    const geo = await geocodePostcode(cleanPostcode);
    if (!geo) {
      res.status(404).json({ error: 'Could not find that postcode.' });
      return;
    }

    const places = await findNearbyPlaces(geo.latitude, geo.longitude, targetCount);
    if (!places.length) {
      res.status(404).json({ error: 'No nearby places found for this postcode.' });
      return;
    }

    const withImages = await attachImages(places, geo.area);

    res.status(200).json({ locations: withImages, area: geo.area });
  } catch (err) {
    console.error('generate-locations failed:', err);
    res.status(500).json({ error: 'Location generation failed.' });
  }
};

async function geocodePostcode(postcode) {
  const response = await fetch(POSTCODES_IO + encodeURIComponent(postcode.replace(/\s+/g, '')));
  if (!response.ok) return null;
  const data = await response.json();
  if (!data.result) return null;
  return {
    latitude: data.result.latitude,
    longitude: data.result.longitude,
    area: data.result.admin_district || data.result.parish || data.result.region || postcode
  };
}

// Searches OpenStreetMap for real places within ~3km, split into "enterprises" (named
// chains/brands like Holland & Barrett) and general points of interest for variety.
async function findNearbyPlaces(lat, lon, targetCount) {
  const radius = 3000;
  const query = `
    [out:json][timeout:20];
    (
      node["shop"]["brand"](around:${radius},${lat},${lon});
      node["shop"]["name"](around:${radius},${lat},${lon});
      node["amenity"~"cafe|restaurant|fast_food|bank|pharmacy"]["name"](around:${radius},${lat},${lon});
      node["railway"="station"]["name"](around:${radius},${lat},${lon});
      node["office"]["name"](around:${radius},${lat},${lon});
      node["tourism"~"museum|attraction"]["name"](around:${radius},${lat},${lon});
      node["amenity"~"cinema|theatre|marketplace"]["name"](around:${radius},${lat},${lon});
      way["building"]["name"](around:${radius},${lat},${lon});
    );
    out center ${targetCount * 4};
  `;

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: query
  });
  if (!response.ok) return [];
  const data = await response.json();
  const elements = Array.isArray(data.elements) ? data.elements : [];

  const seenNames = new Set();
  const enterprises = [];
  const generic = [];

  elements.forEach((el) => {
    const tags = el.tags || {};
    const name = tags.name || tags.brand;
    if (!name || seenNames.has(name)) return;
    seenNames.add(name);

    const isEnterprise = Boolean(tags.brand) || (tags.shop && ['supermarket', 'department_store', 'chemist'].includes(tags.shop));
    const category = categoryFromTags(tags);
    const entry = {
      id: `osm-${el.type}-${el.id}`,
      name,
      category,
      isEnterprise,
      importance: isEnterprise ? 0.8 : 0.4,
      lat: el.lat || el.center?.lat,
      lon: el.lon || el.center?.lon
    };
    (isEnterprise ? enterprises : generic).push(entry);
  });

  // Aim for up to 10 real enterprises, then fill the remainder with general POIs.
  const chosenEnterprises = enterprises.slice(0, 10);
  const remaining = targetCount - chosenEnterprises.length;
  const chosenGeneric = generic.slice(0, Math.max(remaining, 0));

  return [...chosenEnterprises, ...chosenGeneric].slice(0, targetCount);
}

function categoryFromTags(tags) {
  if (tags.railway === 'station') return 'Transport';
  if (tags.amenity === 'cafe' || tags.amenity === 'restaurant' || tags.amenity === 'fast_food') return 'Hospitality';
  if (tags.office) return 'Commercial';
  if (tags.tourism) return 'Landmark';
  if (tags.amenity === 'cinema' || tags.amenity === 'theatre') return 'Leisure';
  if (tags.shop) return 'Retail';
  return 'Commercial';
}

async function attachImages(places, area) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return places.map((place) => ({ ...place, area, description: describePlace(place, area) }));
  }

  const results = [];
  for (const place of places) {
    const description = describePlace(place, area);
    let imageUrl = null;
    try {
      imageUrl = await generateImage(apiKey, place, area);
    } catch (err) {
      console.warn(`Image generation failed for ${place.name}:`, err.message);
    }
    results.push({ ...place, area, description, imageUrl });
  }
  return results;
}

async function generateImage(apiKey, place, area) {
  const prompt = `A realistic, high-quality photo of ${place.name}, a ${place.category.toLowerCase()} in ${area}, UK. Street-level view, natural lighting, no text or logos.`;
  const response = await fetch(OPENAI_IMAGES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
      n: 1
    })
  });
  if (!response.ok) throw new Error(`OpenAI image API responded with ${response.status}`);
  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;
  const url = data?.data?.[0]?.url;
  return url || (b64 ? `data:image/png;base64,${b64}` : null);
}

function describePlace(place, area) {
  if (place.isEnterprise) return `${place.name} is a well-known name doing business in ${area}.`;
  return `${place.category} spot near ${area} worth a look.`;
}
