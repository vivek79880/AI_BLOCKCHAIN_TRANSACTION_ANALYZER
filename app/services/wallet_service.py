import os 
from dotenv import load_dotenv
from web3 import Web3
load_dotenv()
rpc_url = os.getenv("ETHEREUM_ENDPOINT")
web3 = Web3(Web3.HTTPProvider(rpc_url))
def get_wallet_balance(address:str):
    balance_wei = web3.eth.get_balance(address)
    balance_eth = web3.from_wei(balance_wei, "ether")
    return f"{balance_eth} ETH"



