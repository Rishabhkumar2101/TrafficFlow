
import { useEffect, useMemo, useState } from "react";
import {
  Route,
  CarFront,
  MapPin,
  Clock,
  Gauge,
  RefreshCw,
  Search,
  ArrowRight,
} from "lucide-react";

import { getTrajectories } from "../services/api";

function Trajectories() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTrajectories() {
    try {
      setLoading(true);
      setError("");

      const response = await getTrajectories();

      setRecords(response.data.trajectories || []);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
        "Unable to load trajectory data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrajectories();
  }, []);

  const vehicles = [
    ...new Set(records.map((item) => item.vehicle_token)),
  ];

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const matchesVehicle =
        selectedVehicle === "ALL" ||
        item.vehicle_token === selectedVehicle;

      const matchesSearch =
        item.vehicle_token.toLowerCase().includes(search.toLowerCase()) ||
        item.from_camera.toLowerCase().includes(search.toLowerCase()) ||
        item.to_camera.toLowerCase().includes(search.toLowerCase());

      return matchesVehicle && matchesSearch;
    });
  }, [records, selectedVehicle, search]);

  const average = (key) => {
    const values = records
      .map((item) => Number(item[key]))
      .filter(Number.isFinite);

    if (!values.length) return "0.00";

    return (
      values.reduce((sum, value) => sum + value, 0) /
      values.length
    ).toFixed(2);
  };

  if (loading) {
    return <div className="trajectory-message">Loading trajectories...</div>;
  }

  if (error) {
    return (
      <div className="trajectory-message">
        <p>{error}</p>
        <button className="trajectory-refresh" onClick={loadTrajectories}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="trajectories-page">

      <div className="trajectory-heading">
        <div>
          <h1>Vehicle Trajectory Analytics</h1>
          <p>
            Analyze vehicle movement between connected city cameras.
          </p>
        </div>

        <button
          className="trajectory-refresh"
          onClick={loadTrajectories}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}

      <div className="trajectory-stats">

        <div className="trajectory-stat-card">
          <Route />
          <span>Total Transitions</span>
          <h2>{records.length}</h2>
        </div>

        <div className="trajectory-stat-card">
          <MapPin />
          <span>Average Distance</span>
          <h2>{average("distance_km")} <small>km</small></h2>
        </div>

        <div className="trajectory-stat-card">
          <Clock />
          <span>Average Travel Time</span>
          <h2>{average("travel_time_minutes")} <small>min</small></h2>
        </div>

        <div className="trajectory-stat-card">
          <Gauge />
          <span>Average Speed</span>
          <h2>{average("speed_kmh")} <small>km/h</small></h2>
        </div>

      </div>

      {/* Filters */}

      <div className="trajectory-panel">

        <div className="trajectory-filter-heading">
          <h2>Movement Records</h2>

          <span className="trajectory-count">
            {filteredRecords.length} records
          </span>
        </div>

        <div className="trajectory-filters">

          <div className="trajectory-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search vehicle or camera..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
          >
            <option value="ALL">All Vehicles</option>

            {vehicles.map((vehicle) => (
              <option key={vehicle} value={vehicle}>
                {vehicle}
              </option>
            ))}
          </select>

        </div>

        {/* Trajectory table */}

        <div className="trajectory-table-wrapper">

          <table className="trajectory-table">

            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Movement</th>
                <th>Distance</th>
                <th>Travel Time</th>
                <th>Speed</th>
                <th>Start Time</th>
              </tr>
            </thead>

            <tbody>

              {filteredRecords.map((item, index) => (

                <tr key={`${item.vehicle_token}-${index}`}>

                  <td>
                    <span className="trajectory-vehicle">
                      <CarFront size={16} />
                      {item.vehicle_token}
                    </span>
                  </td>

                  <td>
                    <span className="trajectory-route">
                      {item.from_camera}
                      <ArrowRight size={14} />
                      {item.to_camera}
                    </span>
                  </td>

                  <td>
                    {Number(item.distance_km).toFixed(3)} km
                  </td>

                  <td>
                    {Number(item.travel_time_minutes).toFixed(2)} min
                  </td>

                  <td>
                    {Number(item.speed_kmh).toFixed(2)} km/h
                  </td>

                  <td>
                    {new Date(item.start_time).toLocaleString()}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          {filteredRecords.length === 0 && (
            <div className="trajectory-empty">
              No trajectory records found.
            </div>
          )}

        </div>

      </div>

      {/* Individual movement cards */}

      <div className="trajectory-panel">

        <h2>Vehicle Movement Timeline</h2>

        <div className="trajectory-cards">

          {filteredRecords.map((item, index) => (

            <div
              className="trajectory-movement-card"
              key={`card-${item.vehicle_token}-${index}`}
            >

              <div className="trajectory-card-top">
                <span>
                  <CarFront size={17} />
                  {item.vehicle_token}
                </span>

                <small>Transition {index + 1}</small>
              </div>

              <div className="trajectory-card-route">
                <div>
                  <small>FROM</small>
                  <strong>{item.from_camera}</strong>
                </div>

                <ArrowRight size={22} />

                <div>
                  <small>TO</small>
                  <strong>{item.to_camera}</strong>
                </div>
              </div>

              <div className="trajectory-card-metrics">
                <span>
                  <MapPin size={14} />
                  {Number(item.distance_km).toFixed(3)} km
                </span>

                <span>
                  <Clock size={14} />
                  {Number(item.travel_time_minutes).toFixed(2)} min
                </span>

                <span>
                  <Gauge size={14} />
                  {Number(item.speed_kmh).toFixed(2)} km/h
                </span>
              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}

export default Trajectories;
