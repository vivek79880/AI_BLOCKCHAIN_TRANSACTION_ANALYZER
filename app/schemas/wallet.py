from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Optional

class WalletRequest(BaseModel):
    wallet_address: str = Field(min_length = 42, max_length = 42)

class WalletResponse(BaseModel):
    wallet_address: str
    balance: Optional[str] =None
    network : str

