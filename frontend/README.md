# Lola Frontend

A small Vite + React + Tailwind frontend for the Lola SEO audit engine.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown by Vite.

## Configuration

The frontend uses `VITE_API_URL` to connect to the Lola backend.

```env
VITE_API_URL=http://127.0.0.1:8000
```

If the variable is missing, it defaults to `http://127.0.0.1:8000`.
