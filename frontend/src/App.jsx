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

const NODE_TYPES = [
  "All",
  "Supplier",
  "Manufacturer",
  "Port",
  "Distributor",
  "Retailer",
  "Product",
];

const RISK_TYPES = ["All", "High", "Medium", "Low"];

function getNodeColor(nodeType) {
  return NODE_COLORS[nodeType] || "#64748b";
}

function getRiskClass(riskScore) {
  if (riskScore >= 0.7) return "high";
  if (riskScore >= 0.4) return "medium";
  return "low";
}

function getRiskLevel(riskScore) {
  if (riskScore >= 0.7) return "HIGH";
  if (riskScore >= 0.4) return "MEDIUM";
  return "LOW";
}

function createFlowNodes(apiNodes, selectedNodeId) {
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
      const riskScore = Number(node.risk_score || 0);

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
                Risk: {riskScore.toFixed(2)}
              </div>

              <div className={`node-status ${getRiskClass(riskScore)}`}>
                {node.status || getRiskLevel(riskScore)}
              </div>
            </div>
          ),
        },

        style: {
          border:
            selectedNodeId === node.node_id
              ? "3px solid #111827"
              : `2px solid ${getNodeColor(node.node_type)}`,

          borderRadius: "12px",

          background:
            selectedNodeId === node.node_id ? "#f8fafc" : "#ffffff",

          width: 190,

          padding: "10px",

          boxShadow:
            selectedNodeId === node.node_id
              ? "0 0 0 3px rgba(17, 24, 39, 0.12)"
              : "none",
        },
      });
    });
  });

  return nodes;
}

function createFlowEdges(apiRelationships, visibleNodeIds) {
  return apiRelationships
    .filter(
      (relationship) =>
        visibleNodeIds.has(relationship.source_id) &&
        visibleNodeIds.has(relationship.target_id)
    )
    .map((relationship, index) => ({
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
  const [apiNodes, setApiNodes] = useState([]);
  const [apiRelationships, setApiRelationships] = useState([]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [summary, setSummary] = useState(null);
  const [topRisks, setTopRisks] = useState([]);

  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const [nodeTypeFilter, setNodeTypeFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");

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

      setApiNodes(graphData.nodes || []);
      setApiRelationships(graphData.relationships || []);

      setSummary(summaryResponse.data);
      setTopRisks(topRiskResponse.data.nodes || []);

      setSelectedNodeId(null);
    } catch (err) {
      console.error("Failed to load AtmoGraph data:", err);

      setError(
        "Unable to connect to the AtmoGraph backend. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const filteredApiNodes = useMemo(() => {
    return apiNodes.filter((node) => {
      const riskScore = Number(node.risk_score || 0);
      const riskLevel = getRiskLevel(riskScore);

      const matchesNodeType =
        nodeTypeFilter === "All" || node.node_type === nodeTypeFilter;

      const matchesRisk =
        riskFilter === "All" || riskLevel === riskFilter.toUpperCase();

      return matchesNodeType && matchesRisk;
    });
  }, [apiNodes, nodeTypeFilter, riskFilter]);

  useEffect(() => {
    const visibleNodeIds = new Set(
      filteredApiNodes.map((node) => node.node_id)
    );

    const flowNodes = createFlowNodes(
      filteredApiNodes,
      selectedNodeId
    );

    const flowEdges = createFlowEdges(
      apiRelationships,
      visibleNodeIds
    );

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [
    filteredApiNodes,
    apiRelationships,
    selectedNodeId,
    setNodes,
    setEdges,
  ]);

  const selectedNode = useMemo(() => {
    return apiNodes.find((node) => node.node_id === selectedNodeId) || null;
  }, [apiNodes, selectedNodeId]);

  const handleNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const resetFilters = () => {
    setNodeTypeFilter("All");
    setRiskFilter("All");
    setSelectedNodeId(null);
  };

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

        <section className="filter-panel">
          <div className="filter-header">
            <div>
              <p className="eyebrow">GRAPH FILTERS</p>
              <h2>Explore Network</h2>
            </div>

            <button
              className="reset-button"
              onClick={resetFilters}
            >
              Reset Filters
            </button>
          </div>

          <div className="filter-controls">
            <div className="filter-group">
              <label>Node Type</label>

              <select
                value={nodeTypeFilter}
                onChange={(event) =>
                  setNodeTypeFilter(event.target.value)
                }
              >
                {NODE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Risk Level</label>

              <select
                value={riskFilter}
                onChange={(event) =>
                  setRiskFilter(event.target.value)
                }
              >
                {RISK_TYPES.map((risk) => (
                  <option key={risk} value={risk}>
                    {risk}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-result">
              Showing{" "}
              <strong>{filteredApiNodes.length}</strong> of{" "}
              <strong>{apiNodes.length}</strong> nodes
            </div>
          </div>
        </section>

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
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
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

        <section className="details-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NODE INSPECTION</p>

              <h2>Selected Node</h2>
            </div>
          </div>

          {!selectedNode ? (
            <div className="no-selection">
              <p>Click a node in the graph to inspect its details.</p>
            </div>
          ) : (
            <div className="node-details">
              <div className="detail-main">
                <div
                  className="detail-type"
                  style={{
                    color: getNodeColor(selectedNode.node_type),
                  }}
                >
                  {selectedNode.node_type}
                </div>

                <h3>{selectedNode.name}</h3>

                <span className="detail-id">
                  Node ID: {selectedNode.node_id}
                </span>
              </div>

              <div className="detail-item">
                <span>Risk Score</span>

                <strong
                  className={getRiskClass(
                    Number(selectedNode.risk_score || 0)
                  )}
                >
                  {Number(selectedNode.risk_score || 0).toFixed(2)}
                </strong>
              </div>

              <div className="detail-item">
                <span>Risk Level</span>

                <strong
                  className={getRiskClass(
                    Number(selectedNode.risk_score || 0)
                  )}
                >
                  {getRiskLevel(
                    Number(selectedNode.risk_score || 0)
                  )}
                </strong>
              </div>

              <div className="detail-item">
                <span>Status</span>

                <strong>{selectedNode.status || "NORMAL"}</strong>
              </div>
            </div>
          )}
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
                <p className="empty-text">
                  No risk data available.
                </p>
              ) : (
                topRisks.map((node) => (
                  <div
                    className="risk-row"
                    key={node.node_id}
                    onClick={() => setSelectedNodeId(node.node_id)}
                  >
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