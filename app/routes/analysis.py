from fastapi import APIRouter
analysis_router = APIRouter(prefix = "/analysis",tags = ["Analysis"])

@analysis_router.get("/")
def ai_analysis_router():
    return {"OK"}

@analysis_router.get("/id")
def ai_analysis_router2():
    return {"id": 1}


