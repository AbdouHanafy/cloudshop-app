# CloudShop Learn Frontend

React + Vite frontend for the CloudShop Learn platform.

## Local Development

Install dependencies and run:

```bash
npm install
npm run dev
```

## Frontend Environment Variables

The frontend can target local or production backend services through Vite environment variables.

Create a `.env` or `.env.local` file in `frontend/` and set:

```bash
VITE_CATALOG_API_URL=http://localhost:8000
VITE_LEARNING_LIST_API_URL=http://localhost:8001
VITE_ENROLLMENTS_API_URL=http://localhost:8002
VITE_AUTH_API_URL=http://localhost:8003
```

For Azure production, these values should point to the public backend service URLs.

## Build

```bash
npm run build
```
