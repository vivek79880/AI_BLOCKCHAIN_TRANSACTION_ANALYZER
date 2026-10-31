from fastapi import APIRouter
transaction_router = APIRouter(prefix="/transactions",
    tags=["Transactions"])

@transaction_router.get("/{transaction_hash}")
def get_transaction(transaction_hash:str):
    return {"transaction_hash": transaction_hash}

