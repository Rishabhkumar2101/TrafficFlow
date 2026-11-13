
import { useEffect, useState } from "react";
import {
  RefreshCw,
  Network,
  Camera,
  Activity,
  AlertCircle,
} from "lucide-react";

import CameraGraph from "../components/CameraGraph";
import { getCityFlowCameraNetwork } from "../services/api";

function CameraNetwork() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [sequence, setSequence] = useState("S04");
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchNetwork = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getCityFlowCameraNetwork(sequence);

        if (active) {
          setNetworkData(response.data);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.detail ||
              "Unable to load CityFlow camera network."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchNetwork();

    return () => {
      active = false;
    };
  }, [sequence, refreshKey]);

  const routes = networkData?.routes || [];

  const cameraCount = new Set(
    routes.flatMap((route) => [
      route.from_camera,
      route.to_camera,
    ])
  ).size;

  const vehicleTransitions = routes.reduce(
    (total, route) => total + route.vehicle_count,
    0
  );

  return (
    <div className="camera-network-page">
      <div className="page-heading">
        <div>
          <h1>City Camera Network</h1>
          <p>
            CityFlow vehicle movement connections between cameras.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={() => setRefreshKey((prev) => prev + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh Network
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="sequence-select">
          Dataset Sequence:{" "}
        </label>

        <select
          id="sequence-select"
          value={sequence}
          onChange={(e) => setSequence(e.target.value)}
        >
          <option value="S04">S04</option>
          <option value="S01">S01</option>
          <option value="S03">S03</option>
        </select>
      </div>

      <div className="network-info-cards">
        <div className="network-info-card">
          <Camera size={22} />
          <div>
            <span>Connected Cameras</span>
            <h2>{loading ? "..." : cameraCount}</h2>
          </div>
        </div>

        <div className="network-info-card">
          <Network size={22} />
          <div>
            <span>Connected Routes</span>
            <h2>
              {loading ? "..." : networkData?.total_routes ?? 0}
            </h2>
          </div>
        </div>

        <div className="network-info-card">
          <Activity size={22} />
          <div>
            <span>Vehicle Transitions</span>
            <h2>{loading ? "..." : vehicleTransitions}</h2>
          </div>
        </div>
      </div>

      {loading && <p>Loading CityFlow camera network...</p>}

      {error && (
        <div style={{ color: "red", margin: "16px 0" }}>
          <AlertCircle size={18} />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="network-graph-card">
            <div className="network-graph-heading">
              <div>
                <h2>Interactive Camera Graph</h2>
                <p>
                  Camera nodes and candidate vehicle transitions.
                </p>
              </div>
            </div>

            <div className="network-graph-container">
              <CameraGraph
                key={`${sequence}-${refreshKey}`}
                sequence={sequence}
              />
            </div>
          </div>

          <div className="network-graph-card" style={{ marginTop: "20px" }}>
            <div className="network-graph-heading">
              <div>
                <h2>CityFlow Camera Routes</h2>
                <p>
                  Candidate transitions from PostgreSQL for {sequence}.
                </p>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th>From Camera</th>
                    <th>To Camera</th>
                    <th>Vehicles</th>
                    <th>Avg Travel Time</th>
                  </tr>
                </thead>

                <tbody>
                  {routes.map((route, index) => (
                    <tr key={`${route.from_camera}-${route.to_camera}-${index}`}>
                      <td>{route.from_camera}</td>
                      <td>{route.to_camera}</td>
                      <td>{route.vehicle_count}</td>
                      <td>
                        {(route.avg_travel_minutes * 60).toFixed(1)} sec
                      </td>
                    </tr>
                  ))}

                  {routes.length === 0 && (
                    <tr>
                      <td colSpan="4">
                        No candidate routes found for this sequence.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CameraNetwork;
