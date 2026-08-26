from backend.app.database.neo4j_connection import driver
from torch_geometric.data import Data
import torch


NODE_TYPES = [
    "Supplier",
    "Manufacturer",
    "Port",
    "Distributor",
    "Retailer",
    "Product"
]

NODE_TYPE_MAPPING = {
    node_type: index
    for index, node_type in enumerate(NODE_TYPES)
}


STATUS_MAPPING = {
    "normal": 0,
    "disrupted": 1
}


def load_graph_from_neo4j():

    node_query = """
    MATCH (n)
    RETURN
        n.node_id AS node_id,
        n.name AS name,
        labels(n)[0] AS node_type,
        n.risk_score AS risk_score,
        n.status AS status
    ORDER BY n.node_id
    """

    relationship_query = """
    MATCH (source)-[r]->(target)
    RETURN
        source.node_id AS source_id,
        target.node_id AS target_id
    """

    with driver.session() as session:

        node_records = list(
            session.run(node_query)
        )

        relationship_records = list(
            session.run(relationship_query)
        )

    return node_records, relationship_records


def create_pyg_graph():

    node_records, relationship_records = load_graph_from_neo4j()

    # Map Neo4j node IDs to integer indices
    node_to_index = {}

    for index, node in enumerate(node_records):
        node_to_index[node["node_id"]] = index

    # Create node features
    node_features = []

    for node in node_records:

        node_type = node["node_type"]

        # One-hot encode node type
        type_features = [0.0] * len(NODE_TYPES)

        if node_type in NODE_TYPE_MAPPING:
            type_index = NODE_TYPE_MAPPING[node_type]
            type_features[type_index] = 1.0

        # Risk score
        risk_score = node["risk_score"] or 0.0

        # Status
        status = STATUS_MAPPING.get(
            node["status"],
            0
        )

        features = (
            type_features
            + [
                float(risk_score),
                float(status)
            ]
        )

        node_features.append(features)

    x = torch.tensor(
        node_features,
        dtype=torch.float
    )

    # Create edges
    edges = []

    for relationship in relationship_records:

        source = relationship["source_id"]
        target = relationship["target_id"]

        if source in node_to_index and target in node_to_index:

            edges.append([
                node_to_index[source],
                node_to_index[target]
            ])

    edge_index = torch.tensor(
        edges,
        dtype=torch.long
    ).t().contiguous()

    graph = Data(
        x=x,
        edge_index=edge_index
    )

    return graph, node_records, node_to_index


if __name__ == "__main__":

    graph, nodes, node_mapping = create_pyg_graph()

    print("Graph created successfully")
    print()

    print("Number of nodes:", graph.num_nodes)
    print("Number of edges:", graph.num_edges)

    print(
        "Node feature shape:",
        graph.x.shape
    )

    print(
        "Edge index shape:",
        graph.edge_index.shape
    )

    print()
    print("First 5 node features:")
    print(graph.x[:5])

    print()
    print("First 10 edges:")
    print(graph.edge_index[:, :10])