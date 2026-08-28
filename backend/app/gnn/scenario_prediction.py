from backend.app.gnn.disruption_scenario import apply_disruption
from backend.app.gnn.predict_ripple import predict_ripple_risk
from backend.app.gnn.risk_classifier import add_risk_levels


def run_scenario(node_id, severity="high"):

    print("=" * 70)
    print("SUPPLY CHAIN DISRUPTION SCENARIO")
    print("=" * 70)

    # Step 1: Apply disruption
    affected_node = apply_disruption(
        node_id,
        severity
    )

    if affected_node is None:
        print(f"Node {node_id} was not found.")
        return

    print("\nAffected node:")
    print(affected_node)

    # Step 2: Run GNN prediction
    predictions = predict_ripple_risk()

    # Step 3: Classify risk
    predictions = add_risk_levels(
        predictions
    )

    print("\nRipple risk predictions:")
    print("-" * 70)

    for prediction in predictions:

        print(
            f"{prediction['node_id']} | "
            f"{prediction['name']} | "
            f"{prediction['node_type']} | "
            f"Risk: {prediction['predicted_risk']:.4f} | "
            f"Level: {prediction['risk_level']}"
        )


if __name__ == "__main__":

    run_scenario(
        node_id="P001",
        severity="high"
    )