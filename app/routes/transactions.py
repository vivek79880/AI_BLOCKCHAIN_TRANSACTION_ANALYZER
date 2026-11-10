from fastapi import APIRouter, HTTPException
from web3 import Web3
from web3.exceptions import TransactionNotFound
from app.services.transaction_service import get_transaction_details, get_transaction_receipt, validate_transaction_hash, get_wallet_transaction
from app.services.llm_service import explain_transaction,summarize_wallet_activity

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

@transaction_router.get("/wallet/{wallet_address}")
def wallet_transactions(wallet_address:str):
    transfers = get_wallet_transaction(wallet_address)
    return{
        "wallet_address":wallet_address,
        "transfers":transfers
    }

@transaction_router.get("/{tx_hash}/explanation")
def explain_transaction_route(tx_hash: str):
    try:
        validate_transaction_hash(tx_hash)

        transaction_data = get_transaction_details(tx_hash)
        receipt = get_transaction_receipt(tx_hash)
        print(receipt)

        transaction_data["gas_fee"] = f'{receipt["gas_fee_eth"]} ETH'

        explanation = explain_transaction(transaction_data)

        return {
            "transaction_hash": tx_hash,
            "explanation": explanation
        }

    except TransactionNotFound:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )
    
@transaction_router.get("/wallet/{wallet_address}/summary")
def wallet_activity_summary(wallet_address: str):
    transfers = get_wallet_transaction(wallet_address)

    summary = summarize_wallet_activity(transfers)

    return {
        "wallet_address": wallet_address,
        "summary": summary
    }










