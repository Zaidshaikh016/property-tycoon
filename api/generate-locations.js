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
// Public Overpass instances are flaky/rate-limited individually, so we try them in order
// and use whichever responds first with real data.
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter'
];
const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

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
    const finalPlaces = places.length ? places : await generatePlacesWithAI(geo.area, targetCount);
    if (!finalPlaces.length) {
      res.status(404).json({ error: 'No nearby places found for this postcode.' });
      return;
    }

    const withImages = await attachImages(finalPlaces, geo.area);

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

  const data = await queryOverpassWithFallback(query);
  const elements = Array.isArray(data?.elements) ? data.elements : [];

  const seenNames = new Set();
  const enterprises = [];
  const generic = [];

  elements.forEach((el) => {
    const tags = el.tags || {};
    const name = tags.name || tags.brand;
    if (!name || seenNames.has(name)) return;
    seenNames.add(name);

    const placeLat = el.lat || el.center?.lat;
    const placeLon = el.lon || el.center?.lon;
    // Skip anything the Overpass query somehow returned outside our "not too far" radius.
    const distanceKm = (placeLat != null && placeLon != null) ? haversineKm(lat, lon, placeLat, placeLon) : null;
    if (distanceKm != null && distanceKm > radius / 1000) return;

    const isEnterprise = Boolean(tags.brand) || (tags.shop && ['supermarket', 'department_store', 'chemist'].includes(tags.shop));
    const category = categoryFromTags(tags);
    const entry = {
      id: `osm-${el.type}-${el.id}`,
      name,
      category,
      isEnterprise,
      importance: isEnterprise ? 0.8 : 0.4,
      lat: placeLat,
      lon: placeLon,
      distance: distanceKm != null ? Number(distanceKm.toFixed(1)) : null
    };
    (isEnterprise ? enterprises : generic).push(entry);
  });

  // Closest places first, so "not too far from the entered postcode" holds even when there
  // are more matches than we need.
  const byDistance = (a, b) => (a.distance ?? 999) - (b.distance ?? 999);
  enterprises.sort(byDistance);
  generic.sort(byDistance);

  // Aim for up to 10 real enterprises, then fill the remainder with general POIs.
  const chosenEnterprises = enterprises.slice(0, 10);
  const remaining = targetCount - chosenEnterprises.length;
  const chosenGeneric = generic.slice(0, Math.max(remaining, 0));

  return [...chosenEnterprises, ...chosenGeneric].sort(byDistance).slice(0, targetCount);
}

// Tries each public Overpass mirror in turn (some reject requests intermittently or lack a
// proper User-Agent/Accept header) and returns the first successful JSON response.
async function queryOverpassWithFallback(query) {
  const headers = {
    'Content-Type': 'text/plain',
    'Accept': 'application/json',
    'User-Agent': 'PropertyTycoonApp/1.0 (+https://property-tycoon-iota.vercel.app)'
  };

  for (const url of OVERPASS_URLS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, { method: 'POST', headers, body: query, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) continue;
      const data = await response.json();
      if (Array.isArray(data.elements)) return data;
    } catch (err) {
      console.warn(`Overpass mirror failed (${url}):`, err.message);
    }
  }
  return null;
}

// Great-circle distance between two lat/lon points, in kilometres.
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
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

// Fallback when Overpass is unreachable/blocked (common from cloud/serverless IPs): ask the
// model to name plausible real UK high-street chains and local spot types for the area. This
// still needs OPENAI_API_KEY; if that's missing too, the caller returns a 404 to the client,
// which then falls back to the built-in procedural properties.
async function generatePlacesWithAI(area, targetCount) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const prompt = `List ${targetCount} real or highly plausible UK businesses/landmarks you'd expect to find in or near "${area}", UK. Include a mix: some recognisable UK high-street chains (e.g. Holland & Barrett, Greggs, Boots) if plausible for the area, local independent shops/cafes, a transport link (station or bus interchange), a workplace/office, and a landmark. Respond ONLY with a JSON object: {"places": [{"name": string, "category": one of "Retail"|"Hospitality"|"Commercial"|"Transport"|"Landmark"|"Leisure", "isEnterprise": boolean, "importance": number between 0 and 1}]}.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) return [];
    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    const parsed = raw ? JSON.parse(raw) : null;
    const places = Array.isArray(parsed?.places) ? parsed.places : [];
    return places.slice(0, targetCount).map((place, index) => ({
      id: `ai-${index}`,
      name: place.name,
      category: place.category || 'Commercial',
      isEnterprise: Boolean(place.isEnterprise),
      importance: clampNumber(Number(place.importance ?? 0.4), 0, 1),
      distance: Number((0.3 + Math.random() * 2.5).toFixed(1))
    })).filter((place) => place.name);
  } catch (err) {
    console.warn('AI place generation failed:', err.message);
    return [];
  }
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

async function attachImages(places, area) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return places.map((place) => ({ ...place, area, description: describePlace(place, area) }));
  }

  // Real AI images are slow (10-20s+ each) and a request for 50-100 properties would blow
  // way past any serverless function time limit. Generate real photos for a handful of the
  // most notable places; every place still gets a real name/category — the rest just use
  // the client's gradient placeholder instead of a photo.
  const IMAGE_CAP = 8;
  const withDescriptions = places.map((place) => ({ ...place, area, description: describePlace(place, area) }));
  const toIllustrate = withDescriptions.slice(0, IMAGE_CAP);
  const rest = withDescriptions.slice(IMAGE_CAP);

  // Generate images concurrently (small batches) so the whole request doesn't get killed by
  // the platform's function-duration limit while waiting on many sequential image calls.
  const CONCURRENCY = 4;
  const illustrated = new Array(toIllustrate.length);
  let cursor = 0;

  async function worker() {
    while (cursor < toIllustrate.length) {
      const index = cursor++;
      const place = toIllustrate[index];
      let imageUrl = null;
      try {
        imageUrl = await generateImage(apiKey, place, area);
      } catch (err) {
        console.warn(`Image generation failed for ${place.name}:`, err.message);
      }
      illustrated[index] = { ...place, imageUrl };
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, toIllustrate.length) }, worker));
  return [...illustrated, ...rest];
}

async function generateImage(apiKey, place, area) {
  const prompt = `A realistic, high-quality photo of ${place.name}, a ${place.category.toLowerCase()} in ${area}, UK. Street-level view, natural lighting, no text or logos.`;
  const controller = new AbortController();
  // Never let one slow image generation hold up (or time out) the whole request — skip it
  // and fall back to the client's gradient placeholder instead.
  const timeoutId = setTimeout(() => controller.abort(), 18000);
  try {
    // dall-e-3 is used instead of gpt-image-1 because the latter requires OpenAI org
    // verification that most API keys don't have yet, and would fail every single call.
    const response = await fetch(OPENAI_IMAGES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url',
        n: 1
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`OpenAI image API responded with ${response.status}: ${errBody.slice(0, 200)}`);
    }
    const data = await response.json();
    const b64 = data?.data?.[0]?.b64_json;
    const url = data?.data?.[0]?.url;
    return url || (b64 ? `data:image/png;base64,${b64}` : null);
  } finally {
    clearTimeout(timeoutId);
  }
}

function describePlace(place, area) {
  if (place.isEnterprise) return `${place.name} is a well-known name doing business in ${area}.`;
  return `${place.category} spot near ${area} worth a look.`;
}
