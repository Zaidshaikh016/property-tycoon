# Real-location property generation — setup

The app can populate the Turn deck with real nearby places (shops, cafes, transport,
workplaces, landmarks) and AI-generated images, based on a postcode entered during
onboarding. This is powered by a small serverless function in `api/generate-locations.js`.

**Without deploying this**, the game still works exactly as before — it falls back to the
built-in procedural property generator automatically.

## What it needs
- A **Vercel** account (free tier is fine) to host the `/api/generate-locations` function
  alongside the static site.
- An **OpenAI API key** (only used server-side, never exposed to the browser) for image
  generation. Postcode lookup (postcodes.io) and place search (OpenStreetMap Overpass) are
  both free and need no key.

## Deploy steps
1. Install the Vercel CLI: `npm i -g vercel`
2. From this project folder, run `vercel` and follow the prompts to link/create a project.
3. In the Vercel dashboard for the project, go to **Settings → Environment Variables** and add:
   - `OPENAI_API_KEY` = your key from https://platform.openai.com/api-keys
4. Redeploy: `vercel --prod`
5. Open the deployed URL — the onboarding "Choose your location" step now powers real
   generated properties. Locally (e.g. `python -m http.server`), the postcode step still
   shows, but requests to `/api/generate-locations` will 404 and the app silently falls back
   to sample data (a toast will confirm this).

## Notes / limits
- Overpass API is a shared free service — avoid hammering it with very large property counts.
- Image generation calls OpenAI once per place, so larger property counts take longer and
  cost more — the loading screen accounts for this with a generous timeout (25s client-side).
- If you don't want to pay for image generation, leave `OPENAI_API_KEY` unset: the function
  still returns real place names/descriptions, and the client falls back to its gradient
  placeholders for images.
