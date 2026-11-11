from fastapi import FastAPI
from app.routes.wallet import wallet_router
from app.routes.transactions import  transaction_router
from fastapi.middleware.cors import CORSMiddleware
# from app.routes.analysis import analysis_router

app = FastAPI()
origins = [
    "https://ai-blockchain-transaction-analyzer.vercel.app"
    "http://localhost:3000",
    "http://localhost:5173", # Common for Vite/React local development
    # NOTE: Once Vercel gives you a frontend URL, add it here!
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Temporarily allow all for easy initial deployment testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(wallet_router) # we connected the wallet routes to main.py file 
app.include_router(transaction_router) # we connected the wallet routes to main.py files directly 
# app.include_router(analysis_router)




