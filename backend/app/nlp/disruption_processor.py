from backend.app.nlp.news_analyzer import analyze_news
from backend.app.database.graph_repository import (
    find_node_by_name,
    update_node_risk
)


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
            "affected_nodes": []
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

            affected_nodes.append(updated_node)

    return {
        "analysis": analysis,
        "selected_severity": severity,
        "affected_nodes": affected_nodes
    }


if __name__ == "__main__":
    sample_news = (
        "A major strike at Rotterdam Port "
        "has caused shipment delays in the Netherlands."
    )

    result = process_disruption_news(sample_news)

    print("News Analysis:")
    print(result)