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

  // --------------------------------------------------
  // DAY 15 - NEWS ANALYSIS STATE
  // --------------------------------------------------

  const [newsText, setNewsText] = useState(
    "A major strike at Rotterdam Port has caused shipment delays."
  );

  const [newsAnalysis, setNewsAnalysis] = useState(null);

  const [processResult, setProcessResult] = useState(null);

  const [newsLoading, setNewsLoading] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);

  const [newsError, setNewsError] = useState("");

  // --------------------------------------------------
  // LOAD GRAPH
  // --------------------------------------------------

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

  // --------------------------------------------------
  // FILTERS
  // --------------------------------------------------

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
    return (
      apiNodes.find((node) => node.node_id === selectedNodeId) ||
      null
    );
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

  // --------------------------------------------------
  // DAY 15 - ANALYZE NEWS
  // --------------------------------------------------

  const analyzeNews = async () => {
    if (!newsText.trim()) {
      setNewsError("Please enter a news statement.");
      return;
    }

    try {
      setNewsLoading(true);
      setNewsError("");
      setNewsAnalysis(null);
      setProcessResult(null);

      const response = await axios.post(
        `${API_BASE_URL}/news/analyze`,
        {
          text: newsText,
        }
      );

      setNewsAnalysis(response.data);
    } catch (err) {
      console.error("News analysis failed:", err);

      setNewsError(
        err.response?.data?.detail ||
          "Unable to analyze the news. Please check the FastAPI server."
      );
    } finally {
      setNewsLoading(false);
    }
  };

  // --------------------------------------------------
  // DAY 15 - PROCESS NEWS
  // --------------------------------------------------

  const processNews = async () => {
    if (!newsText.trim()) {
      setNewsError("Please enter a news statement.");
      return;
    }

    try {
      setProcessLoading(true);
      setNewsError("");

      const response = await axios.post(
        `${API_BASE_URL}/news/process`,
        {
          text: newsText,
        }
      );

      setProcessResult(response.data);

      // Refresh dashboard because the processing endpoint
      // can update risk/status information.
      await loadGraph();
    } catch (err) {
      console.error("News processing failed:", err);

      setNewsError(
        err.response?.data?.detail ||
          "Unable to process the disruption."
      );
    } finally {
      setProcessLoading(false);
    }
  };

  // --------------------------------------------------
  // DAY 15 - PROCESSING DATA
  // --------------------------------------------------

  const processAnalysis = processResult?.analysis || null;

  const affectedNodes = processResult?.affected_nodes || [];

  const predictions = processResult?.predictions || [];

  const predictionSummary = useMemo(() => {
    return {
      high: predictions.filter(
        (node) => node.risk_level === "HIGH"
      ).length,

      medium: predictions.filter(
        (node) => node.risk_level === "MEDIUM"
      ).length,

      low: predictions.filter(
        (node) => node.risk_level === "LOW"
      ).length,
    };
  }, [predictions]);

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

        {/* --------------------------------------------------
            HERO
        -------------------------------------------------- */}

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

        {/* --------------------------------------------------
            STATS
        -------------------------------------------------- */}

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

        {/* --------------------------------------------------
            DAY 15 - NEWS ANALYSIS
        -------------------------------------------------- */}

        <section className="news-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NEWS INTELLIGENCE</p>

              <h2>Analyze Supply Chain Disruption</h2>
            </div>
          </div>

          <div className="news-input-panel">
            <label htmlFor="news-input">
              News / Disruption Statement
            </label>

            <textarea
              id="news-input"
              value={newsText}
              onChange={(event) => setNewsText(event.target.value)}
              placeholder="Enter a supply chain disruption news statement..."
              rows={4}
            />

            <div className="news-actions">
              <button
                className="analyze-button"
                onClick={analyzeNews}
                disabled={newsLoading || processLoading}
              >
                {newsLoading ? "Analyzing..." : "Analyze News"}
              </button>

              <button
                className="process-button"
                onClick={processNews}
                disabled={processLoading || newsLoading}
              >
                {processLoading
                  ? "Processing..."
                  : "Process Disruption"}
              </button>
            </div>
          </div>

          {newsError && (
            <div className="error-banner news-error">
              {newsError}
            </div>
          )}

          {/* ANALYSIS RESULT */}

          {newsAnalysis && (
            <div className="news-results">

              <div className="result-card">
                <div className="result-card-header">
                  <h3>Extracted Entities</h3>

                  <span>
                    {newsAnalysis.entities?.length || 0}
                  </span>
                </div>

                {newsAnalysis.entities?.length > 0 ? (
                  <div className="entity-list">
                    {newsAnalysis.entities.map((entity, index) => (
                      <div className="entity-item" key={index}>
                        <strong>{entity.text}</strong>

                        <span>{entity.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-text">
                    No entities detected.
                  </p>
                )}
              </div>

              <div className="result-card">
                <div className="result-card-header">
                  <h3>Detected Disruptions</h3>

                  <span>
                    {newsAnalysis.disruptions?.length || 0}
                  </span>
                </div>

                {newsAnalysis.disruptions?.length > 0 ? (
                  <div className="disruption-list">
                    {newsAnalysis.disruptions.map(
                      (disruption, index) => (
                        <div
                          className="disruption-item"
                          key={index}
                        >
                          <strong>{disruption.event}</strong>

                          <span
                            className={`risk-badge ${getRiskClass(
                              disruption.severity === "high"
                                ? 0.9
                                : disruption.severity === "medium"
                                ? 0.5
                                : 0.2
                            )}`}
                          >
                            {disruption.severity.toUpperCase()}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="empty-text">
                    No disruptions detected.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* PROCESS RESULT */}

          {processResult && (
            <div className="process-results">

              <div className="process-header">
                <div>
                  <p className="eyebrow">
                    RIPPLE EFFECT ANALYSIS
                  </p>

                  <h2>Disruption Impact</h2>
                </div>

                <div
                  className={`severity-badge ${getRiskClass(
                    processAnalysis?.selected_severity === "high"
                      ? 0.9
                      : processAnalysis?.selected_severity ===
                        "medium"
                      ? 0.5
                      : 0.2
                  )}`}
                >
                  {processResult.selected_severity?.toUpperCase()}
                </div>
              </div>

              {/* AFFECTED NODES */}

              <div className="impact-section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">DIRECT IMPACT</p>

                    <h3>Affected Nodes</h3>
                  </div>
                </div>

                <div className="affected-list">
                  {affectedNodes.length === 0 ? (
                    <p className="empty-text">
                      No affected nodes detected.
                    </p>
                  ) : (
                    affectedNodes.map((node) => (
                      <div
                        className="affected-node"
                        key={node.node_id}
                      >
                        <div>
                          <strong>{node.name}</strong>

                          <span>
                            {node.node_type} · {node.node_id}
                          </span>
                        </div>

                        <div className="affected-risk">
                          <strong>
                            {Number(node.risk_score).toFixed(2)}
                          </strong>

                          <span>
                            {node.status?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* PREDICTION SUMMARY */}

              <div className="prediction-summary">
                <div className="prediction-card high-card">
                  <span>High Risk Predictions</span>
                  <strong>{predictionSummary.high}</strong>
                </div>

                <div className="prediction-card medium-card">
                  <span>Medium Risk Predictions</span>
                  <strong>{predictionSummary.medium}</strong>
                </div>

                <div className="prediction-card low-card">
                  <span>Low Risk Predictions</span>
                  <strong>{predictionSummary.low}</strong>
                </div>
              </div>

              {/* GNN PREDICTIONS */}

              <div className="impact-section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">
                      GNN RISK PREDICTION
                    </p>

                    <h3>Ripple Effect Predictions</h3>
                  </div>

                  <span className="prediction-count">
                    {predictions.length} nodes analyzed
                  </span>
                </div>

                <div className="prediction-list">
                  {predictions
                    .slice()
                    .sort(
                      (a, b) =>
                        Number(b.predicted_risk) -
                        Number(a.predicted_risk)
                    )
                    .map((node) => (
                      <div
                        className="prediction-row"
                        key={node.node_id}
                        onClick={() =>
                          setSelectedNodeId(node.node_id)
                        }
                      >
                        <div className="prediction-info">
                          <strong>{node.name}</strong>

                          <span>
                            {node.node_type} · {node.node_id}
                          </span>
                        </div>

                        <div className="prediction-risk">
                          <strong
                            className={getRiskClass(
                              Number(node.predicted_risk)
                            )}
                          >
                            {Number(
                              node.predicted_risk
                            ).toFixed(4)}
                          </strong>

                          <span
                            className={`risk-badge ${getRiskClass(
                              Number(node.predicted_risk)
                            )}`}
                          >
                            {node.risk_level}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* --------------------------------------------------
            FILTER PANEL
        -------------------------------------------------- */}

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

        {/* --------------------------------------------------
            GRAPH
        -------------------------------------------------- */}

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

        {/* --------------------------------------------------
            NODE DETAILS
        -------------------------------------------------- */}

        <section className="details-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NODE INSPECTION</p>

              <h2>Selected Node</h2>
            </div>
          </div>

          {!selectedNode ? (
            <div className="no-selection">
              <p>
                Click a node in the graph to inspect its details.
              </p>
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
                  {Number(
                    selectedNode.risk_score || 0
                  ).toFixed(2)}
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

                <strong>
                  {selectedNode.status || "NORMAL"}
                </strong>
              </div>
            </div>
          )}
        </section>

        {/* --------------------------------------------------
            BOTTOM GRID
        -------------------------------------------------- */}

        <section className="bottom-grid">
          <div className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">NODE TYPES</p>

                <h2>Network Legend</h2>
              </div>
            </div>

            <div className="legend-grid">
              {Object.entries(NODE_COLORS).map(
                ([type, color]) => (
                  <div className="legend-item" key={type}>
                    <span
                      className="legend-dot"
                      style={{ background: color }}
                    ></span>

                    <span>{type}</span>
                  </div>
                )
              )}
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
                    onClick={() =>
                      setSelectedNodeId(node.node_id)
                    }
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
                      {Number(
                        node.predicted_risk
                      ).toFixed(2)}
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