import os 
from dotenv import load_dotenv
from web3 import Web3
load_dotenv()
rpc_url = os.getenv("ETHEREUM_ENDPOINT")
web3 = Web3(Web3.HTTPProvider(rpc_url))

USDC_ADDRESS = Web3.to_checksum_address(
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
)

usdc_abi = [
    {
        "constant": True,
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    }
]
usdc_contract = web3.eth.contract(
    address=USDC_ADDRESS,
    abi=usdc_abi
)

def get_usdc_balance(address:str):
    address = Web3.to_checksum_address(address)
    balance = usdc_contract.functions.balanceOf(address).call()
    return balance/ 10**6


POL_EX_MATIC_address = Web3.to_checksum_address("0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6")
POL_EX_MATIC_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    }
]

POL_EX_MATIC_contract = web3.eth.contract(
    address=POL_EX_MATIC_address,
    abi=POL_EX_MATIC_ABI
)

def get_pol_ex_matic_balance(address:str):
    address = Web3.to_checksum_address(address)
    balance = POL_EX_MATIC_contract.functions.balanceOf(address).call()
    return balance/10**18



def check_ethereum_connection():
    if not web3.is_connected():
        return False
    else:
        return web3.eth.chain_id == 1

def get_wallet_balance(address:str):
    balance_wei = web3.eth.get_balance(address)
    balance_eth = web3.from_wei(balance_wei, "ether")
    return f"{balance_eth} ETH"


    



