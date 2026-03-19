# simplydigitals-aiconnoisseur-ui

React frontend for the **AI Connoisseur** ML Analytics Platform by Simply Digital Solutions.

---

## Features

| Section | Description |
|---|---|
| **Data Upload** | Drag & drop CSV upload with client-side preview and column inspection |
| **Data Explorer** | Column stats, data types, null analysis, correlation matrix |
| **Visualisations** | Histogram, box plot, scatter, CDF, pair grid |
| **Preprocessing** | Imputation, scaling, feature selection (4-step wizard) |
| **A/B Testing** | Multi-model comparison with radar, bar charts, and winner summary |

---

## Tech Stack

| Tool | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Build tool & dev server |
| Tailwind CSS | Utility-first styling |
| Zustand | Global state management |
| Recharts | Data visualisation |
| PapaParse | Client-side CSV parsing |
| react-dropzone | File drag & drop |
| react-hot-toast | Notifications |
| Axios | API client |
| React Router v6 | Client-side routing |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (proxies /api → http://localhost:8000)
npm run dev
```

Open `http://localhost:3000`

---

## Environment

The Vite dev server proxies all `/api/*` requests to `http://localhost:8000` (the simplydigitals-aiconnoisseur-api backend).

For production builds, set the API base URL via environment variable:

```bash
# .env.local
VITE_API_BASE_URL=https://your-api-url.com
```

---

## Build

```bash
npm run build       # outputs to dist/
npm run preview     # preview the production build
```

---

## Project Structure

```
src/
├── components/
│   ├── layout/         # Layout, LoginPage, Dashboard
│   ├── upload/         # CSV upload with dropzone
│   ├── explorer/       # Data Explorer (stats, types, nulls, correlation)
│   ├── plots/          # Visualisations (histogram, boxplot, scatter, CDF, pairplot)
│   ├── preprocessing/  # Imputation, scaling, feature selection wizard
│   └── abtesting/      # A/B model comparison and results
├── store/              # Zustand global store + column stats computation
├── utils/              # Axios API client
└── styles/             # Tailwind globals
```
