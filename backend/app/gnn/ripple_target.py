import torch

from backend.app.gnn.graph_dataset import create_pyg_graph


def create_ripple_target(
    graph,
    node_mapping,
    disrupted_node_id
):
    """
    Create a synthetic ripple-risk target based on
    graph distance from the disrupted node.
    """

    if disrupted_node_id not in node_mapping:
        raise ValueError(
            f"Node {disrupted_node_id} not found in graph."
        )

    disrupted_index = node_mapping[disrupted_node_id]

    # Build an undirected adjacency list
    adjacency = {
        node: []
        for node in range(graph.num_nodes)
    }

    for source, target in graph.edge_index.t().tolist():

        adjacency[source].append(target)
        adjacency[target].append(source)

    # Breadth-first search
    distances = {
        disrupted_index: 0
    }

    queue = [disrupted_index]

    while queue:

        current = queue.pop(0)

        for neighbor in adjacency[current]:

            if neighbor not in distances:

                distances[neighbor] = (
                    distances[current] + 1
                )

                queue.append(neighbor)

    # Convert distance into ripple risk
    target_values = []

    for node_index in range(graph.num_nodes):

        distance = distances.get(
            node_index,
            999
        )

        if distance == 0:
            risk = 0.90

        elif distance == 1:
            risk = 0.70

        elif distance == 2:
            risk = 0.50

        elif distance == 3:
            risk = 0.30

        else:
            risk = 0.10

        target_values.append(risk)

    target = torch.tensor(
        target_values,
        dtype=torch.float
    ).view(-1, 1)

    return target


if __name__ == "__main__":

    graph, nodes, node_mapping = create_pyg_graph()

    target = create_ripple_target(
        graph,
        node_mapping,
        "P001"
    )

    print("Ripple target created successfully")
    print()

    print("Target shape:", target.shape)

    print()
    print("First 10 target values:")

    print(target[:10])