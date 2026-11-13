 
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  Activity,
  Clock,
  RefreshCw,
  Search,
  Camera,
  ShieldAlert,
  Filter,
} from "lucide-react";

import { getCityFlowAnomalies } from "../services/api";

function Anomalies() {
  const [data, setData] = useState(null);
  const [sequence, setSequence] = useState("S04");
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnomalies = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getCityFlowAnomalies(sequence);
      setData(response.data);
    } catch (err) {
      console.error("Anomaly API error:", err);
      setError(
        err.response?.data?.detail ||
          "Unable to load anomaly detection data."
      );
    } finally {
      setLoading(false);
    }
  }, [sequence]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  const anomalies = data?.anomalies || [];

  // Classify candidates using the reasons returned by the API.
  const getSeverity = (item) => {
    const reasons = item.anomaly_reasons || [];

    if (
      reasons.includes("Unusually high travel time") &&
      reasons.includes("Low frequency route")
    ) {
      return "HIGH";
    }

    if (reasons.includes("Unusually high travel time")) {
      return "MEDIUM";
    }

    return "LOW";
  };

  const highAlerts = anomalies.filter(
    (item) => getSeverity(item) === "HIGH"
  ).length;

  const mediumAlerts = anomalies.filter(
    (item) => getSeverity(item) === "MEDIUM"
  ).length;

  const lowAlerts = anomalies.filter(
    (item) => getSeverity(item) === "LOW"
  ).length;

  const highTravelAlerts = anomalies.filter((item) =>
    (item.anomaly_reasons || []).includes(
      "Unusually high travel time"
    )
  ).length;

  const lowFrequencyAlerts = anomalies.filter((item) =>
    (item.anomaly_reasons || []).includes(
      "Low frequency route"
    )
  ).length;

  const filteredAnomalies = useMemo(() => {
    return anomalies
      .filter((item) => {
        const reasons = item.anomaly_reasons || [];

        const searchableText = [
          item.from_camera,
          item.to_camera,
          ...reasons,
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch = searchableText.includes(
          search.toLowerCase()
        );

        const severity = getSeverity(item);

        const matchesSeverity =
          severityFilter === "ALL" ||
          severity === severityFilter;

        return matchesSearch && matchesSeverity;
      })
      .sort((a, b) => {
        const order = {
          HIGH: 1,
          MEDIUM: 2,
          LOW: 3,
        };

        return order[getSeverity(a)] - order[getSeverity(b)];
      });
  }, [anomalies, search, severityFilter]);

  const severityStyle = (severity) => {
    const styles = {
      HIGH: {
        background: "rgba(239,68,68,0.15)",
        color: "#f87171",
        border: "1px solid rgba(239,68,68,0.4)",
      },
      MEDIUM: {
        background: "rgba(245,158,11,0.15)",
        color: "#fbbf24",
        border: "1px solid rgba(245,158,11,0.4)",
      },
      LOW: {
        background: "rgba(34,197,94,0.12)",
        color: "#4ade80",
        border: "1px solid rgba(34,197,94,0.35)",
      },
    };

    return styles[severity];
  };

  const cardStyle = {
    background: "#111f35",
    border: "1px solid #263d59",
    borderRadius: "12px",
    padding: "20px",
    minWidth: 0,
  };

  return (
    <div className="patterns-page">

      {/* Header */}
      <div className="patterns-heading">
        <div>
          <h1>Vehicle Movement Anomalies</h1>
          <p>
            Identify unusual camera transitions using rule-based
            traffic movement analysis.
          </p>
        </div>

        <button
          className="patterns-refresh"
          onClick={fetchAnomalies}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            style={{
              animation: loading ? "spin 1s linear infinite" : "none",
            }}
          />
          Refresh
        </button>
      </div>

      {/* Sequence selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <label htmlFor="anomaly-sequence">
          Dataset Sequence:
        </label>

        <select
          id="anomaly-sequence"
          value={sequence}
          onChange={(e) => setSequence(e.target.value)}
        >
          <option value="S01">S01</option>
          <option value="S03">S03</option>
          <option value="S04">S04</option>
        </select>
      </div>

      {/* Main statistics */}
      <div
        className="patterns-stats"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: "16px",
        }}
      >
        <div className="patterns-stat-card">
          <AlertTriangle size={23} />
          <div>
            <span>Total Anomaly Candidates</span>
            <h2>{loading ? "..." : data?.total_anomalies ?? 0}</h2>
          </div>
        </div>

        <div className="patterns-stat-card">
          <ShieldAlert size={23} />
          <div>
            <span>High Severity</span>
            <h2>{loading ? "..." : highAlerts}</h2>
          </div>
        </div>

        <div className="patterns-stat-card">
          <Activity size={23} />
          <div>
            <span>Low Frequency Routes</span>
            <h2>{loading ? "..." : lowFrequencyAlerts}</h2>
          </div>
        </div>

        <div className="patterns-stat-card">
          <Clock size={23} />
          <div>
            <span>High Travel Time Alerts</span>
            <h2>{loading ? "..." : highTravelAlerts}</h2>
          </div>
        </div>
      </div>

      {/* Severity summary */}
      <div
        style={{
          ...cardStyle,
          display: "flex",
          gap: "28px",
          flexWrap: "wrap",
          marginTop: "20px",
          marginBottom: "20px",
        }}
      >
        <div>
          <span style={{ color: "#94a3b8", fontSize: "12px" }}>
            HIGH
          </span>
          <h3 style={{ color: "#f87171", margin: "6px 0" }}>
            {loading ? "..." : highAlerts}
          </h3>
        </div>

        <div>
          <span style={{ color: "#94a3b8", fontSize: "12px" }}>
            MEDIUM
          </span>
          <h3 style={{ color: "#fbbf24", margin: "6px 0" }}>
            {loading ? "..." : mediumAlerts}
          </h3>
        </div>

        <div>
          <span style={{ color: "#94a3b8", fontSize: "12px" }}>
            LOW
          </span>
          <h3 style={{ color: "#4ade80", margin: "6px 0" }}>
            {loading ? "..." : lowAlerts}
          </h3>
        </div>

        <div>
          <span style={{ color: "#94a3b8", fontSize: "12px" }}>
            BASELINE TRAVEL TIME
          </span>
          <h3 style={{ color: "#38bdf8", margin: "6px 0" }}>
            {loading
              ? "..."
              : `${data?.baseline_travel_seconds ?? 0} sec`}
          </h3>
        </div>
      </div>

      {/* Alerts table */}
      <div className="patterns-table-card">

        <div className="patterns-table-heading">
          <div>
            <h2>
              <AlertTriangle
                size={19}
                style={{ verticalAlign: "middle", marginRight: "8px" }}
              />
              Anomaly Detection Results
            </h2>

            <p>
              {filteredAnomalies.length} of {anomalies.length} candidates
              displayed
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div className="patterns-search">
              <Search size={17} />
              <input
                type="text"
                placeholder="Search camera or reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
              }}
            >
              <Filter size={17} />

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option value="ALL">All Severity</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="patterns-message">
            Analyzing vehicle movements...
          </p>
        ) : error ? (
          <p className="patterns-error">{error}</p>
        ) : filteredAnomalies.length === 0 ? (
          <p className="patterns-message">
            No anomaly candidates match your filters.
          </p>
        ) : (
          <div className="patterns-table-wrapper">
            <table className="patterns-table">
              <thead>
                <tr>
                  <th>Camera Route</th>
                  <th>Vehicles</th>
                  <th>Travel Time</th>
                  <th>Detection Reason</th>
                  <th>Severity</th>
                </tr>
              </thead>

              <tbody>
                {filteredAnomalies.map((item, index) => {
                  const severity = getSeverity(item);

                  return (
                    <tr
                      key={`${item.from_camera}-${item.to_camera}-${index}`}
                    >
                      <td>
                        <div className="pattern-route">
                          <Camera size={15} />
                          {item.from_camera} → {item.to_camera}
                        </div>
                      </td>

                      <td>{item.vehicle_count}</td>

                      <td>
                        {Number(item.avg_travel_seconds).toFixed(2)} sec
                      </td>

                      <td>
                        {(item.anomaly_reasons || []).map((reason) => (
                          <div key={reason}>{reason}</div>
                        ))}
                      </td>

                      <td>
                        <span
                          style={{
                            ...severityStyle(severity),
                            padding: "6px 11px",
                            borderRadius: "20px",
                            fontSize: "11px",
                            fontWeight: 700,
                            display: "inline-block",
                          }}
                        >
                          {severity}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p
          style={{
            padding: "16px",
            fontSize: "12px",
            opacity: 0.7,
            lineHeight: 1.6,
          }}
        >
          Detection method: {data?.detection_method || "Rule-based"}.
          Severity is a UI classification of the returned anomaly reasons.
          These are anomaly candidates, not confirmed traffic incidents.
        </p>
      </div>
    </div>
  );
}

export default Anomalies;
