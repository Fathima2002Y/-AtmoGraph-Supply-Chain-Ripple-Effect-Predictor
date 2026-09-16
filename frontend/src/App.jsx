import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

const NODE_COLORS = {
  Supplier: "#2563eb",
  Manufacturer: "#7c3aed",
  Port: "#0891b2",
  Distributor: "#ea580c",
  Retailer: "#16a34a",
  Product: "#db2777",
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
  const score = Number(riskScore || 0);

  if (score >= 0.7) {
    return "high";
  }

  if (score >= 0.4) {
    return "medium";
  }

  return "low";
}

function getRiskLevel(riskScore) {
  const score = Number(riskScore || 0);

  if (score >= 0.7) {
    return "HIGH";
  }

  if (score >= 0.4) {
    return "MEDIUM";
  }

  return "LOW";
}

function createFlowNodes(apiNodes, selectedNodeId) {
  const positions = {
    Supplier: { x: 50, y: 0 },
    Manufacturer: { x: 300, y: 0 },
    Port: { x: 550, y: 0 },
    Distributor: { x: 800, y: 0 },
    Retailer: { x: 1050, y: 0 },
    Product: { x: 550, y: 400 },
  };

  const counters = {
    Supplier: 0,
    Manufacturer: 0,
    Port: 0,
    Distributor: 0,
    Retailer: 0,
    Product: 0,
  };

  return apiNodes.map((node) => {
    const nodeType = node.node_type || "Unknown";
    const basePosition = positions[nodeType] || { x: 50, y: 0 };

    const index = counters[nodeType] || 0;
    counters[nodeType] = index + 1;

    const riskScore = Number(node.risk_score || 0);
    const riskLevel = getRiskLevel(riskScore);
    const isSelected = node.node_id === selectedNodeId;

    return {
      id: node.node_id,
      position: {
        x: basePosition.x,
        y: basePosition.y + index * 95,
      },
      data: {
        label: (
          <div className="flow-node-content">
            <div
              className="flow-node-type"
              style={{ color: getNodeColor(nodeType) }}
            >
              {nodeType}
            </div>

            <div className="flow-node-name">
              {node.name}
            </div>

            <div className="flow-node-risk">
              Risk: {riskScore.toFixed(3)}
            </div>

            <div className={`flow-node-status ${getRiskClass(riskScore)}`}>
              {node.status || riskLevel}
            </div>
          </div>
        ),
      },
      style: {
        border: isSelected
          ? "3px solid #111827"
          : `2px solid ${getNodeColor(nodeType)}`,
        borderRadius: "12px",
        padding: "10px",
        width: 190,
        background: "#ffffff",
        boxShadow: isSelected
          ? "0 0 0 4px rgba(37, 99, 235, 0.18), 0 8px 20px rgba(15, 23, 42, 0.15)"
          : "0 4px 12px rgba(15, 23, 42, 0.08)",
      },
    };
  });
}

function createFlowEdges(apiRelationships, visibleNodeIds) {
  return apiRelationships
    .filter(
      (relationship) =>
        visibleNodeIds.has(relationship.source_id) &&
        visibleNodeIds.has(relationship.target_id)
    )
    .map((relationship, index) => ({
      id: `${relationship.source_id}-${relationship.target_id}-${relationship.relationship_type}-${index}`,
      source: relationship.source_id,
      target: relationship.target_id,
      type: "smoothstep",
      animated: false,
      label: relationship.relationship_type,
      labelStyle: {
        fontSize: 9,
        fontWeight: 600,
      },
      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 0.9,
      },
      style: {
        strokeWidth: 1.5,
      },
    }));
}

