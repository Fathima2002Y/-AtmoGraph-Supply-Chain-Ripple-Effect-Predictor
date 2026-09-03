import { useEffect, useState } from "react";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  Network,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000/api/v1";

function App() {
  const [summary, setSummary] = useState(null);
  const [topRisks, setTopRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [summaryResponse, topRiskResponse] = await Promise.all([
        axios.get(`${API_URL}/risk/summary`),
        axios.get(`${API_URL}/risk/top?limit=5`),
      ]);

      setSummary(summaryResponse.data);
      setTopRisks(topRiskResponse.data.nodes || []);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to connect to the AtmoGraph backend. Make sure FastAPI is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>AtmoGraph</h1>
          <p>Supply Chain Ripple Effect Predictor</p>
        </div>

        <div className="system-status">
          <span className="status-dot"></span>
          System Online
        </div>
      </header>

      <main className="dashboard">
        <section className="hero">
          <div>
            <span className="eyebrow">SUPPLY CHAIN INTELLIGENCE</span>
            <h2>Global Risk Monitoring</h2>
            <p>
              Monitor supply-chain disruptions and predicted ripple effects
              across the connected network.
            </p>
          </div>

          <Network size={48} strokeWidth={1.5} />
        </section>

        {error && <div className="error-box">{error}</div>}

        <section className="stats-grid">
          <StatCard
            icon={<Network />}
            title="Total Nodes"
            value={loading ? "—" : summary?.total_nodes ?? 0}
          />

          <StatCard
            icon={<AlertTriangle />}
            title="High Risk"
            value={loading ? "—" : summary?.high_risk ?? 0}
            danger
          />

          <StatCard
            icon={<Activity />}
            title="Medium Risk"
            value={loading ? "—" : summary?.medium_risk ?? 0}
          />

          <StatCard
            icon={<TrendingUp />}
            title="Average Risk"
            value={
              loading
                ? "—"
                : summary?.average_risk !== undefined
                  ? Number(summary.average_risk).toFixed(3)
                  : "0.000"
            }
          />
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-label">RISK ANALYSIS</span>
                <h3>Top Risk Nodes</h3>
              </div>
              <ShieldCheck size={22} />
            </div>

            {loading ? (
              <div className="empty-state">Loading risk data...</div>
            ) : topRisks.length === 0 ? (
              <div className="empty-state">No risk data available.</div>
            ) : (
              <div className="risk-list">
                {topRisks.map((node, index) => (
                  <div className="risk-row" key={node.node_id ?? index}>
                    <div className="risk-rank">{index + 1}</div>

                    <div className="risk-info">
                      <strong>
                        {node.name || node.node_id || "Unknown Node"}
                      </strong>
                      <span>
                        {node.type || node.node_type || "Supply Chain Node"}
                      </span>
                    </div>

                    <div className="risk-score">
                      <strong>
                        {Number(
                          node.risk_score ?? node.predicted_risk ?? 0
                        ).toFixed(3)}
                      </strong>
                      <span>Risk Score</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel overview-panel">
            <div className="panel-header">
              <div>
                <span className="panel-label">AT A GLANCE</span>
                <h3>Network Overview</h3>
              </div>
              <Activity size={22} />
            </div>

            <div className="overview-content">
              <div className="overview-icon">
                <Network size={42} />
              </div>

              <h4>Supply Chain Network</h4>

              <p>
                AtmoGraph combines graph relationships, disruption analysis,
                and GNN-based risk prediction to identify potential ripple
                effects.
              </p>

              <div className="overview-status">
                <span className="status-dot"></span>
                Backend connected
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, title, value, danger = false }) {
  return (
    <div className={`stat-card ${danger ? "danger" : ""}`}>
      <div className="stat-icon">{icon}</div>

      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default App;