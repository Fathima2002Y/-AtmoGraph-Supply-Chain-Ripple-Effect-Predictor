from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.gnn.scenario_prediction import run_scenario
from backend.app.gnn.disruption_scenario import reset_disruptions


router = APIRouter(
    prefix="/api/v1",
    tags=["Supply Chain Scenarios"]
)


class ScenarioRequest(BaseModel):
    node_id: str = Field(
        ...,
        description="Supply chain node ID affected by the disruption",
        examples=["P001"]
    )

    severity: str = Field(
        default="high",
        description="Disruption severity: low, medium, or high",
        examples=["high"]
    )


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AtmoGraph API"
    }


@router.post("/scenario")
def predict_scenario(request: ScenarioRequest):

    severity = request.severity.lower()

    if severity not in {"low", "medium", "high"}:
        raise HTTPException(
            status_code=400,
            detail="Severity must be low, medium, or high"
        )

    try:

        result = run_scenario(
            node_id=request.node_id,
            severity=severity
        )

        if result is None:
            raise HTTPException(
                status_code=404,
                detail=f"Node {request.node_id} was not found"
            )

        predictions = result["predictions"]

        high_risk = [
            prediction
            for prediction in predictions
            if prediction["risk_level"] == "HIGH"
        ]

        medium_risk = [
            prediction
            for prediction in predictions
            if prediction["risk_level"] == "MEDIUM"
        ]

        low_risk = [
            prediction
            for prediction in predictions
            if prediction["risk_level"] == "LOW"
        ]

        return {
            "scenario": {
                "node_id": request.node_id,
                "severity": severity
            },
            "affected_node": result["affected_node"],
            "summary": {
                "total_nodes": len(predictions),
                "high_risk": len(high_risk),
                "medium_risk": len(medium_risk),
                "low_risk": len(low_risk)
            },
            "predictions": predictions
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@router.post("/reset")
def reset_scenario():

    try:

        reset_count = reset_disruptions()

        return {
            "status": "success",
            "message": "All disruption scenarios have been reset",
            "reset_nodes": reset_count
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )