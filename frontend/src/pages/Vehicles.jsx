
import { useEffect, useMemo, useState } from "react";
import API, {
  getCityFlowVehicles,
  getCityFlowVehicleDetections,
  getCityFlowMultiCameraTracking,
} from "../services/api";
import "./Vehicles.css";

// Camera IDs available in each CityFlowV2 training sequence.
const SEQUENCE_CAMERAS = {
  S01: ["c001", "c002", "c003", "c004", "c005"],
  S03: ["c010", "c011", "c012", "c013", "c014", "c015"],
  S04: Array.from({ length: 25 }, (_, index) => `c${String(index + 16).padStart(3, "0")}`),
};

export default function Vehicles() {
  // Video frame viewer
  const [currentFrame, setCurrentFrame] = useState(64);
  const [selectedCamera, setSelectedCamera] = useState("c016");
  const [filterVehicleId, setFilterVehicleId] = useState("");
  const [vehicleFrames, setVehicleFrames] = useState([]);
  const [framesLoading, setFramesLoading] = useState(false);
  const [framesError, setFramesError] = useState("");

  // Vehicle tracking
  const [sequence, setSequence] = useState("S04");
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [detections, setDetections] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  // Global timeline
  const [timeline, setTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState("");

  const availableCameras = SEQUENCE_CAMERAS[sequence] || [];

  // Keep the video viewer camera valid when the dataset sequence changes.
  useEffect(() => {
    setSelectedCamera(availableCameras[0] || "");
    setFilterVehicleId("");
    setCurrentFrame(1);
  }, [sequence]);

  // Load vehicle list
  useEffect(() => {
    let active = true;

    async function loadVehicles() {
      setLoading(true);
      setError("");
      setSelectedVehicle(null);
      setDetections([]);
      setTimeline(null);

      try {
        const response = await getCityFlowVehicles(sequence);

        if (active) {
          const list = response.data.vehicles || [];
          setVehicles(list);

          if (list.length > 0) {
            setSelectedVehicle(list[0]);
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.detail ||
              "Unable to load vehicles. Check backend connection."
          );
          setVehicles([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadVehicles();

    return () => {
      active = false;
    };
  }, [sequence]);

  // Load selected vehicle detection history
  useEffect(() => {
    if (!selectedVehicle) {
      setDetections([]);
      return;
    }

    let active = true;

    async function loadHistory() {
      setHistoryLoading(true);

      try {
        const response = await getCityFlowVehicleDetections(
          selectedVehicle.vehicle_token
        );

        if (active) {
          setDetections(response.data.detections || []);
        }
      } catch (err) {
        if (active) {
          setDetections([]);
          setError(
            err.response?.data?.detail ||
              "Unable to load vehicle detection history."
          );
        }
      } finally {
        if (active) setHistoryLoading(false);
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [selectedVehicle]);

  // Load available frames for selected GT vehicle ID
  useEffect(() => {
    let active = true;

    async function loadVehicleFrames() {
      const value = filterVehicleId.trim();

      if (!value) {
        setVehicleFrames([]);
        setFramesError("");
        setFramesLoading(false);
        return;
      }

      if (!/^\d+$/.test(value) || Number(value) < 1) {
        setVehicleFrames([]);
        setFramesError(
          "Enter a valid numeric ground-truth vehicle ID."
        );
        setFramesLoading(false);
        return;
      }

      setFramesLoading(true);
      setFramesError("");
      setVehicleFrames([]);

      try {
        const response = await API.get("/cityflow/vehicle-frames", {
          params: {
            sequence,
            camera: selectedCamera,
            vehicle_id: Number(value),
          },
        });

        if (!active) return;

        const frames = response.data.frames || [];
        setVehicleFrames(frames);

        if (frames.length > 0) {
          setCurrentFrame(frames[0]);
        } else {
          setFramesError(
            "No detections found for this vehicle in the selected camera."
          );
        }
      } catch (err) {
        if (active) {
          setVehicleFrames([]);
          setFramesError(
            err.response?.data?.detail ||
              "Unable to load vehicle frames."
          );
        }
      } finally {
        if (active) setFramesLoading(false);
      }
    }

    loadVehicleFrames();

    return () => {
      active = false;
    };
  }, [sequence, selectedCamera, filterVehicleId]);

  // Load global multi-camera tracking timeline
  useEffect(() => {
    let active = true;

    async function loadTimeline() {
      if (!selectedVehicle) {
        setTimeline(null);
        setTimelineError("");
        return;
      }

      setTimelineLoading(true);
      setTimelineError("");
      setTimeline(null);

      try {
        const response = await getCityFlowMultiCameraTracking(
          selectedVehicle.vehicle_token,
          sequence
        );

        if (active) {
          setTimeline(response.data);
        }
      } catch (err) {
        if (active) {
          setTimeline(null);
          setTimelineError(
            err.response?.data?.detail ||
              "Unable to load global vehicle timeline."
          );
        }
      } finally {
        if (active) {
          setTimelineLoading(false);
        }
      }
    }

    loadTimeline();

    return () => {
      active = false;
    };
  }, [selectedVehicle, sequence]);

  // Search vehicle list
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) =>
      vehicle.vehicle_token
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [vehicles, search]);

  // Dashboard calculations
  const totalDetections = vehicles.reduce(
    (sum, vehicle) => sum + vehicle.detection_count,
    0
  );

  const averageCameras = vehicles.length
    ? (
        vehicles.reduce(
          (sum, vehicle) => sum + vehicle.camera_count,
          0
        ) / vehicles.length
      ).toFixed(1)
    : "0";

  // Frame navigation
  const currentDetectionIndex = vehicleFrames.indexOf(currentFrame);

  const goToPreviousFrame = () => {
    if (currentDetectionIndex > 0) {
      setCurrentFrame(
        vehicleFrames[currentDetectionIndex - 1]
      );
    }
  };

  const goToNextFrame = () => {
    if (
      currentDetectionIndex >= 0 &&
      currentDetectionIndex < vehicleFrames.length - 1
    ) {
      setCurrentFrame(
        vehicleFrames[currentDetectionIndex + 1]
      );
    }
  };

  // Frame image URL
  const frameImageUrl =
    `${API.defaults.baseURL}/cityflow/frame` +
    `?sequence=${encodeURIComponent(sequence)}` +
    `&camera=${encodeURIComponent(selectedCamera)}` +
    `&frame_number=${currentFrame}` +
    (filterVehicleId
      ? `&vehicle_id=${encodeURIComponent(filterVehicleId)}`
      : "");

  // Timeline scale
  const timelineVisits = timeline?.camera_visits || [];

  const validTimelineVisits = timelineVisits.filter(
    (visit) =>
      visit.global_first_timestamp_seconds !== null &&
      visit.global_last_timestamp_seconds !== null
  );

  const timelineMin = validTimelineVisits.length
    ? Math.min(
        ...validTimelineVisits.map(
          (visit) => visit.global_first_timestamp_seconds
        )
      )
    : 0;

  const timelineMax = validTimelineVisits.length
    ? Math.max(
        ...validTimelineVisits.map(
          (visit) => visit.global_last_timestamp_seconds
        )
      )
    : 1;

  const timelineRange = Math.max(
    timelineMax - timelineMin,
    1
  );

  return (
    <div className="vehicles-page">
      {/* Page Header */}
      <div className="vehicles-header">
        <div>
          <p className="vehicles-eyebrow">
            TRAFFIC INTELLIGENCE / TRACKING
          </p>

          <h1>Vehicle Tracking</h1>

          <p className="vehicles-subtitle">
            Explore vehicle identities and their multi-camera
            detection history.
          </p>
        </div>

        <div className="sequence-control">
          <label htmlFor="sequence">
            Dataset Sequence
          </label>

          <select
            id="sequence"
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
          >
            <option value="S01">S01</option>
            <option value="S03">S03</option>
            <option value="S04">S04</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="vehicle-error">{error}</div>
      )}

      {/* Vehicle Statistics */}
      <div className="vehicle-stats">
        <div className="vehicle-stat-card">
          <span>Total Vehicles</span>
          <strong>{loading ? "..." : vehicles.length}</strong>
          <small>Unique vehicle identities</small>
        </div>

        <div className="vehicle-stat-card">
          <span>Total Detections</span>
          <strong>
            {loading
              ? "..."
              : totalDetections.toLocaleString("en-IN")}
          </strong>
          <small>Recorded bounding-box observations</small>
        </div>

        <div className="vehicle-stat-card">
          <span>Average Cameras</span>
          <strong>{loading ? "..." : averageCameras}</strong>
          <small>Per vehicle identity</small>
        </div>

        <div className="vehicle-stat-card">
          <span>Selected Vehicle</span>
          <strong className="selected-stat">
            {selectedVehicle?.vehicle_token || "--"}
          </strong>
          <small>Currently inspected identity</small>
        </div>
      </div>

      {/* Multi-camera Video Viewer */}
      <section className="frame-viewer-panel">
        <div className="frame-viewer-header">
          <div>
            <h2>Multi-Camera Video Visualization</h2>
            <p>
              Ground-truth vehicle detection and automatic
              frame navigation
            </p>
          </div>

          <span className="frame-status">
            VIDEO CONNECTED
          </span>
        </div>

        <div className="frame-controls">
          <div>
            <label htmlFor="camera-select">Camera</label>

            <select
              id="camera-select"
              value={selectedCamera}
              onChange={(e) =>
                setSelectedCamera(e.target.value)
              }
            >
              {availableCameras.map((camera) => (
                <option key={camera} value={camera}>
                  Camera {camera}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="vehicle-id-filter">
              Vehicle ID filter (GT numeric ID)
            </label>

            <input
              id="vehicle-id-filter"
              type="number"
              min="1"
              placeholder="All vehicles"
              value={filterVehicleId}
              onChange={(e) =>
                setFilterVehicleId(e.target.value)
              }
            />
          </div>
        </div>

        <div className="frame-image-container">
          <img
            key={frameImageUrl}
            src={frameImageUrl}
            alt={`Annotated ${selectedCamera} frame ${currentFrame}`}
          />
        </div>

        {/* Frame Navigation */}
        <div className="frame-navigation">
          {filterVehicleId.trim() ? (
            <>
              <button
                onClick={goToPreviousFrame}
                disabled={
                  framesLoading ||
                  vehicleFrames.length === 0 ||
                  currentDetectionIndex <= 0
                }
              >
                Previous Detection
              </button>

              <div className="frame-slider">
                {framesLoading ? (
                  <label>Loading vehicle frames...</label>
                ) : vehicleFrames.length > 0 ? (
                  <>
                    <label>
                      Detection {currentDetectionIndex + 1} /{" "}
                      {vehicleFrames.length} | Frame {currentFrame}
                    </label>

                    <input
                      type="range"
                      min="0"
                      max={vehicleFrames.length - 1}
                      step="1"
                      value={Math.max(0, currentDetectionIndex)}
                      onChange={(e) =>
                        setCurrentFrame(
                          vehicleFrames[Number(e.target.value)]
                        )
                      }
                    />
                  </>
                ) : (
                  <label>
                    {framesError || "No vehicle frames available."}
                  </label>
                )}
              </div>

              <button
                onClick={goToNextFrame}
                disabled={
                  framesLoading ||
                  vehicleFrames.length === 0 ||
                  currentDetectionIndex < 0 ||
                  currentDetectionIndex >= vehicleFrames.length - 1
                }
              >
                Next Detection
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() =>
                  setCurrentFrame((frame) =>
                    Math.max(1, frame - 1)
                  )
                }
                disabled={currentFrame <= 1}
              >
                Previous
              </button>

              <div className="frame-slider">
                <label>Frame {currentFrame} / 310</label>

                <input
                  type="range"
                  min="1"
                  max="310"
                  value={currentFrame}
                  onChange={(e) =>
                    setCurrentFrame(Number(e.target.value))
                  }
                />
              </div>

              <button
                onClick={() =>
                  setCurrentFrame((frame) =>
                    Math.min(310, frame + 1)
                  )
                }
                disabled={currentFrame >= 310}
              >
                Next
              </button>
            </>
          )}
        </div>

        {filterVehicleId.trim() &&
          !framesLoading &&
          framesError && (
            <div className="vehicle-message">
              {framesError}
            </div>
          )}

        {filterVehicleId.trim() &&
          !framesLoading &&
          vehicleFrames.length > 0 && (
            <p className="vehicle-data-note">
              {vehicleFrames.length} detected frames available
              for GT Vehicle ID {filterVehicleId} in camera{" "}
              {selectedCamera}.
            </p>
          )}
      </section>

      {/* Global Multi-Camera Timeline */}
      <section
        className="vehicle-panel global-timeline-panel"
        style={{ marginBottom: "24px" }}
      >
        <div className="vehicle-panel-header">
          <div>
            <h2>Global Multi-Camera Timeline</h2>
            <p>
              Chronological vehicle detection intervals
              across cameras
            </p>
          </div>

          <span className="vehicle-live-label">
            GLOBAL TRACKING
          </span>
        </div>

        {!selectedVehicle ? (
          <div className="vehicle-message">
            Select a vehicle to view its global timeline.
          </div>
        ) : timelineLoading ? (
          <div className="vehicle-message">
            Loading global timeline...
          </div>
        ) : timelineError ? (
          <div className="vehicle-message">
            {timelineError}
          </div>
        ) : timelineVisits.length > 0 ? (
          <>
            <div className="vehicle-detail-stats">
              <div>
                <span>Total Detections</span>
                <strong>
                  {timeline.total_detections}
                </strong>
              </div>

              <div>
                <span>Total Cameras</span>
                <strong>{timeline.total_cameras}</strong>
              </div>

              <div>
                <span>Vehicle Identity</span>
                <strong>{timeline.vehicle_token}</strong>
              </div>
            </div>

            <div style={{ padding: "20px 0" }}>
              {timelineVisits.map((visit) => {
                const start =
                  visit.global_first_timestamp_seconds;

                const end =
                  visit.global_last_timestamp_seconds;

                const hasGlobalTime =
                  start !== null && end !== null;

                const left = hasGlobalTime
                  ? ((start - timelineMin) / timelineRange) * 100
                  : 0;

                const width = hasGlobalTime
                  ? Math.max(
                      ((end - start) / timelineRange) * 100,
                      0.5
                    )
                  : 0;

                return (
                  <div
                    key={visit.camera_id}
                    style={{
                      marginBottom: "24px",
                      padding: "16px",
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "8px",
                        marginBottom: "12px",
                      }}
                    >
                      <strong>
                        {visit.camera_order}. {visit.camera_id}
                      </strong>

                      <span>
                        {hasGlobalTime
                          ? `${start.toFixed(3)}s – ${end.toFixed(3)}s`
                          : "Global time unavailable"}
                      </span>
                    </div>

                    {/* Shared global time axis */}
                    <div
                      style={{
                        position: "relative",
                        height: "14px",
                        background: "rgba(255,255,255,0.10)",
                        borderRadius: "20px",
                        overflow: "hidden",
                      }}
                    >
                      {hasGlobalTime && (
                        <div
                          title={`${start.toFixed(3)}s - ${end.toFixed(3)}s`}
                          style={{
                            position: "absolute",
                            left: `${left}%`,
                            width: `${Math.min(width, 100 - left)}%`,
                            minWidth: "4px",
                            height: "100%",
                            background: "#16B8D4",
                            borderRadius: "20px",
                          }}
                        />
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "16px",
                        marginTop: "12px",
                        fontSize: "13px",
                        color: "#9CA3AF",
                      }}
                    >
                      <span>
                        Detections: {visit.total_detections}
                      </span>

                      <span>
                        Frames: {visit.first_frame}–
                        {visit.last_frame}
                      </span>

                      {visit.gap_from_previous_seconds !== null && (
                        <span>
                          Gap: {visit.gap_from_previous_seconds}s
                        </span>
                      )}

                      {visit.overlap_with_previous_seconds > 0 && (
                        <span>
                          Overlap:{" "}
                          {visit.overlap_with_previous_seconds}s
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "8px",
                color: "#9CA3AF",
                fontSize: "12px",
              }}
            >
              <span>
                Timeline start: {timelineMin.toFixed(3)}s
              </span>

              <span>
                Timeline end: {timelineMax.toFixed(3)}s
              </span>
            </div>

            <p className="vehicle-data-note">
              Global timestamps use camera start offsets.
              Overlapping detection intervals do not prove
              simultaneous physical presence or confirmed road
              transitions. Global timestamps are currently
              configured for S04.
            </p>
          </>
        ) : (
          <div className="vehicle-message">
            No global timeline data available.
          </div>
        )}
      </section>

      {/* Vehicle List and Intelligence */}
      <div className="vehicle-content">
        <section className="vehicle-panel vehicle-list-panel">
          <div className="vehicle-panel-header">
            <div>
              <h2>Detected Vehicles</h2>
              <p>{filteredVehicles.length} vehicles found</p>
            </div>

            <span className="vehicle-live-label">
              DATASET
            </span>
          </div>

          <input
            className="vehicle-search"
            type="text"
            placeholder="Search vehicle ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <div className="vehicle-message">
              Loading vehicles...
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="vehicle-message">
              No vehicles found.
            </div>
          ) : (
            <div className="vehicle-table-wrapper">
              <table className="vehicle-table">
                <thead>
                  <tr>
                    <th>Vehicle ID</th>
                    <th>Detections</th>
                    <th>Cameras</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredVehicles.map((vehicle) => (
                    <tr
                      key={vehicle.vehicle_token}
                      className={
                        selectedVehicle?.vehicle_token ===
                        vehicle.vehicle_token
                          ? "vehicle-selected"
                          : ""
                      }
                      onClick={() => setSelectedVehicle(vehicle)}
                    >
                      <td>
                        <strong>{vehicle.vehicle_token}</strong>
                      </td>

                      <td>
                        {vehicle.detection_count.toLocaleString(
                          "en-IN"
                        )}
                      </td>

                      <td>{vehicle.camera_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="vehicle-panel vehicle-detail-panel">
          <div className="vehicle-panel-header">
            <div>
              <h2>Vehicle Intelligence</h2>
              <p>Selected vehicle detection history</p>
            </div>

            <span className="vehicle-id-badge">
              {selectedVehicle?.vehicle_token || "NO SELECTION"}
            </span>
          </div>

          {selectedVehicle && (
            <>
              <div className="vehicle-detail-stats">
                <div>
                  <span>Total Detections</span>
                  <strong>
                    {selectedVehicle.detection_count.toLocaleString(
                      "en-IN"
                    )}
                  </strong>
                </div>

                <div>
                  <span>Unique Cameras</span>
                  <strong>
                    {selectedVehicle.camera_count}
                  </strong>
                </div>

                <div>
                  <span>History Records</span>
                  <strong>{detections.length}</strong>
                </div>
              </div>

              <div className="detection-heading">
                <h3>Detection Timeline</h3>
                <span>Camera-wise observations</span>
              </div>

              {historyLoading ? (
                <div className="vehicle-message">
                  Loading detection history...
                </div>
              ) : detections.length === 0 ? (
                <div className="vehicle-message">
                  No detection history available.
                </div>
              ) : (
                <div className="detection-list">
                  {detections.map((detection, index) => (
                    <div
                      className="detection-item"
                      key={`${detection.camera_id}-${detection.frame_number}-${index}`}
                    >
                      <div className="detection-marker">
                        <span />
                      </div>

                      <div className="detection-info">
                        <div className="detection-topline">
                          <strong>
                            {detection.camera_id}
                          </strong>

                          <span>
                            Frame #
                            {detection.frame_number.toLocaleString(
                              "en-IN"
                            )}
                          </span>
                        </div>

                        <p>
                          Timestamp:{" "}
                          {Number(
                            detection.timestamp_seconds
                          ).toFixed(2)}{" "}
                          sec
                        </p>

                        <div className="detection-meta">
                          <span>
                            Bounding Box:{" "}
                            {detection.bounding_box.x},{" "}
                            {detection.bounding_box.y},{" "}
                            {detection.bounding_box.width},{" "}
                            {detection.bounding_box.height}
                          </span>

                          <span>
                            Confidence:{" "}
                            {(
                              detection.confidence * 100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!selectedVehicle && !loading && (
            <div className="vehicle-message">
              Select a vehicle to inspect its detection history.
            </div>
          )}
        </section>
      </div>

      <p className="vehicle-data-note">
        Analytics are based on CityFlowV2 ground-truth vehicle
        identities and bounding-box annotations. This page does
        not represent live CCTV recognition.
      </p>
    </div>
  );
}
