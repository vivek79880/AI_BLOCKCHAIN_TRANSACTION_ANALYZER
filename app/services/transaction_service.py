# from app.services.wallet_service import web3 (do not import create your own)
from web3 import Web3
import os 
from dotenv import load_dotenv
from datetime import datetime, timezone
load_dotenv()
rpc_url = os.getenv("ETHEREUM_ENDPOINT")
web3 = Web3(Web3.HTTPProvider(rpc_url))

def get_wallet_transaction(wallet_address:str):
    latest_block = web3.eth.block_number
    start_block = max(latest_block - 10000, 0)

    params = {
    "fromAddress": wallet_address,
    "category": ["external", "internal", "erc20"],
    "fromBlock": hex(start_block),
    "toBlock": "latest"
    }
    response = web3.provider.make_request("alchemy_getAssetTransfers",[params])



def validate_transaction_hash(tx_hash: str):
    if (
        not isinstance(tx_hash, str)
        or not tx_hash.startswith("0x")
        or len(tx_hash) != 66
        or any(c not in "0123456789abcdefABCDEF" for c in tx_hash[2:])
    ):
        raise ValueError("Invalid transaction hash format")

def get_transaction_details(tx_hash):
    transaction = web3.eth.get_transaction(tx_hash)


    return {
        # "transaction_hash": transaction["hash"].hex(),
        "transaction_hash": transaction["hash"].hex(),
        "from": transaction["from"],
        "to":transaction["to"],
        "value":str(web3.from_wei(transaction["value"],"ether")),
        "block_number": transaction["blockNumber"],
        "nonce": transaction["nonce"]

    }

def get_transaction_receipt(tx_hash:str):
    receipt = web3.eth.get_transaction_receipt(tx_hash)
    fee_in_wei = receipt["gasUsed"] * receipt["effectiveGasPrice"]
    block = web3.eth.get_block(receipt["blockNumber"])
    latest_block = web3.eth.block_number
    confirmations = latest_block - receipt["blockNumber"] + 1
    block_timestamps = datetime.fromtimestamp(
    block["timestamp"], tz=timezone.utc).isoformat()
    
    return{
        
        "transaction_hash": web3.to_hex(receipt["transactionHash"]),
        "status": receipt["status"],
        "block_number": receipt["blockNumber"],
        "gas_used": receipt["gasUsed"],
        "gas_fee_eth": str(web3.from_wei(fee_in_wei, "ether")),
        "block_timestamps":block_timestamps,
        "confirmations":confirmations

    }





    



