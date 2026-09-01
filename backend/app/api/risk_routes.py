from fastapi import APIRouter, HTTPException

from backend.app.gnn.predict_ripple import predict_ripple_risk
from backend.app.gnn.risk_classifier import add_risk_levels


router = APIRouter(
    prefix="/api/v1/risk",
    tags=["Risk Analytics"]
)


def get_predictions():

    predictions = predict_ripple_risk()

    return add_risk_levels(predictions)


@router.get("/summary")
def risk_summary():

    try:

        predictions = get_predictions()

        high_risk = [
            p for p in predictions
            if p["risk_level"] == "HIGH"
        ]

        medium_risk = [
            p for p in predictions
            if p["risk_level"] == "MEDIUM"
        ]

        low_risk = [
            p for p in predictions
            if p["risk_level"] == "LOW"
        ]

        average_risk = sum(
            p["predicted_risk"]
            for p in predictions
        ) / len(predictions)

        return {
            "total_nodes": len(predictions),
            "high_risk": len(high_risk),
            "medium_risk": len(medium_risk),
            "low_risk": len(low_risk),
            "average_risk": round(
                average_risk,
                4
            )
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@router.get("/top")
def top_risk_nodes(limit: int = 5):

    if limit < 1 or limit > 33:

        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 33"
        )

    try:

        predictions = get_predictions()

        predictions.sort(
            key=lambda x: x["predicted_risk"],
            reverse=True
        )

        return {
            "count": min(
                limit,
                len(predictions)
            ),
            "nodes": predictions[:limit]
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@router.get("/high")
def high_risk_nodes():

    try:

        predictions = get_predictions()

        high_risk = [
            p for p in predictions
            if p["risk_level"] == "HIGH"
        ]

        high_risk.sort(
            key=lambda x: x["predicted_risk"],
            reverse=True
        )

        return {
            "count": len(high_risk),
            "nodes": high_risk
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


@router.get("/node/{node_id}")
def node_risk(node_id: str):

    try:

        predictions = get_predictions()

        for prediction in predictions:

            if prediction["node_id"] == node_id:

                return prediction

        raise HTTPException(
            status_code=404,
            detail=f"Node {node_id} was not found"
        )

    except HTTPException:
        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )