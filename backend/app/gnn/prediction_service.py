from datetime import datetime, timezone

from backend.app.gnn.predict_ripple import predict_ripple_risk
from backend.app.gnn.risk_classifier import add_risk_levels


def get_current_predictions():
    """
    Run the existing trained GNN against the current Neo4j graph
    and return the latest classified risk predictions.
    """

    predictions = predict_ripple_risk()
    predictions = add_risk_levels(predictions)

    return {
        "status": "success",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(predictions),
        "predictions": predictions,
    }