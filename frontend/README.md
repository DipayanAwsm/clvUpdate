# CLV Frontend (Simplified)

React + Vite analytics UI for the CLV platform.

## Pages
- EDA Overview
- Model Insights
- CLTV Outcome Summary
- Channel Insights
- Segmentation
- Prediction Studio

## Run

```bash
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## API

Set backend URL in `.env`:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

The app uses live backend APIs first and falls back to mock data if backend is unavailable.

## Build

```bash
npm run build
npm run preview
```

## Structure

```text
src/
  api/                # API client
  components/         # reusable cards/charts/layout/forms
  data/               # mock fallback data
  hooks/              # dashboard/prediction hooks
  pages/              # main UI pages
  utils/              # formatting/helpers
  App.tsx
  main.tsx
```

## Docker

Frontend Docker image accepts:
- `VITE_API_BASE_URL` build arg

Example:

```bash
docker build --build-arg VITE_API_BASE_URL=http://localhost:8000 -t clv-frontend .
```
