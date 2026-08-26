import torch

from backend.app.gnn.graph_dataset import create_pyg_graph
from backend.app.gnn.ripple_gnn import RippleGNN


graph, nodes, node_mapping = create_pyg_graph()


model = RippleGNN(
    input_features=8,
    hidden_features=16,
    output_features=1
)


output = model(
    graph.x,
    graph.edge_index
)


print("GNN test successful")
print()
print("Input shape:", graph.x.shape)
print("Output shape:", output.shape)

print()
print("First 5 predictions:")
print(output[:5])