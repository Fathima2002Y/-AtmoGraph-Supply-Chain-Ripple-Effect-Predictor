from backend.app.nlp.news_analyzer import analyze_news

from backend.app.database.graph_repository import (
    find_node_by_name,
    update_node_risk
)

from backend.app.gnn.predict_ripple import predict_ripple_risk
from backend.app.gnn.risk_classifier import add_risk_levels


SEVERITY_RANK = {
    "low": 1,
    "medium": 2,
    "high": 3
}


def process_disruption_news(text):

    # Step 1: Analyze the news text
    analysis = analyze_news(text)

    disruptions = analysis["disruptions"]

    # Step 2: Stop if no disruption is detected
    if not disruptions:

        return {
            "message": "No disruption detected.",
            "analysis": analysis,
            "affected_nodes": [],
            "predictions": []
        }

    # Step 3: Find the highest severity event
    most_severe_event = max(
        disruptions,
        key=lambda item: SEVERITY_RANK[item["severity"]]
    )

    severity = most_severe_event["severity"]

    affected_nodes = []

    # Step 4: Check extracted entities against Neo4j
    for entity in analysis["entities"]:

        entity_name = entity["text"]

        node = find_node_by_name(entity_name)

        # Step 5: Update matching supply-chain node
        if node is not None:

            updated_node = update_node_risk(
                entity_name,
                severity
            )

            affected_nodes.append(
                updated_node
            )

    # Step 6: Run GNN after updating the graph
    predictions = predict_ripple_risk()

    # Step 7: Convert predicted risk into risk levels
    predictions = add_risk_levels(
        predictions
    )

    # Step 8: Return complete result
    return {
        "analysis": analysis,
        "selected_severity": severity,
        "affected_nodes": affected_nodes,
        "predictions": predictions
    }


if __name__ == "__main__":

    sample_news = (
        "A major strike at Rotterdam Port "
        "has caused shipment delays in the Netherlands."
    )

    result = process_disruption_news(
        sample_news
    )

    print("News Analysis:")
    print(result["analysis"])

    print("\nSelected Severity:")
    print(result["selected_severity"])

    print("\nAffected Nodes:")

    for node in result["affected_nodes"]:
        print(node)

    print("\nRipple Risk Predictions:")

    for prediction in result["predictions"]:

        print(
            f"{prediction['node_id']} | "
            f"{prediction['name']} | "
            f"Risk: {prediction['predicted_risk']:.4f} | "
            f"Level: {prediction['risk_level']}"
        )