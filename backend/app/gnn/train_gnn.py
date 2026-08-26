import torch
import torch.nn.functional as F

from backend.app.gnn.graph_dataset import create_pyg_graph
from backend.app.gnn.ripple_target import create_ripple_target
from backend.app.gnn.ripple_gnn import RippleGNN


# --------------------------------------------------
# 1. Load graph
# --------------------------------------------------

graph, nodes, node_mapping = create_pyg_graph()


# --------------------------------------------------
# 2. Create training target
# --------------------------------------------------

target = create_ripple_target(
    graph,
    node_mapping,
    "P001"
)


# --------------------------------------------------
# 3. Create model
# --------------------------------------------------

model = RippleGNN(
    input_features=8,
    hidden_features=16,
    output_features=1
)


# --------------------------------------------------
# 4. Optimizer
# --------------------------------------------------

optimizer = torch.optim.Adam(
    model.parameters(),
    lr=0.01
)


# --------------------------------------------------
# 5. Training
# --------------------------------------------------

epochs = 300


for epoch in range(epochs):

    model.train()

    optimizer.zero_grad()

    predictions = model(
        graph.x,
        graph.edge_index
    )

    loss = F.mse_loss(
        predictions,
        target
    )

    loss.backward()

    optimizer.step()

    if (epoch + 1) % 50 == 0:

        print(
            f"Epoch [{epoch + 1}/{epochs}] "
            f"Loss: {loss.item():.6f}"
        )


# --------------------------------------------------
# 6. Final predictions
# --------------------------------------------------

model.eval()

with torch.no_grad():

    predictions = model(
        graph.x,
        graph.edge_index
    )


print()
print("Training completed")
print()

print("Final predictions:")
print(predictions[:10])

print()
print("Actual targets:")
print(target[:10])
# --------------------------------------------------
# 7. Save trained model
# --------------------------------------------------

model_path = "backend/app/gnn/ripple_gnn.pth"

torch.save(
    model.state_dict(),
    model_path
)

print()
print(f"Model saved to: {model_path}")