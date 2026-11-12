from fastapi import APIRouter, HTTPException
from web3 import Web3
from web3.exceptions import TransactionNotFound
from app.services.transaction_service import get_transaction_details, get_transaction_receipt, validate_transaction_hash, get_wallet_transaction
from app.services.llm_service import explain_transaction,summarize_wallet_activity,explain_wallet_risk
from app.services.risk_service import  calculate_risk_score
from app.schemas.transactions import WalletQuestionRequest
from app.services.llm_service import (
    detect_wallet_question_intent,
    answer_wallet_question
)
from app.services.wallet_qa_service import execute_wallet_intent

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

@transaction_router.get("/wallet/{wallet_address}/risk")
def wallet_risk_analysis(wallet_address: str):

    transfers = get_wallet_transaction(wallet_address)

    risk_result = calculate_risk_score(
        transfers,
        wallet_address
    )
    try:
        explanation = explain_wallet_risk(risk_result)
        return {
                "risk_analysis": risk_result,
                "ai_explanation": explanation
            }

            

            
    except Exception:
            return {
                "Oops! ai summarizer is not working at the moment, here is your summary of the risk analysis": risk_result,
                "ai explanation":"AI summarizer is unavailable right now"
            }

@transaction_router.post("/wallet/{wallet_address}/ask")
def wallet_activity_qa(wallet_address: str,request: WalletQuestionRequest):
    intent_data = detect_wallet_question_intent(request.question)
    transfers = get_wallet_transaction(wallet_address)
    result = execute_wallet_intent(
    intent_data,
    transfers,
    wallet_address)
    answer = answer_wallet_question(
    request.question,
    result)
    return {
        "wallet_address": wallet_address,
        "question": request.question,
        "transfers": transfers
    }








