<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Jacket-POS

Tablet-first POS for a jacket potato food booth. Built with React, Vite, Tailwind, Socket.io, Express, and Supabase.

## Project Structure

```
Jacket-POS/
├── src/
│   ├── components/       # UI components (CashierView, KitchenView, ManagerView)
│   ├── hooks/            # Custom hooks (useSocket)
│   ├── lib/              # Shared utilities, types, constants
│   ├── App.tsx           # Root app + role selection
│   ├── main.tsx
│   └── index.css
├── public/               # Static assets served by app (logo, menu images)
├── assets/               # Source/reference images
├── supabase/             # Database migrations
├── server.ts             # Express + Socket.io backend
└── index.html
```

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and add:
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (for order persistence)
3. Run the app: `npm run dev`
4. Open http://localhost:3000
