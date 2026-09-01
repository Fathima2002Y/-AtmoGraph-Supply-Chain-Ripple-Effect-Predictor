from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.gnn.scenario_prediction import run_scenario
from backend.app.gnn.disruption_scenario import reset_disruptions

from backend.app.database.graph_repository import (
    get_supply_chain_graph,
    get_node_neighbors
)

from backend.app.nlp.news_analyzer import analyze_news
from backend.app.nlp.disruption_processor import process_disruption_news


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


class NewsRequest(BaseModel):

    text: str = Field(
        ...,
        min_length=5,
        description="Supply chain news or disruption event text",
        examples=[
            "A major strike at Rotterdam Port has caused shipment delays."
        ]
    )


@router.get("/health")
def health_check():

    return {
        "status": "healthy",
        "service": "AtmoGraph API"
    }


@router.get("/graph")
def get_graph():

    try:

        graph = get_supply_chain_graph()

        return {
            "total_nodes": len(graph["nodes"]),
            "total_relationships": len(
                graph["relationships"]
            ),
            "nodes": graph["nodes"],
            "relationships": graph["relationships"]
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@router.get("/graph/{node_id}/neighbors")
def get_neighbors(node_id: str):

    try:

        neighbors = get_node_neighbors(node_id)

        if neighbors is None:

            raise HTTPException(
                status_code=404,
                detail=f"Node {node_id} was not found"
            )

        return {
            "node_id": node_id,
            "neighbor_count": len(neighbors),
            "neighbors": neighbors
        }

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@router.post("/news/analyze")
def analyze_news_api(request: NewsRequest):

    try:

        result = analyze_news(request.text)

        return result

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@router.post("/news/process")
def process_news_api(request: NewsRequest):

    try:

        result = process_disruption_news(
            request.text
        )

        return result

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@router.post("/scenario")
def predict_scenario(request: ScenarioRequest):

    severity = request.severity.lower()

    if severity not in {
        "low",
        "medium",
        "high"
    }:

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
            "message": (
                "All disruption scenarios "
                "have been reset"
            ),
            "reset_nodes": reset_count
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )