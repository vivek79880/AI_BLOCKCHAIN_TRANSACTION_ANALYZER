# ChainLens Frontend

Simple React + TypeScript UI for the FastAPI Ethereum analyzer.

## Prerequisites

1. Backend running on `http://127.0.0.1:8000`
2. Node.js 18+ installed

## Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://127.0.0.1:5173**

The Vite dev server proxies `/api/*` to your FastAPI backend, so you do not need CORS changes in `app/`.

## What it uses from the backend

| UI action            | API call                          |
|----------------------|-----------------------------------|
| Connection badge     | `GET /wallet/connection`          |
| Get balance          | `POST /wallet/analyze`            |
| Look up transaction  | `GET /transactions/{tx_hash}`     |
|                      | `GET /transactions/{tx_hash}/receipt` |
