
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: 10000,
});

// Existing APIs
export const getDatabaseSummary = () =>
  API.get("/database-summary");

export const getDataset = () =>
  API.get("/dataset");

export const getVehicles = () =>
  API.get("/vehicles");

export const getTrajectories = () =>
  API.get("/trajectories");

export const getPatterns = () =>
  API.get("/patterns");

export const getCameraNetwork = () =>
  API.get("/camera-network");

export const getHealth = () =>
  API.get("/health");

// CityFlow Camera Network API
export const getCityFlowCameraNetwork = (sequence = "S04") =>
  API.get(`/cityflow/camera-network?sequence=${sequence}`);

// CityFlow Recurring Patterns API
export const getCityFlowRecurringPatterns = (
  sequence = "S04",
  minSupport = 2
) =>
  API.get(
    `/cityflow/recurring-patterns?sequence=${sequence}&min_support=${minSupport}`
  );

// CityFlow Anomaly Detection API
export const getCityFlowAnomalies = (sequence = "S04") =>
  API.get(`/cityflow/anomalies?sequence=${sequence}`);

// CityFlow Vehicle List API
export const getCityFlowVehicles = (sequence = "S04") =>
  API.get(`/cityflow/vehicles?sequence=${sequence}`);

// CityFlow Vehicle Detection History API
export const getCityFlowVehicleDetections = (vehicleToken) =>
  API.get(
    `/cityflow/vehicles/${encodeURIComponent(vehicleToken)}/detections`
  );

export default API;


export const getCityFlowMultiCameraTracking = (
  vehicleToken,
  sequence = "S04"
) =>
  API.get(
    `/cityflow/multi-camera-tracking/${encodeURIComponent(vehicleToken)}`,
    { params: { sequence } }
  );