function App() {
  const [apiNodes, setApiNodes] = useState([]);
  const [apiRelationships, setApiRelationships] = useState([]);

  const [summary, setSummary] = useState(null);
  const [topRisks, setTopRisks] = useState([]);

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [nodeTypeFilter, setNodeTypeFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Day 15 - News Intelligence
  const [newsText, setNewsText] = useState(
    "A major strike at Rotterdam Port has caused shipment delays."
  );

  const [newsAnalysis, setNewsAnalysis] = useState(null);
  const [processResult, setProcessResult] = useState(null);

  const [newsLoading, setNewsLoading] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);
  const [newsError, setNewsError] = useState("");

  // Day 16 - Node Inspection / Neighbor Analysis
  const [neighbors, setNeighbors] = useState([]);
  const [neighborCount, setNeighborCount] = useState(0);
  const [neighborLoading, setNeighborLoading] = useState(false);
  const [neighborError, setNeighborError] = useState("");
  // Day 17 - Prediction Horizon / Ripple Forecast
  const [predictionHorizon, setPredictionHorizon] = useState(30);
  
  // Day 18 - Real-time prediction refresh
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionUpdatedAt, setPredictionUpdatedAt] = useState("");
  const [predictionError, setPredictionError] = useState("");

  const loadGraph = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        graphResponse,
        summaryResponse,
        topRiskResponse,
      ] = await Promise.all([
        axios.get(`${API_BASE_URL}/graph`),
        axios.get(`${API_BASE_URL}/risk/summary`),
        axios.get(`${API_BASE_URL}/risk/top?limit=5`),
      ]);

      setApiNodes(graphResponse.data.nodes || []);
      setApiRelationships(
        graphResponse.data.relationships || []
      );

      setSummary(summaryResponse.data);
      setTopRisks(topRiskResponse.data.nodes || []);
      setSelectedNodeId(null);

      // Clear Day 16 inspection when graph refreshes.
      setNeighbors([]);
      setNeighborCount(0);
      setNeighborError("");
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Unable to connect to the AtmoGraph backend."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, []);

  // Filter API nodes before creating React Flow nodes.
  const filteredApiNodes = useMemo(() => {
    return apiNodes.filter((node) => {
      const riskScore = Number(node.risk_score || 0);
      const riskLevel = getRiskLevel(riskScore);

      const matchesNodeType =
        nodeTypeFilter === "All" ||
        node.node_type === nodeTypeFilter;

      const matchesRisk =
        riskFilter === "All" ||
        riskLevel === riskFilter.toUpperCase();

      return matchesNodeType && matchesRisk;
    });
  }, [apiNodes, nodeTypeFilter, riskFilter]);

  const selectedNode = useMemo(() => {
    return (
      apiNodes.find(
        (node) => node.node_id === selectedNodeId
      ) || null
    );
  }, [apiNodes, selectedNodeId]);

  // FIX:
  // Nodes and edges are derived directly from the filtered API data.
  // This prevents the previous "1 of 33 nodes" React Flow state issue.
  const visibleNodeIds = useMemo(() => {
    return new Set(
      filteredApiNodes.map((node) => node.node_id)
    );
  }, [filteredApiNodes]);

  const flowNodes = useMemo(() => {
    return createFlowNodes(
      filteredApiNodes,
      selectedNodeId
    );
  }, [filteredApiNodes, selectedNodeId]);

  const flowEdges = useMemo(() => {
    return createFlowEdges(
      apiRelationships,
      visibleNodeIds
    );
  }, [apiRelationships, visibleNodeIds]);

  const handleNodeClick = async (_event, node) => {
    setSelectedNodeId(node.id);

    // Day 16 - load connected neighbors.
    try {
      setNeighborLoading(true);
      setNeighborError("");
      setNeighbors([]);
      setNeighborCount(0);

      const response = await axios.get(
        `${API_BASE_URL}/graph/${node.id}/neighbors`
      );

      setNeighbors(response.data.neighbors || []);
      setNeighborCount(response.data.neighbor_count || 0);
    } catch (err) {
      console.error(err);

      setNeighborError(
        err.response?.data?.detail ||
          "Unable to load connected neighbors."
      );
    } finally {
      setNeighborLoading(false);
    }
  };

  const handlePaneClick = () => {
    setSelectedNodeId(null);
    setNeighbors([]);
    setNeighborCount(0);
    setNeighborError("");
  };

  const resetFilters = () => {
    setNodeTypeFilter("All");
    setRiskFilter("All");
    setSelectedNodeId(null);
    setNeighbors([]);
    setNeighborCount(0);
    setNeighborError("");
  };

  const analyzeNews = async () => {
    if (!newsText.trim()) {
      setNewsError("Please enter a news or disruption statement.");
      return;
    }

    try {
      setNewsLoading(true);
      setNewsError("");
      setNewsAnalysis(null);

      const response = await axios.post(
        `${API_BASE_URL}/news/analyze`,
        {
          text: newsText,
        }
      );

      setNewsAnalysis(response.data);
    } catch (err) {
      console.error(err);

      setNewsError(
        err.response?.data?.detail ||
          "Unable to analyze the news statement."
      );
    } finally {
      setNewsLoading(false);
    }
  };

  const processNews = async () => {
    if (!newsText.trim()) {
      setNewsError("Please enter a news or disruption statement.");
      return;
    }

    try {
      setProcessLoading(true);
      setNewsError("");
      setProcessResult(null);

      const response = await axios.post(
        `${API_BASE_URL}/news/process`,
        {
          text: newsText,
        }
      );

      setProcessResult(response.data);

      // Refresh graph/risk information after processing.
      await loadGraph();
    } catch (err) {
      console.error(err);

      setNewsError(
        err.response?.data?.detail ||
          "Unable to process the disruption."
      );
    } finally {
      setProcessLoading(false);
    }
  };

  // Day 18 - Refresh current GNN predictions from the backend.
  const refreshPredictions = async () => {
    try {
      setPredictionLoading(true);
      setPredictionError("");

      const response = await axios.get(
        `${API_BASE_URL}/predictions`
      );

      const latestPredictions =
        response.data.predictions || [];

      setProcessResult((previousResult) => ({
        ...(previousResult || {}),
        predictions: latestPredictions,
      }));

      setPredictionUpdatedAt(
        response.data.generated_at ||
          new Date().toISOString()
      );
    } catch (err) {
      console.error(err);

      setPredictionError(
        err.response?.data?.detail ||
          "Unable to refresh GNN predictions."
      );
    } finally {
      setPredictionLoading(false);
    }
  };

  const processAnalysis =
    processResult?.analysis || null;

  const affectedNodes =
    processResult?.affected_nodes || [];

  const predictions =
    processResult?.predictions || [];

  const predictionSummary = useMemo(() => {
    return predictions.reduce(
      (result, prediction) => {
        const level = String(
          prediction.risk_level || "LOW"
        ).toUpperCase();

        if (level === "HIGH") {
          result.high += 1;
        } else if (level === "MEDIUM") {
          result.medium += 1;
        } else {
          result.low += 1;
        }

        return result;
      },
      {
        high: 0,
        medium: 0,
        low: 0,
      }
    );
  }, [predictions]);
  // Day 17 - Project current GNN predictions across the selected horizon.
  const horizonMultiplier = useMemo(() => {
    if (predictionHorizon === 30) {
      return 1;
    }

    if (predictionHorizon === 60) {
      return 1.08;
    }

    return 1.15;
  }, [predictionHorizon]);

  const projectedPredictions = useMemo(() => {
    return predictions.map((prediction) => {
      const currentScore = Number(
        prediction.predicted_risk ??
          prediction.risk_score ??
          prediction.score ??
          0
      );

      const projectedScore = Math.min(
        currentScore * horizonMultiplier,
        1
      );

      return {
        ...prediction,
        projected_risk: projectedScore,
        projected_risk_level: getRiskLevel(projectedScore),
      };
    });
  }, [predictions, horizonMultiplier]);

  const projectedSummary = useMemo(() => {
    return projectedPredictions.reduce(
      (result, prediction) => {
        const level = prediction.projected_risk_level;

        if (level === "HIGH") {
          result.high += 1;
        } else if (level === "MEDIUM") {
          result.medium += 1;
        } else {
          result.low += 1;
        }

        return result;
      },
      {
        high: 0,
        medium: 0,
        low: 0,
      }
    );
  }, [projectedPredictions]);

  const stats = {
    total: summary?.total_nodes ?? apiNodes.length,
    high: summary?.high_risk ?? 0,
    medium: summary?.medium_risk ?? 0,
    low: summary?.low_risk ?? 0,
    average: summary?.average_risk ?? 0,
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="brand">AtmoGraph</div>
          <div className="brand-subtitle">
            Supply Chain Ripple Effect Predictor
          </div>
        </div>

        <div className="topbar-status">
          <span className="status-dot"></span>
          API Connected
        </div>
      </header>

      <main className="dashboard">
        <section className="hero">
          <div>
            <p className="eyebrow">
              SUPPLY CHAIN INTELLIGENCE
            </p>

            <h1>
              Supply Chain Risk
              <span> Monitoring Dashboard</span>
            </h1>

            <p className="hero-description">
              Monitor supply chain dependencies, analyze
              disruption news, and understand ripple effects
              across connected entities.
            </p>
          </div>
        </section>

        {error && (
          <div className="error-banner">
            <strong>Error:</strong> {error}
          </div>
        )}

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">TOTAL NODES</div>
            <div className="stat-value">
              {stats.total}
            </div>
            <div className="stat-description">
              Supply chain entities
            </div>
          </div>

          <div className="stat-card high-stat">
            <div className="stat-label">HIGH RISK</div>
            <div className="stat-value">
              {stats.high}
            </div>
            <div className="stat-description">
              Critical attention required
            </div>
          </div>

          <div className="stat-card medium-stat">
            <div className="stat-label">MEDIUM RISK</div>
            <div className="stat-value">
              {stats.medium}
            </div>
            <div className="stat-description">
              Requires monitoring
            </div>
          </div>

          <div className="stat-card low-stat">
            <div className="stat-label">LOW RISK</div>
            <div className="stat-value">
              {stats.low}
            </div>
            <div className="stat-description">
              Currently stable
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">AVERAGE RISK</div>
            <div className="stat-value">
              {Number(stats.average).toFixed(3)}
            </div>
            <div className="stat-description">
              Overall network risk
            </div>
          </div>
        </section>

        {/* =========================
            DAY 15 - NEWS INTELLIGENCE
           ========================= */}
        <section className="dashboard-section news-section">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">
                 NEWS INTELLIGENCE
              </p>

              <h2>
                Analyze Supply Chain Disruptions
              </h2>

              <p>
                Enter a news statement to extract entities,
                identify disruptions, and process the event
                through the supply chain risk pipeline.
              </p>
            </div>
          </div>

          <div className="news-input-panel">
            <label htmlFor="newsText">
              News / Disruption Statement
            </label>

            <textarea
              id="newsText"
              value={newsText}
              onChange={(event) =>
                setNewsText(event.target.value)
              }
              placeholder="Enter a supply chain news statement..."
              rows={5}
            />

            <div className="news-actions">
              <button
                className="primary-button"
                onClick={analyzeNews}
                disabled={newsLoading || processLoading}
              >
                {newsLoading
                  ? "Analyzing..."
                  : "Analyze News"}
              </button>

              <button
                className="secondary-button"
                onClick={processNews}
                disabled={newsLoading || processLoading}
              >
                {processLoading
                  ? "Processing..."
                  : "Process Disruption"}
              </button>
            </div>
          </div>

          {newsError && (
            <div className="error-banner news-error">
              <strong>News Error:</strong> {newsError}
            </div>
          )}

          {newsAnalysis && (
            <div className="news-results">
              <div className="result-card">
                <div className="result-card-header">
                  <h3>Extracted Entities</h3>
                  <span className="result-count">
                    {newsAnalysis.entities?.length || 0}
                  </span>
                </div>

                {newsAnalysis.entities?.length ? (
                  <div className="entity-list">
                    {newsAnalysis.entities.map(
                      (entity, index) => (
                        <div
                          className="entity-item"
                          key={`${entity.text}-${index}`}
                        >
                          <strong>{entity.text}</strong>

                          <span className="entity-type">
                            {entity.label}
                          </span>
                        </div>
                      )
                    )}
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
                  <span className="result-count">
                    {newsAnalysis.disruptions?.length || 0}
                  </span>
                </div>

                {newsAnalysis.disruptions?.length ? (
                  <div className="disruption-list">
                    {newsAnalysis.disruptions.map(
                      (disruption, index) => (
                        <div
                          className="disruption-item"
                          key={`${disruption.keyword}-${index}`}
                        >
                          <strong>
                            {disruption.keyword ||
                              disruption.text}
                          </strong>

                          <span
                            className={`severity-badge ${String(
                              disruption.severity || "low"
                            ).toLowerCase()}`}
                          >
                            {String(
                              disruption.severity || "low"
                            ).toUpperCase()}
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

          {processResult && (
            <div className="process-results">
              <div className="process-header">
                <div>
                  <p className="section-eyebrow">
                    RIPPLE EFFECT ANALYSIS
                  </p>

                  <h3>Disruption Impact</h3>
                </div>

                {processAnalysis?.severity && (
                  <span
                    className={`severity-badge ${String(
                      processAnalysis.severity
                    ).toLowerCase()}`}
                  >
                    {String(
                      processAnalysis.severity
                    ).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="impact-section">
                <div className="impact-card">
                  <span className="impact-label">
                    DIRECT IMPACT
                  </span>

                  <strong>
                    {affectedNodes.length}
                  </strong>

                  <span>
                    affected node
                    {affectedNodes.length !== 1
                      ? "s"
                      : ""}
                  </span>
                </div>

                <div className="impact-card">
                  <span className="impact-label">
                    HIGH RISK
                  </span>

                  <strong>
                    {predictionSummary.high}
                  </strong>

                  <span>predicted nodes</span>
                </div>

                <div className="impact-card">
                  <span className="impact-label">
                    MEDIUM RISK
                  </span>

                  <strong>
                    {predictionSummary.medium}
                  </strong>

                  <span>predicted nodes</span>
                </div>

                <div className="impact-card">
                  <span className="impact-label">
                    LOW RISK
                  </span>

                  <strong>
                    {predictionSummary.low}
                  </strong>

                  <span>predicted nodes</span>
                </div>
              </div>

              <div className="affected-list">
                <h4>Affected Nodes</h4>

                {affectedNodes.length ? (
                  affectedNodes.map((node, index) => (
                    <div
                      className="affected-node"
                      key={`${node.node_id}-${index}`}
                    >
                      <div>
                        <strong>
                          {node.name || node.node_id}
                        </strong>

                        <span>
                          {node.node_type || "Node"} ·{" "}
                          {node.node_id}
                        </span>
                      </div>

                      <span className="direct-impact">
                        Direct Impact
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="empty-text">
                    No directly affected nodes returned.
                  </p>
                )}
              </div>

              {predictions.length > 0 && (
                <div className="prediction-list">
                  <h4>GNN Ripple Predictions</h4>

                  {predictions.map(
                    (prediction, index) => {
                      const score = Number(
                        prediction.predicted_risk ??
                          prediction.risk_score ??
                          prediction.score ??
                          0
                      );

                      const level = String(
                        prediction.risk_level ||
                          getRiskLevel(score)
                      ).toUpperCase();

                      return (
                        <div
                          className="prediction-item"
                          key={`${prediction.node_id}-${index}`}
                        >
                          <div className="prediction-info">
                            <strong>
                              {prediction.name ||
                                prediction.node_id}
                            </strong>

                            <span>
                              {prediction.node_type ||
                                "Node"}{" "}
                              ·{" "}
                              {prediction.node_id}
                            </span>
                          </div>

                          <div className="prediction-risk">
                            <span
                              className={`risk-badge ${level.toLowerCase()}`}
                            >
                              {level}
                            </span>

                            <span className="prediction-score">
                              {score.toFixed(3)}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* =========================
            GRAPH FILTERS
           ========================= */}
        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">
                SUPPLY CHAIN GRAPH
              </p>

              <h2>Interactive Network</h2>

              <p>
                Select a node to inspect its risk and
                connected supply chain relationships.
              </p>
            </div>
          </div>

          <div className="filter-panel">
            <div className="filter-group">
              <label>Node Type</label>

              <div className="filter-buttons">
                {NODE_TYPES.map((type) => (
                  <button
                    key={type}
                    className={
                      nodeTypeFilter === type
                        ? "filter-button active"
                        : "filter-button"
                    }
                    onClick={() =>
                      setNodeTypeFilter(type)
                    }
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label>Risk Level</label>

              <div className="filter-buttons">
                {RISK_TYPES.map((risk) => (
                  <button
                    key={risk}
                    className={
                      riskFilter === risk
                        ? "filter-button active"
                        : "filter-button"
                    }
                    onClick={() =>
                      setRiskFilter(risk)
                    }
                  >
                    {risk}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="reset-button"
              onClick={resetFilters}
            >
              Reset Filters
            </button>
          </div>

          <div className="graph-meta">
            <span>
              Showing{" "}
              <strong>{filteredApiNodes.length}</strong>{" "}
              of <strong>{apiNodes.length}</strong> nodes
            </span>

            <span>
              <strong>{flowNodes.length}</strong> nodes ·{" "}
              <strong>{flowEdges.length}</strong>{" "}
              relationships
            </span>
          </div>

          <div className="graph-container">
            {loading ? (
              <div className="loading-state">
                Loading supply chain graph...
              </div>
            ) : (
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
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

                <MiniMap
                  nodeColor={(node) => {
                    const originalNode = apiNodes.find(
                      (item) => item.node_id === node.id
                    );

                    return getNodeColor(
                      originalNode?.node_type
                    );
                  }}
                />
              </ReactFlow>
            )}
          </div>
        </section>

        {/* =========================
            NODE INSPECTION
            DAY 16
           ========================= */}
        <section className="dashboard-section inspection-section">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">
                 NODE INSPECTION
              </p>

              <h2>
                Node Details & Connected Neighbors
              </h2>

              <p>
                Inspect a selected supply chain node and
                understand which entities are directly
                connected to it.
              </p>
            </div>
          </div>

          {!selectedNode ? (
            <div className="inspection-empty">
              <div className="inspection-empty-icon">
                +
              </div>

              <h3>Select a node from the graph</h3>

              <p>
                Click any supplier, manufacturer, port,
                distributor, retailer, or product to inspect
                its risk and connected relationships.
              </p>
            </div>
          ) : (
            <div className="inspection-grid">
              <div className="node-details-card">
                <div className="inspection-card-header">
                  <div>
                    <span
                      className="node-type-badge"
                      style={{
                        borderColor: getNodeColor(
                          selectedNode.node_type
                        ),
                        color: getNodeColor(
                          selectedNode.node_type
                        ),
                      }}
                    >
                      {selectedNode.node_type}
                    </span>

                    <h3>{selectedNode.name}</h3>

                    <p>
                      Node ID: {selectedNode.node_id}
                    </p>
                  </div>

                  <span
                    className={`large-risk-badge ${getRiskClass(
                      selectedNode.risk_score
                    )}`}
                  >
                    {getRiskLevel(
                      selectedNode.risk_score
                    )}
                  </span>
                </div>

                <div className="node-detail-grid">
                  <div>
                    <span>Risk Score</span>
                    <strong>
                      {Number(
                        selectedNode.risk_score || 0
                      ).toFixed(3)}
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>
                      {selectedNode.status || "normal"}
                    </strong>
                  </div>

                  <div>
                    <span>Node Type</span>
                    <strong>
                      {selectedNode.node_type}
                    </strong>
                  </div>

                  <div>
                    <span>Node ID</span>
                    <strong>
                      {selectedNode.node_id}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="neighbors-card">
                <div className="inspection-card-header">
                  <div>
                    <span className="small-heading">
                      CONNECTED NETWORK
                    </span>

                    <h3>
                      Direct Neighbors
                      <span className="neighbor-count">
                        {neighborCount}
                      </span>
                    </h3>
                  </div>
                </div>

                {neighborLoading && (
                  <div className="neighbor-loading">
                    Loading connected neighbors...
                  </div>
                )}

                {neighborError && (
                  <div className="neighbor-error">
                    {neighborError}
                  </div>
                )}

                {!neighborLoading &&
                  !neighborError &&
                  neighbors.length === 0 && (
                    <div className="neighbor-empty">
                      No connected neighbors found.
                    </div>
                  )}

                {!neighborLoading &&
                  !neighborError &&
                  neighbors.length > 0 && (
                    <div className="neighbors-list">
                      {neighbors.map((neighbor) => (
                        <div
                          className="neighbor-item"
                          key={`${neighbor.node_id}-${neighbor.relationship_type}`}
                        >
                          <div className="neighbor-main">
                            <div
                              className="neighbor-type-dot"
                              style={{
                                background:
                                  getNodeColor(
                                    neighbor.node_type
                                  ),
                              }}
                            ></div>

                            <div>
                              <strong>
                                {neighbor.name}
                              </strong>

                              <span>
                                {neighbor.node_type} ·{" "}
                                {neighbor.node_id}
                              </span>
                            </div>
                          </div>

                          <div className="neighbor-right">
                            <span className="relationship-badge">
                              {neighbor.relationship_type}
                            </span>

                            <span
                              className={`neighbor-risk ${getRiskClass(
                                neighbor.risk_score
                              )}`}
                            >
                              {getRiskLevel(
                                neighbor.risk_score
                              )}{" "}
                              ·{" "}
                              {Number(
                                neighbor.risk_score || 0
                              ).toFixed(3)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          )}
        </section>
        {/* =========================
          DAY 17 - PREDICTION HORIZON
          ========================= */}
          <section className="dashboard-section prediction-horizon-section">
            <div className="section-heading">
              <div>
                <p className="section-eyebrow">
                  RIPPLE FORECAST
                </p>

                <h2>Prediction Horizon</h2>

                <p>
                Explore projected supply chain risk across
                30, 60, and 90-day horizons using the current
                GNN ripple-effect predictions.
                </p>
              </div>

              <div className="horizon-value">
                {predictionHorizon} DAYS
              </div>
            </div>

            {/* =========================
                DAY 18 - PREDICTION REFRESH
               ========================= */}
            <div className="prediction-refresh-row">
              <button
                type="button"
                className="prediction-refresh-button"
                onClick={refreshPredictions}
                disabled={predictionLoading}
              >
                {predictionLoading
                  ? "Refreshing..."
                  : "Refresh Predictions"}
              </button>

              {predictionUpdatedAt && (
                <span className="prediction-updated-time">
                  Last updated:{" "}
                  {new Date(
                    predictionUpdatedAt
                  ).toLocaleTimeString()}
                </span>
              )}
            </div>

            {predictionError && (
              <p className="prediction-refresh-error">
                {predictionError}
              </p>
            )}

            {predictions.length === 0 ? (
              <div className="forecast-empty">
                <strong>No GNN predictions available yet.</strong>

                <span>
                  Process a disruption statement above to generate
                  ripple-effect predictions.
                </span>
              </div>
            ) : (
              <>
                <div className="horizon-control">
                  <div className="horizon-labels">
                    <span>30 DAYS</span>
                    <span>60 DAYS</span>
                    <span>90 DAYS</span>
                  </div>

                  <input
                    type="range"
                    min="30"
                    max="90"
                    step="30"
                    value={predictionHorizon}
                    onChange={(event) =>
                      setPredictionHorizon(
                        Number(event.target.value)
                      )
                    }
                    className="horizon-slider"
                  />

                  <div className="horizon-buttons">
                    {[30, 60, 90].map((days) => (
                      <button
                        type="button"
                        key={days}
                        className={
                          predictionHorizon === days
                            ? "horizon-button active"
                            : "horizon-button"
                        }
                        onClick={() =>
                          setPredictionHorizon(days)
                        }
                      >
                        {days} Days
                      </button>
                    ))}
                  </div>
                </div>

                <div className="forecast-summary">
                  <div className="forecast-card high">
                    <span>HIGH RISK</span>

                    <strong>
                      {projectedSummary.high}
                    </strong>

                    <small>Projected nodes</small>
                  </div>

                  <div className="forecast-card medium">
                    <span>MEDIUM RISK</span>

                    <strong>
                      {projectedSummary.medium}
                    </strong>

                    <small>Projected nodes</small>
                  </div>

                  <div className="forecast-card low">
                    <span>LOW RISK</span>

                    <strong>
                      {projectedSummary.low}
                    </strong>

                    <small>Projected nodes</small>
                  </div>

                  <div className="forecast-card">
                    <span>HORIZON</span>

                    <strong>
                      {predictionHorizon}
                    </strong>

                    <small>Days ahead</small>
                  </div>
                </div>

                <p className="forecast-note">
                  Projected values are horizon-based risk estimates
                  derived from the current GNN prediction. The
                  underlying GNN prediction remains unchanged.
                </p>
              </>
            )}
          </section>

        {/* =========================
            BOTTOM DASHBOARD
           ========================= */}
        <section className="bottom-grid">
          <div className="dashboard-panel">
            <div className="panel-header">
              <div>
                <p className="section-eyebrow">
                  RISK DISTRIBUTION
                </p>

                <h3>Network Risk Overview</h3>
              </div>
            </div>

            <div className="risk-overview">
              <div className="risk-overview-row">
                <span>
                  <i className="legend-dot high"></i>
                  High Risk
                </span>

                <strong>{stats.high}</strong>
              </div>

              <div className="risk-overview-row">
                <span>
                  <i className="legend-dot medium"></i>
                  Medium Risk
                </span>

                <strong>{stats.medium}</strong>
              </div>

              <div className="risk-overview-row">
                <span>
                  <i className="legend-dot low"></i>
                  Low Risk
                </span>

                <strong>{stats.low}</strong>
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <div className="panel-header">
              <div>
                <p className="section-eyebrow">
                  TOP RISK NODES
                </p>

                <h3>Highest Risk Entities</h3>
              </div>
            </div>

            <div className="top-risk-list">
              {topRisks.length > 0 ? (
                topRisks.map((node, index) => (
                  <div
                    className="top-risk-item"
                    key={node.node_id || index}
                    onClick={() =>
                      handleNodeClick(
                        null,
                        { id: node.node_id }
                      )
                    }
                  >
                    <div className="top-risk-rank">
                      {index + 1}
                    </div>

                    <div className="top-risk-info">
                      <strong>
                        {node.name || node.node_id}
                      </strong>

                      <span>
                        {node.node_type || "Node"}
                      </span>
                    </div>

                    <div
                      className={`top-risk-score ${getRiskClass(
                        node.predicted_risk
                      )}`}
                    >
                      {Number(
                        node.predicted_risk || 0
                      ).toFixed(3)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-text">
                  No risk data available.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="legend-section">
          <div className="legend-title">
            Node Types
          </div>

          <div className="legend-items">
            {Object.entries(NODE_COLORS).map(
              ([type, color]) => (
                <div
                  className="legend-item"
                  key={type}
                >
                  <span
                    className="legend-square"
                    style={{
                      backgroundColor: color,
                    }}
                  ></span>

                  {type}
                </div>
              )
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;