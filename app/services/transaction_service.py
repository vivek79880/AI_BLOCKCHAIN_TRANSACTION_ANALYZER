# from app.services.wallet_service import web3 (do not import create your own)
from web3 import Web3
import os 
from dotenv import load_dotenv
load_dotenv()
rpc_url = os.getenv("ETHEREUM_ENDPOINT")
web3 = Web3(Web3.HTTPProvider(rpc_url))

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
    
    return{
        
        "transaction_hash": web3.to_hex(receipt["transactionHash"]),
        "status": receipt["status"],
        "block_number": receipt["blockNumber"],
        "gas_used": receipt["gasUsed"],
        "gas_fee_eth": str(web3.from_wei(fee_in_wei, "ether")),


    }



    



