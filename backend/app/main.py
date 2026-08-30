from fastapi import FastAPI

from backend.app.api.routes import router


app = FastAPI(
    title="AtmoGraph API",
    description="Supply Chain Ripple Effect Predictor",
    version="1.0.0"
)


app.include_router(router)


@app.get("/")
def root():
    return {
        "message": "Welcome to AtmoGraph API",
        "status": "running"
    }