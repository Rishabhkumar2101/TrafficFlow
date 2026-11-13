
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Route,
  Search,
  RefreshCw,
  TrendingUp,
  CarFront,
  Clock,
} from "lucide-react";

import { getCityFlowRecurringPatterns } from "../services/api";

function Patterns() {
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [sequence, setSequence] = useState("S04");
  const [minSupport, setMinSupport] = useState(2);

  const fetchPatterns = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getCityFlowRecurringPatterns(
        sequence,
        minSupport
      );

      setPatterns(response.data.patterns || []);
    } catch (err) {
      console.error("CityFlow Patterns API error:", err);
      setError(
        err.response?.data?.detail ||
        "Unable to load CityFlow recurring patterns."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatterns();
  }, [sequence, minSupport]);

  const filteredPatterns = useMemo(() => {
    return patterns.filter((pattern) =>
      `${pattern.from_camera} ${pattern.to_camera} ${pattern.pattern_type}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [patterns, search]);

  const totalSupport = patterns.reduce(
    (sum, pattern) => sum + Number(pattern.vehicle_count || 0),
    0
  );

  const averageSupport = patterns.length
    ? (totalSupport / patterns.length).toFixed(1)
    : "0";

  return (
    <div className="patterns-page">

      <div className="patterns-heading">
        <div>
          <h1>Recurring Movement Patterns</h1>
          <p>
            Discover frequently repeated vehicle movements across cameras.
          </p>
        </div>

        <button
          className="patterns-refresh"
          onClick={fetchPatterns}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <div>
          <label htmlFor="pattern-sequence">
            Dataset Sequence
          </label>
          <select
            id="pattern-sequence"
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
          >
            <option value="S01">S01</option>
            <option value="S03">S03</option>
            <option value="S04">S04</option>
          </select>
        </div>

        <div>
          <label htmlFor="minimum-support">
            Minimum Vehicle Support
          </label>
          <select
            id="minimum-support"
            value={minSupport}
            onChange={(e) => setMinSupport(Number(e.target.value))}
          >
            <option value={1}>1 Vehicle</option>
            <option value={2}>2 Vehicles</option>
            <option value={3}>3 Vehicles</option>
            <option value={5}>5 Vehicles</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="patterns-stats">

        <div className="patterns-stat-card">
          <Activity size={23} />
          <div>
            <span>Discovered Patterns</span>
            <h2>{loading ? "..." : patterns.length}</h2>
          </div>
        </div>

        <div className="patterns-stat-card">
          <Route size={23} />
          <div>
            <span>Total Vehicle Transitions</span>
            <h2>{loading ? "..." : totalSupport}</h2>
          </div>
        </div>

        <div className="patterns-stat-card">
          <TrendingUp size={23} />
          <div>
            <span>Average Vehicle Support</span>
            <h2>{loading ? "..." : averageSupport}</h2>
          </div>
        </div>

      </div>

      {/* Pattern Table */}
      <div className="patterns-table-card">

        <div className="patterns-table-heading">
          <div>
            <h2>Discovered Routes</h2>
            <p>
              Recurring camera transitions identified by CityFlow.
            </p>
          </div>

          <div className="patterns-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search camera routes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <p className="patterns-message">
            Loading CityFlow patterns...
          </p>
        ) : error ? (
          <p className="patterns-error">{error}</p>
        ) : filteredPatterns.length === 0 ? (
          <p className="patterns-message">
            No recurring patterns found.
          </p>
        ) : (

          <div className="patterns-table-wrapper">
            <table className="patterns-table">

              <thead>
                <tr>
                  <th>Pattern ID</th>
                  <th>Camera Transition</th>
                  <th>Vehicle Support</th>
                  <th>Average Travel Time</th>
                  <th>Pattern Type</th>
                </tr>
              </thead>

              <tbody>
                {filteredPatterns.map((pattern, index) => (

                  <tr
                    key={`${pattern.from_camera}-${pattern.to_camera}`}
                  >
                    <td>#{index + 1}</td>

                    <td>
                      <div className="pattern-route">
                        <CarFront size={16} />
                        {pattern.from_camera}
                        {" → "}
                        {pattern.to_camera}
                      </div>
                    </td>

                    <td>
                      <span className="pattern-support">
                        {pattern.vehicle_count} vehicles
                      </span>
                    </td>

                    <td>
                      <div className="pattern-route">
                        <Clock size={15} />
                        {(Number(pattern.avg_travel_minutes) * 60).toFixed(1)}
                        {" sec"}
                      </div>
                    </td>

                    <td>{pattern.pattern_type}</td>
                  </tr>

                ))}
              </tbody>

            </table>
          </div>

        )}

      </div>

    </div>
  );
}

export default Patterns;
