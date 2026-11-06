from fastapi import APIRouter, HTTPException
from web3.exceptions import TransactionNotFound
from app.services.transaction_service import get_transaction_details, get_transaction_receipt, validate_transaction_hash
# from app.schemas.transactions import TransactionRequest
transaction_router = APIRouter(prefix="/transactions",
    tags=["Transactions"])

@transaction_router.get("/{tx_hash}")
def get_transaction(tx_hash:str):
    return get_transaction_details(tx_hash)

@transaction_router.get("/{tx_hash}/receipt")
def get_transaction_receipt_route(tx_hash: str):
    try:
        validate_transaction_hash(tx_hash)
        result = get_transaction_receipt(tx_hash)
        return result

    except TransactionNotFound:
        raise HTTPException(status_code=404, detail="Transaction not found")











