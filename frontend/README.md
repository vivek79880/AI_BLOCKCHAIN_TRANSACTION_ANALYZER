# ChainLens Frontend

React + TypeScript UI for the FastAPI Ethereum analyzer.

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

Vite proxies `/api/*` to FastAPI, so no CORS changes are needed in `app/`.

## Features wired to backend

| UI mode            | API call                                      |
|--------------------|-----------------------------------------------|
| Connection badge   | `GET /wallet/connection`                      |
| Wallet balance     | `POST /wallet/analyze`                        |
|                    | `GET /wallet/usdc/{address}`                  |
|                    | `GET /wallet/pol_ex_matic/{address}`          |
| Transfer history   | `GET /transactions/wallet/{address}`          |
| Tx lookup          | `GET /transactions/{tx_hash}`                 |
|                    | `GET /transactions/{tx_hash}/receipt`         |
|                    | `GET /transactions/{tx_hash}/explanation`     |
| AI insights        | `GET /transactions/wallet/{address}/summary`  |
|                    | (+ prepared transfer Q&A in the UI)           |
| Risk analysis      | `GET /transactions/wallet/{address}/risk`     |
