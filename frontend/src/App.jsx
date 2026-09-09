import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

const NODE_COLORS = {
  Supplier: "#2563eb",
  Manufacturer: "#7c3aed",
  Port: "#ea580c",
  Distributor: "#0891b2",
  Retailer: "#16a34a",
  Product: "#ca8a04",
};

function getNodeColor(nodeType) {
  return NODE_COLORS[nodeType] || "#64748b";
}

function getRiskClass(riskScore) {
  if (riskScore >= 0.7) return "high";
  if (riskScore >= 0.4) return "medium";
  return "low";
}

function createFlowNodes(apiNodes) {
  const groupedNodes = {
    Supplier: [],
    Manufacturer: [],
    Port: [],
    Distributor: [],
    Retailer: [],
    Product: [],
  };

  apiNodes.forEach((node) => {
    if (groupedNodes[node.node_type]) {
      groupedNodes[node.node_type].push(node);
    }
  });

  const positions = {
    Supplier: { x: 50, y: 100 },
    Manufacturer: { x: 300, y: 100 },
    Port: { x: 550, y: 100 },
    Distributor: { x: 800, y: 100 },
    Retailer: { x: 1050, y: 100 },
    Product: { x: 550, y: 400 },
  };

  const nodes = [];

  Object.entries(groupedNodes).forEach(([type, typeNodes]) => {
    typeNodes.forEach((node, index) => {
      const basePosition = positions[type];

      nodes.push({
        id: node.node_id,
        position: {
          x: basePosition.x,
          y: basePosition.y + index * 95,
        },
        data: {
          node_type: node.node_type,
          label: (
            <div className="graph-node">
              <div
                className="node-type"
                style={{ color: getNodeColor(node.node_type) }}
              >
                {node.node_type}
              </div>

              <div className="node-name">{node.name}</div>

              <div className="node-risk">
                Risk: {Number(node.risk_score).toFixed(2)}
              </div>

              <div
                className={`node-status ${getRiskClass(
                  Number(node.risk_score)
                )}`}
              >
                {node.status}
              </div>
            </div>
          ),
        },
        style: {
          border: `2px solid ${getNodeColor(node.node_type)}`,
          borderRadius: "12px",
          background: "#ffffff",
          width: 190,
          padding: "10px",
        },
      });
    });
  });

  return nodes;
}

function createFlowEdges(apiRelationships) {
  return apiRelationships.map((relationship, index) => ({
    id: `edge-${relationship.source_id}-${relationship.target_id}-${index}`,
    source: relationship.source_id,
    target: relationship.target_id,
    label: relationship.relationship_type,
    type: "smoothstep",
    animated: false,
    style: {
      strokeWidth: 1.5,
    },
    labelStyle: {
      fontSize: 9,
      fontWeight: 600,
    },
  }));
}

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [summary, setSummary] = useState(null);
  const [topRisks, setTopRisks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadGraph = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [graphResponse, summaryResponse, topRiskResponse] =
        await Promise.all([
          axios.get(`${API_BASE_URL}/graph`),
          axios.get(`${API_BASE_URL}/risk/summary`),
          axios.get(`${API_BASE_URL}/risk/top?limit=5`),
        ]);

      const graphData = graphResponse.data;

      setNodes(createFlowNodes(graphData.nodes || []));
      setEdges(createFlowEdges(graphData.relationships || []));

      setSummary(summaryResponse.data);
      setTopRisks(topRiskResponse.data.nodes || []);
    } catch (err) {
      console.error("Failed to load AtmoGraph data:", err);

      setError(
        "Unable to connect to the AtmoGraph backend. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const miniMapNodeColor = useCallback(
    (node) => getNodeColor(node.data?.node_type || "Supplier"),
    []
  );

  const riskSummary = useMemo(() => {
    if (!summary) {
      return {
        total: 0,
        high: 0,
        medium: 0,
        low: 0,
      };
    }

    return {
      total: summary.total_nodes ?? 0,
      high: summary.high_risk ?? 0,
      medium: summary.medium_risk ?? 0,
      low: summary.low_risk ?? 0,
    };
  }, [summary]);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="brand">AtmoGraph</div>
          <div className="subtitle">
            Supply Chain Ripple Effect Predictor
          </div>
        </div>

        <div className="system-status">
          <span className="status-dot"></span>
          System Online
        </div>
      </header>

      <main className="dashboard">
        <section className="hero">
          <div>
            <p className="eyebrow">GLOBAL RISK MONITORING</p>
            <h1>Supply Chain Network</h1>
            <p className="hero-text">
              Interactive view of suppliers, manufacturers, ports,
              distributors, retailers and products.
            </p>
          </div>

          <button className="refresh-button" onClick={loadGraph}>
            Refresh Data
          </button>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <span>Total Nodes</span>
            <strong>{riskSummary.total}</strong>
          </div>

          <div className="stat-card high-card">
            <span>High Risk</span>
            <strong>{riskSummary.high}</strong>
          </div>

          <div className="stat-card medium-card">
            <span>Medium Risk</span>
            <strong>{riskSummary.medium}</strong>
          </div>

          <div className="stat-card low-card">
            <span>Low Risk</span>
            <strong>{riskSummary.low}</strong>
          </div>
        </section>

        {error && <div className="error-banner">{error}</div>}

        <section className="graph-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NETWORK VISUALIZATION</p>
              <h2>Supply Chain Graph</h2>
            </div>

            <div className="graph-count">
              {nodes.length} nodes · {edges.length} relationships
            </div>
          </div>

          <div className="graph-container">
            {loading ? (
              <div className="loading">
                <div className="loader"></div>
                <p>Loading supply chain graph...</p>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                fitViewOptions={{
                  padding: 0.2,
                }}
                minZoom={0.2}
                maxZoom={1.5}
              >
                <Background />
                <Controls />
                <MiniMap nodeColor={miniMapNodeColor} />
              </ReactFlow>
            )}
          </div>
        </section>

        <section className="bottom-grid">
          <div className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">NODE TYPES</p>
                <h2>Network Legend</h2>
              </div>
            </div>

            <div className="legend-grid">
              {Object.entries(NODE_COLORS).map(([type, color]) => (
                <div className="legend-item" key={type}>
                  <span
                    className="legend-dot"
                    style={{ background: color }}
                  ></span>
                  <span>{type}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">RISK MONITORING</p>
                <h2>Top Risk Nodes</h2>
              </div>
            </div>

            <div className="risk-list">
              {topRisks.length === 0 ? (
                <p className="empty-text">No risk data available.</p>
              ) : (
                topRisks.map((node) => (
                  <div className="risk-row" key={node.node_id}>
                    <div>
                      <strong>{node.name}</strong>
                      <span>
                        {node.node_type} · {node.risk_level}
                      </span>
                    </div>

                    <div
                      className={`risk-value ${getRiskClass(
                        Number(node.predicted_risk)
                      )}`}
                    >
                      {Number(node.predicted_risk).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;