from fastapi import APIRouter, HTTPException
from app.services.transaction_service import get_transaction_details, get_transaction_receipt
# from app.schemas.transactions import TransactionRequest
transaction_router = APIRouter(prefix="/transactions",
    tags=["Transactions"])

@transaction_router.get("/{tx_hash}")
def get_transaction(tx_hash:str):
    return get_transaction_details(tx_hash)

def get_transaction_receipt_route(tx_hash:str):
    result = get_transaction_receipt(tx_hash)
    return result

