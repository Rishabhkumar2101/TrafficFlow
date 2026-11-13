
import { useEffect, useMemo, useState } from "react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import {
  Camera,
  CarFront,
  Network,
  Activity,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Route,
  Clock,
  ShieldCheck,
} from "lucide-react";

import {
  getDatabaseSummary,
  getCityFlowCameraNetwork,
  getCityFlowRecurringPatterns,
  getCityFlowAnomalies,
} from "../services/api";

import CameraGraph from "../components/CameraGraph";

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [network, setNetwork] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [anomalies, setAnomalies] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sequence, setSequence] = useState("S04");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const results = await Promise.allSettled([
          getDatabaseSummary(),
          getCityFlowCameraNetwork(sequence),
          getCityFlowRecurringPatterns(sequence, 2),
          getCityFlowAnomalies(sequence),
        ]);

        if (!active) return;

        const [summaryResult, networkResult, patternsResult, anomalyResult] =
          results;

        if (summaryResult.status === "fulfilled") {
          setSummary(summaryResult.value.data);
        }

        if (networkResult.status === "fulfilled") {
          setNetwork(networkResult.value.data);
        }

        if (patternsResult.status === "fulfilled") {
          setPatterns(patternsResult.value.data.patterns || []);
        }

        if (anomalyResult.status === "fulfilled") {
          setAnomalies(anomalyResult.value.data);
        }

        if (results.every((result) => result.status === "rejected")) {
          setError("Unable to connect to TrafficFlow APIs.");
        }
      } catch (err) {
        console.error("Dashboard error:", err);
        if (active) setError("Dashboard loading failed.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [sequence, refreshKey]);

  const routes = network?.routes || [];
  const anomalyList = anomalies?.anomalies || [];

  const cameraCount = useMemo(() => {
    return new Set(
      routes.flatMap((route) => [
        route.from_camera,
        route.to_camera,
      ])
    ).size;
  }, [routes]);

  const vehicleTransitions = routes.reduce(
    (sum, route) => sum + Number(route.vehicle_count || 0),
    0
  );

  const chartData = routes
    .slice()
    .sort((a, b) => b.vehicle_count - a.vehicle_count)
    .slice(0, 10)
    .map((route) => ({
      route: `${route.from_camera.replace("S04_", "")} → ${route.to_camera.replace("S04_", "")}`,
      vehicles: route.vehicle_count,
    }));

  const highTravelAlerts = anomalyList.filter((item) =>
    item.anomaly_reasons.includes("Unusually high travel time")
  ).length;

  const lowFrequencyAlerts = anomalyList.filter((item) =>
    item.anomaly_reasons.includes("Low frequency route")
  ).length;

  const cards = [
    {
      title: "Connected Cameras",
      value: cameraCount,
      icon: Camera,
      color: "#38bdf8",
      subtitle: "Cameras in candidate routes",
    },
    {
      title: "Camera Routes",
      value: network?.total_routes ?? 0,
      icon: Network,
      color: "#34d399",
      subtitle: "Detected camera connections",
    },
    {
      title: "Vehicle Transitions",
      value: vehicleTransitions,
      icon: CarFront,
      color: "#fbbf24",
      subtitle: "Aggregated route support",
    },
    {
      title: "Anomaly Candidates",
      value: anomalies?.total_anomalies ?? 0,
      icon: AlertTriangle,
      color: "#fb7185",
      subtitle: "Rule-based alerts",
    },
  ];

  return (
    <div className="dashboard" style={{ padding: "24px" }}>

      {/* Header */}
      <div className="page-heading">
        <div>
          <h1>Traffic Command Center</h1>
          <p>
            TrafficFlow | Multi-Camera Vehicle Movement Intelligence
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
          >
            <option value="S01">Sequence S01</option>
            <option value="S03">Sequence S03</option>
            <option value="S04">Sequence S04</option>
          </select>

          <button
            className="refresh-button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="content-card">
          <p style={{ color: "#fb7185" }}>{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="stats-grid">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div className="stat-card" key={card.title}>
              <Icon size={25} color={card.color} />
              <p>{card.title}</p>
              <h2>{loading ? "..." : card.value}</h2>
              <small>{card.subtitle}</small>
            </div>
          );
        })}
      </div>

      {/* Main Analytics Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.7fr) minmax(280px, 1fr)",
          gap: "20px",
          marginTop: "22px",
        }}
      >

        {/* Camera Network */}
        <div className="content-card">
          <div className="page-heading">
            <div>
              <h2>Multi-Camera Network</h2>
              <p>Camera-to-camera vehicle transitions</p>
            </div>
            <Network size={22} color="#38bdf8" />
          </div>

          <CameraGraph
            key={`${sequence}-${refreshKey}`}
            sequence={sequence}
          />
        </div>

        {/* Traffic Summary */}
        <div className="content-card">
          <h2>Traffic Intelligence</h2>
          <p>Dataset analysis summary</p>

          <div style={{ marginTop: "24px" }}>
            <div className="pattern-row">
              <div>
                <strong>Recurring Patterns</strong>
                <p>Repeated camera transitions</p>
              </div>
              <strong>{loading ? "..." : patterns.length}</strong>
            </div>

            <div className="pattern-row">
              <div>
                <strong>High Travel-Time Alerts</strong>
                <p>Above baseline threshold</p>
              </div>
              <strong>{loading ? "..." : highTravelAlerts}</strong>
            </div>

            <div className="pattern-row">
              <div>
                <strong>Low-Frequency Routes</strong>
                <p>Single observed vehicle</p>
              </div>
              <strong>{loading ? "..." : lowFrequencyAlerts}</strong>
            </div>

            <div className="pattern-row">
              <div>
                <strong>Travel-Time Baseline</strong>
                <p>Median candidate route time</p>
              </div>
              <strong>
                {loading
                  ? "..."
                  : `${anomalies?.baseline_travel_seconds ?? 0} sec`}
              </strong>
            </div>
          </div>

          <div style={{ marginTop: "24px", display: "flex", gap: "10px" }}>
            <ShieldCheck size={20} color="#34d399" />
            <span style={{ fontSize: "13px" }}>
              Backend analytics connected
            </span>
          </div>
        </div>
      </div>

      {/* Route Analytics Chart */}
      <div className="content-card" style={{ marginTop: "22px" }}>
        <div className="page-heading">
          <div>
            <h2>Vehicle Movement Analytics</h2>
            <p>Top camera transitions by observed vehicle support</p>
          </div>
          <TrendingUp size={22} color="#38bdf8" />
        </div>

        <div style={{ width: "100%", height: "320px", marginTop: "20px" }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                />
                <XAxis
                  dataKey="route"
                  stroke="#94a3b8"
                  angle={-20}
                  textAnchor="end"
                  height={65}
                  fontSize={11}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#94a3b8"
                />
                <Tooltip
                  contentStyle={{
                    background: "#111c2e",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                  }}
                />
                <Bar
                  dataKey="vehicles"
                  name="Vehicle support"
                  fill="#22d3ee"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p>No route analytics available.</p>
          )}
        </div>
      </div>

      {/* Recent Anomalies */}
      <div className="content-card" style={{ marginTop: "22px" }}>
        <div className="page-heading">
          <div>
            <h2>Traffic Anomaly Candidates</h2>
            <p>Routes flagged for further investigation</p>
          </div>
          <AlertTriangle size={22} color="#fb7185" />
        </div>

        {anomalyList.length === 0 ? (
          <p>No anomaly candidates available.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="patterns-table">
              <thead>
                <tr>
                  <th>Camera Route</th>
                  <th>Vehicles</th>
                  <th>Travel Time</th>
                  <th>Detection Reason</th>
                </tr>
              </thead>

              <tbody>
                {anomalyList.slice(0, 5).map((item, index) => (
                  <tr key={`${item.from_camera}-${item.to_camera}-${index}`}>
                    <td>
                      {item.from_camera} → {item.to_camera}
                    </td>
                    <td>{item.vehicle_count}</td>
                    <td>{item.avg_travel_seconds.toFixed(2)} sec</td>
                    <td>{item.anomaly_reasons.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer note */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginTop: "20px",
          color: "#94a3b8",
          fontSize: "12px",
        }}
      >
        <Clock size={15} />
        Analytics are based on the selected CityFlowV2 dataset sequence.
        They are not live CCTV measurements.
      </div>

    </div>
  );
}

export default Dashboard;
