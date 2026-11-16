# Medlify

Find medicines at nearby pharmacies. Pharmacies manage live stock and prices, and customers see them instantly.

## Run it
1. `cd backend && npm install`, then add a `.env` with your database settings
2. `node scripts/seed-demo.js` to load the demo data
3. `npm start` (backend), then in a second terminal `cd frontend && npm install && npm run dev`

Demo logins are printed by the seed script.

## Data
Pharmacy names and locations come from OpenStreetMap. Stock, prices and licence numbers are demo data, and licence numbers are recorded but not verified against any register.
