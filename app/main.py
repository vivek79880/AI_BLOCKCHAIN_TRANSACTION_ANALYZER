from fastapi import FastAPI
from app.routes.wallet import wallet_router
from app.routes.transactions import  transaction_router
# from app.routes.analysis import analysis_router

app = FastAPI()

app.include_router(wallet_router) # we connected the wallet routes to main.py file 
app.include_router(transaction_router) # we connected the wallet routes to main.py files directly 
# app.include_router(analysis_router)




