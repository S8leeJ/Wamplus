# WAMP+

A web app for comparing West Campus apartments near UT Austin. Built by UT students for UT students.

## Features

- **Apartments** – Browse apartment buildings with search, view details (address, website, ratings, reviews), expand to see units, and add units to compare
- **Compare** – Side-by-side comparison of selected units with filters (price, bedrooms, bathrooms, floor area, floor, windows, amenities)
- **Wampus Map** – 3D interactive map of West Campus with building data from OpenStreetMap; click buildings for info, or use "View on map" from an apartment card
- **Authentication** – Sign up / sign in via Supabase Auth

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth)
- **Map:** MapLibre GL, Overpass API (OpenStreetMap)

## Project Structure

```
TPEO-New-Fellow-Project/
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── login/                # Sign in
│   │   ├── signup/               # Sign up
│   │   ├── apartments/           # Redirects to dashboard/apartments
│   │   └── dashboard/
│   │       ├── apartments/       # Browse apartments + search
│   │       ├── compare/          # Compare units
│   │       ├── map/              # 3D West Campus map
│   │       ├── add-unit/         # Add unit form (UI)
│   │       └── notifications/    # Notifications
│   ├── components/               # MapComponent, etc.
│   └── lib/                      # map-data (TARGET_BUILDINGS, coords)
├── supabase/
│   └── migrations/               # DB schema
└── README.md
```

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

## Setup

### Clone and install

```bash
cd TPEO-New-Fellow-Project/frontend
npm install
```

### Run the app

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command       | Description          |
|---------------|----------------------|
| `npm run dev` | Start dev server     |
| `npm run build` | Production build   |
| `npm run start` | Start production server |
| `npm run lint`  | Run ESLint         |

## Data Model

- **apartments** – Buildings (name, address, website, image_url, rating, reviews)
- **units** – Individual units (bedrooms, bathrooms, sq_ft, floor, windows, etc.)
- **prices** – Unit prices (monthly_rent)
- **favorites** – User’s compare list (user_id, apartment_id, unit_id)
