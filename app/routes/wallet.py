from fastapi import APIRouter
from app.schemas.wallet import WalletRequest, WalletResponse

from app.services.wallet_service import get_wallet_balance, check_ethereum_connection

wallet_router = APIRouter(prefix = "/wallet", tags = ["wallet"])

@wallet_router.get("/connection")
def check_connection():
    connected = check_ethereum_connection()
    return {
        "connected":connected,
        "network":"Ethereum Mainnet"
    }
    
@wallet_router.post("/analyze", response_model = WalletResponse)
def analyze_wallet(request: WalletRequest):
    balance = get_wallet_balance(request.wallet_address)
    return {
        "wallet_address": request.wallet_address,
        "balance": balance,
        "network": "Ethereum"
    }


