import torch
import torch.nn.functional as F

from torch_geometric.nn import GCNConv


class RippleGNN(torch.nn.Module):

    def __init__(
        self,
        input_features=8,
        hidden_features=16,
        output_features=1
    ):
        super().__init__()

        self.conv1 = GCNConv(
            input_features,
            hidden_features
        )

        self.conv2 = GCNConv(
            hidden_features,
            hidden_features
        )

        self.output_layer = torch.nn.Linear(
            hidden_features,
            output_features
        )

    def forward(self, x, edge_index):

        # First graph convolution
        x = self.conv1(
            x,
            edge_index
        )

        x = F.relu(x)

        # Second graph convolution
        x = self.conv2(
            x,
            edge_index
        )

        x = F.relu(x)

        # Final prediction
        x = self.output_layer(x)

        return x