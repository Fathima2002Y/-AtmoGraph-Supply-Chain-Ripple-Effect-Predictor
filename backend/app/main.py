from fastapi import FastAPI

from backend.app.api.routes import router
from backend.app.api.risk_routes import router as risk_router


app = FastAPI(
    description="Supply Chain Ripple Effect Predictor",
    version="1.0.0"
)


app.include_router(router)
app.include_router(risk_router)


@app.get("/")
def root():

    return {
        "message": "Welcome to AtmoGraph API",
        "status": "running"
    }