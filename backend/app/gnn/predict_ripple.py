import torch

from backend.app.gnn.risk_classifier import add_risk_levels
from backend.app.gnn.graph_dataset import create_pyg_graph
from backend.app.gnn.ripple_gnn import RippleGNN


MODEL_PATH = "backend/app/gnn/ripple_gnn.pth"


def load_trained_model():

    model = RippleGNN(
        input_features=8,
        hidden_features=16,
        output_features=1
    )

    model.load_state_dict(
        torch.load(
            MODEL_PATH,
            map_location="cpu"
        )
    )

    model.eval()

    return model


def predict_ripple_risk():

    # Load current graph from Neo4j
    graph, nodes, node_mapping = create_pyg_graph()

    # Load trained GNN
    model = load_trained_model()

    # Make predictions
    with torch.no_grad():

        predictions = model(
            graph.x,
            graph.edge_index
        )

    results = []

    for index, node in enumerate(nodes):

        risk = predictions[index].item()

        results.append({
            "node_id": node["node_id"],
            "name": node["name"],
            "node_type": node["node_type"],
            "predicted_risk": round(risk, 4)
        })

    return results


if __name__ == "__main__":

    results = predict_ripple_risk()

    results = add_risk_levels(results)

    print("Ripple risk predictions")
    print("=" * 70)

    for result in results:

        print(
            f"{result['node_id']} | "
            f"{result['name']} | "
            f"{result['node_type']} | "
            f"Risk: {result['predicted_risk']:.4f} | "
            f"Level: {result['risk_level']}"
        )