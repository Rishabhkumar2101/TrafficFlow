
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from app.database import SessionLocal
from app.db_models import VehicleTrajectory
from statistics import median
from app.db_models import CityFlowDetection
import csv
import cv2

from pathlib import Path
from fastapi import HTTPException
from fastapi.responses import Response




from app.database import get_db, test_connection
from app.db_models import (
    CameraDetection,
    VehicleTrajectory,
    RecurringPattern,
    CameraConnection
)

from app.models import (
    discover_recurring_patterns,
    build_camera_network,
    build_vehicle_trajectories,
    cluster_vehicle_movements,
    get_trajectory_summary
)

from app.utils import (
    load_camera_data,
    preprocess_data,
    get_dataset_summary
)


app = FastAPI(
    title="TrafficFlow API",
    description="AI-Based Multi-Camera Vehicle Movement Pattern Discovery System",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Load and process original dataset
def get_processed_data():

    try:
        raw_data = load_camera_data()
        return preprocess_data(raw_data)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# Home endpoint
@app.get("/")
def home():

    return {
        "message": "Welcome to TrafficFlow API",
        "status": "Running",
        "version": "1.1.0"
    }


# Database health check
@app.get("/health")
def health(db: Session = Depends(get_db)):

    try:
        db.execute(__import__("sqlalchemy").text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected",
            "service": "TrafficFlow"
        }

    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Database connection failed: {str(e)}"
        )


# Dataset endpoint - PostgreSQL
@app.get("/dataset")
def dataset(db: Session = Depends(get_db)):

    detections = db.query(CameraDetection).order_by(
        CameraDetection.timestamp
    ).all()

    records = [
        {
            "vehicle_token": d.vehicle_token,
            "camera_id": d.camera_id,
            "timestamp": str(d.timestamp),
            "latitude": d.latitude,
            "longitude": d.longitude
        }
        for d in detections
    ]

    return {
        "data": records,
        "summary": {
            "total_detections": len(records),
            "unique_vehicles": len(set(d.vehicle_token for d in detections)),
            "unique_cameras": len(set(d.camera_id for d in detections))
        }
    }


# Vehicles endpoint - PostgreSQL
@app.get("/vehicles")
def vehicles(db: Session = Depends(get_db)):

    vehicle_ids = db.query(
        CameraDetection.vehicle_token
    ).distinct().all()

    ids = [row[0] for row in vehicle_ids]

    return {
        "total_vehicles": len(ids),
        "vehicles": ids
    }


# Trajectory endpoint - PostgreSQL
@app.get("/trajectories")
def trajectories(db: Session = Depends(get_db)):

    records = db.query(VehicleTrajectory).all()

    result = [
        {
            "vehicle_token": r.vehicle_token,
            "from_camera": r.from_camera,
            "to_camera": r.to_camera,
            "start_time": str(r.start_time),
            "end_time": str(r.end_time),
            "distance_km": r.distance_km,
            "travel_time_minutes": r.travel_time_minutes,
            "speed_kmh": r.speed_kmh
        }
        for r in records
    ]

    return {
        "total_transitions": len(result),
        "trajectories": result
    }


# Clustering endpoint - calculated from database trajectories
@app.get("/clusters")
def clusters(db: Session = Depends(get_db)):

    records = db.query(VehicleTrajectory).all()

    if not records:
        return {
            "total_transitions": 0,
            "clusters": []
        }

    import pandas as pd

    df = pd.DataFrame([
        {
            "vehicle_token": r.vehicle_token,
            "from_camera": r.from_camera,
            "to_camera": r.to_camera,
            "start_time": r.start_time,
            "end_time": r.end_time,
            "distance_km": r.distance_km,
            "travel_time_minutes": r.travel_time_minutes,
            "speed_kmh": r.speed_kmh
        }
        for r in records
    ])

    clustered_data = cluster_vehicle_movements(df)

    return {
        "total_transitions": len(clustered_data),
        "clusters": clustered_data.astype(str).to_dict(
            orient="records"
        )
    }


# Recurring movement patterns - PostgreSQL
@app.get("/patterns")
def recurring_patterns(db: Session = Depends(get_db)):

    records = db.query(RecurringPattern).all()

    patterns = [
        {
            "route": r.route,
            "route_string": r.route_string,
            "support_count": r.support_count,
            "vehicles": r.vehicles
        }
        for r in records
    ]

    return {
        "total_patterns": len(patterns),
        "min_support": 2,
        "patterns": patterns
    }


# City-wide camera network - PostgreSQL
@app.get("/camera-network")
def camera_network(db: Session = Depends(get_db)):

    detections = db.query(CameraDetection).all()
    connections = db.query(CameraConnection).all()

    nodes = {}

    for d in detections:
        if d.camera_id not in nodes:
            nodes[d.camera_id] = {
                "id": d.camera_id,
                "detection_count": 0,
                "latitude": d.latitude,
                "longitude": d.longitude
            }

        nodes[d.camera_id]["detection_count"] += 1

    edges = [
        {
            "source": c.source_camera,
            "target": c.target_camera,
            "weight": c.weight,
            "total_traversals": c.total_traversals,
            "average_distance_km": c.average_distance_km,
            "average_travel_time_minutes": c.average_travel_time_minutes
        }
        for c in connections
    ]

    return {
        "total_cameras": len(nodes),
        "total_connections": len(edges),
        "nodes": list(nodes.values()),
        "edges": edges
    }


# Dataset summary endpoint
@app.get("/database-summary")
def database_summary(db: Session = Depends(get_db)):

    return {
        "total_detections": db.query(CameraDetection).count(),
        "total_trajectories": db.query(VehicleTrajectory).count(),
        "total_patterns": db.query(RecurringPattern).count(),
        "total_camera_connections": db.query(CameraConnection).count()
    }

@app.get("/cityflow/camera-network")
def get_cityflow_camera_network(sequence: str = "S04"):

    db = SessionLocal()

    try:
        results = (
            db.query(
                VehicleTrajectory.from_camera,
                VehicleTrajectory.to_camera,
                func.count().label("vehicle_count"),
                func.avg(
                    VehicleTrajectory.travel_time_minutes
                ).label("avg_travel_minutes")
            )
            .filter(
                VehicleTrajectory.vehicle_token.like(f"{sequence}_%"),
                VehicleTrajectory.travel_time_minutes >= 0.017
            )
            .group_by(
                VehicleTrajectory.from_camera,
                VehicleTrajectory.to_camera
            )
            .order_by(
                func.count().desc()
            )
            .all()
        )

        routes = []

        for row in results:
            routes.append({
                "from_camera": row.from_camera,
                "to_camera": row.to_camera,
                "vehicle_count": row.vehicle_count,
                "avg_travel_minutes": round(
                    float(row.avg_travel_minutes), 3
                )
            })

        return {
            "sequence": sequence,
            "total_routes": len(routes),
            "minimum_travel_seconds": 1,
            "routes": routes
        }

    finally:
        db.close()


@app.get("/cityflow/recurring-patterns")
def get_cityflow_recurring_patterns(
    sequence: str = "S04",
    min_support: int = 2
):
    db = SessionLocal()

    try:
        results = (
            db.query(
                VehicleTrajectory.from_camera,
                VehicleTrajectory.to_camera,
                func.count().label("vehicle_count"),
                func.avg(
                    VehicleTrajectory.travel_time_minutes
                ).label("avg_travel_minutes")
            )
            .filter(
                VehicleTrajectory.vehicle_token.like(
                    f"{sequence}_%"
                ),
                VehicleTrajectory.travel_time_minutes >= 0.017
            )
            .group_by(
                VehicleTrajectory.from_camera,
                VehicleTrajectory.to_camera
            )
            .having(func.count() >= min_support)
            .order_by(func.count().desc())
            .all()
        )

        patterns = []

        for row in results:
            patterns.append({
                "from_camera": row.from_camera,
                "to_camera": row.to_camera,
                "vehicle_count": row.vehicle_count,
                "avg_travel_minutes": round(
                    float(row.avg_travel_minutes), 3
                ),
                "pattern_type": "Recurring Camera Transition"
            })

        return {
            "sequence": sequence,
            "minimum_vehicle_support": min_support,
            "total_recurring_patterns": len(patterns),
            "patterns": patterns
        }

    finally:
        db.close()



@app.get("/cityflow/anomalies")
def detect_cityflow_anomalies(sequence: str = "S04"):

    db = SessionLocal()

    try:
        results = (
            db.query(
                VehicleTrajectory.from_camera,
                VehicleTrajectory.to_camera,
                func.count().label("vehicle_count"),
                func.avg(
                    VehicleTrajectory.travel_time_minutes
                ).label("avg_travel_minutes")
            )
            .filter(
                VehicleTrajectory.vehicle_token.like(
                    f"{sequence}_%"
                ),
                VehicleTrajectory.travel_time_minutes >= 0.017
            )
            .group_by(
                VehicleTrajectory.from_camera,
                VehicleTrajectory.to_camera
            )
            .all()
        )

        routes = []

        for row in results:
            routes.append({
                "from_camera": row.from_camera,
                "to_camera": row.to_camera,
                "vehicle_count": int(row.vehicle_count),
                "avg_travel_seconds": round(
                    float(row.avg_travel_minutes) * 60, 2
                )
            })

        if not routes:
            return {
                "sequence": sequence,
                "total_routes": 0,
                "total_anomalies": 0,
                "anomalies": []
            }

        # Calculate travel-time baseline
        travel_times = [
            route["avg_travel_seconds"] for route in routes
        ]

        baseline = median(travel_times)

        anomalies = []

        for route in routes:
            reasons = []

            # Low-frequency transition
            if route["vehicle_count"] == 1:
                reasons.append("Low frequency route")

            # Unusually high travel time
            if route["avg_travel_seconds"] > baseline * 2:
                reasons.append("Unusually high travel time")

            if reasons:
                anomalies.append({
                    **route,
                    "anomaly_reasons": reasons,
                    "baseline_travel_seconds": round(baseline, 2)
                })

        return {
            "sequence": sequence,
            "total_routes": len(routes),
            "total_anomalies": len(anomalies),
            "baseline_travel_seconds": round(baseline, 2),
            "detection_method": "Rule-based",
            "anomalies": anomalies
        }

    finally:
        db.close()
@app.get("/cityflow/anomalies")
def detect_cityflow_anomalies(sequence: str = "S04"):

    db = SessionLocal()

    try:
        results = (
            db.query(
                VehicleTrajectory.from_camera,
                VehicleTrajectory.to_camera,
                func.count().label("vehicle_count"),
                func.avg(
                    VehicleTrajectory.travel_time_minutes
                ).label("avg_travel_minutes")
            )
            .filter(
                VehicleTrajectory.vehicle_token.like(
                    f"{sequence}_%"
                ),
                VehicleTrajectory.travel_time_minutes >= 0.017
            )
            .group_by(
                VehicleTrajectory.from_camera,
                VehicleTrajectory.to_camera
            )
            .all()
        )

        travel_times = [
            float(row.avg_travel_minutes) * 60
            for row in results
        ]

        baseline = median(travel_times) if travel_times else 0

        anomalies = []

        for row in results:
            travel_seconds = float(row.avg_travel_minutes) * 60
            reasons = []

            if row.vehicle_count == 1:
                reasons.append("Low frequency route")

            if baseline > 0 and travel_seconds > baseline * 2:
                reasons.append("Unusually high travel time")

            if reasons:
                anomalies.append({
                    "from_camera": row.from_camera,
                    "to_camera": row.to_camera,
                    "vehicle_count": row.vehicle_count,
                    "avg_travel_seconds": round(travel_seconds, 2),
                    "anomaly_reasons": reasons
                })

        return {
            "sequence": sequence,
            "total_routes": len(results),
            "total_anomalies": len(anomalies),
            "baseline_travel_seconds": round(baseline, 2),
            "detection_method": "Rule-based",
            "anomalies": anomalies
        }

    finally:
        db.close()



@app.get("/cityflow/vehicles")
def get_cityflow_vehicles(sequence: str = "S04"):
    db = SessionLocal()

    try:
        results = (
            db.query(
                CityFlowDetection.vehicle_token,
                func.count(CityFlowDetection.id).label("detection_count"),
                func.count(
                    func.distinct(CityFlowDetection.camera_id)
                ).label("camera_count")
            )
            .filter(CityFlowDetection.sequence_id == sequence)
            .group_by(CityFlowDetection.vehicle_token)
            .order_by(CityFlowDetection.vehicle_token)
            .all()
        )

        return {
            "sequence": sequence,
            "total_vehicles": len(results),
            "vehicles": [
                {
                    "vehicle_token": row.vehicle_token,
                    "detection_count": row.detection_count,
                    "camera_count": row.camera_count
                }
                for row in results
            ]
        }

    finally:
        db.close()


@app.get("/cityflow/vehicles/{vehicle_token}/detections")
def get_cityflow_vehicle_detections(vehicle_token: str):

    db = SessionLocal()

    try:
        results = (
            db.query(CityFlowDetection)
            .filter(
                CityFlowDetection.vehicle_token == vehicle_token
            )
            .order_by(
                CityFlowDetection.timestamp_seconds,
                CityFlowDetection.frame_number
            )
            .all()
        )

        return {
            "vehicle_token": vehicle_token,
            "total_detections": len(results),
            "detections": [
                {
                    "camera_id": row.camera_id,
                    "sequence_id": row.sequence_id,
                    "frame_number": row.frame_number,
                    "timestamp_seconds": row.timestamp_seconds,
                    "bounding_box": {
                        "x": row.x,
                        "y": row.y,
                        "width": row.width,
                        "height": row.height
                    },
                    "confidence": row.confidence
                }
                for row in results
            ]
        }

    finally:
        db.close()



@app.get("/cityflow/vehicles")
def get_cityflow_vehicles(sequence: str = "S04"):
    db = SessionLocal()
    try:
        results = (
            db.query(
                CityFlowDetection.vehicle_token,
                func.count(CityFlowDetection.id).label("detection_count"),
                func.count(
                    func.distinct(CityFlowDetection.camera_id)
                ).label("camera_count")
            )
            .filter(CityFlowDetection.sequence_id == sequence)
            .group_by(CityFlowDetection.vehicle_token)
            .order_by(CityFlowDetection.vehicle_token)
            .all()
        )

        return {
            "sequence": sequence,
            "total_vehicles": len(results),
            "vehicles": [
                {
                    "vehicle_token": row.vehicle_token,
                    "detection_count": row.detection_count,
                    "camera_count": row.camera_count
                }
                for row in results
            ]
        }
    finally:
        db.close()


@app.get("/cityflow/vehicles/{vehicle_token}/detections")
def get_cityflow_vehicle_detections(vehicle_token: str):
    db = SessionLocal()
    try:
        results = (
            db.query(CityFlowDetection)
            .filter(
                CityFlowDetection.vehicle_token == vehicle_token
            )
            .order_by(
                CityFlowDetection.timestamp_seconds,
                CityFlowDetection.frame_number
            )
            .all()
        )

        return {
            "vehicle_token": vehicle_token,
            "total_detections": len(results),
            "detections": [
                {
                    "camera_id": row.camera_id,
                    "sequence_id": row.sequence_id,
                    "frame_number": row.frame_number,
                    "timestamp_seconds": row.timestamp_seconds,
                    "bounding_box": {
                        "x": row.x,
                        "y": row.y,
                        "width": row.width,
                        "height": row.height
                    },
                    "confidence": row.confidence
                }
                for row in results
            ]
        }
    finally:
        db.close()


@app.get("/cityflow/frame")
def get_cityflow_video_frame(
    sequence: str = "S04",
    camera: str = "c016",
    frame_number: int = 64,
    vehicle_id: int | None = None
):
    # Validate input
    if sequence not in ["S01", "S03", "S04"]:
        raise HTTPException(status_code=400, detail="Invalid sequence")

    if not camera.startswith("c") or not camera[1:].isdigit():
        raise HTTPException(status_code=400, detail="Invalid camera ID")

    if frame_number < 1:
        raise HTTPException(status_code=400, detail="Frame number must be positive")

    # Project root and dataset paths
    project_root = Path(__file__).resolve().parent.parent

    camera_dir = (
        project_root
        / "datasets"
        / "cityflowv2"
        / "train"
        / sequence
        / camera
    )

    video_path = camera_dir / "vdo.avi"
    gt_path = camera_dir / "gt" / "gt.txt"

    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found")

    if not gt_path.exists():
        raise HTTPException(status_code=404, detail="Ground-truth file not found")

    # Open video
    video = cv2.VideoCapture(str(video_path))

    if not video.isOpened():
        raise HTTPException(status_code=500, detail="Could not open video")

    total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))

    if frame_number > total_frames:
        video.release()
        raise HTTPException(
            status_code=400,
            detail=f"Frame out of range. Total frames: {total_frames}"
        )

    # OpenCV frame index starts at 0
    video.set(cv2.CAP_PROP_POS_FRAMES, frame_number - 1)

    success, image = video.read()
    video.release()

    if not success:
        raise HTTPException(status_code=500, detail="Could not read video frame")

    # Read ground-truth annotations
    vehicle_count = 0

    with open(gt_path, "r", newline="") as file:
        reader = csv.reader(file)

        for row in reader:
            if len(row) < 6:
                continue

            try:
                annotation_frame = int(float(row[0]))
                annotation_vehicle = int(float(row[1]))

                x = int(float(row[2]))
                y = int(float(row[3]))
                width = int(float(row[4]))
                height = int(float(row[5]))

            except (ValueError, IndexError):
                continue

            if annotation_frame != frame_number:
                continue

            if vehicle_id is not None and annotation_vehicle != vehicle_id:
                continue

            x1 = max(0, x)
            y1 = max(0, y)
            x2 = min(image.shape[1] - 1, x + width)
            y2 = min(image.shape[0] - 1, y + height)

            if x2 <= x1 or y2 <= y1:
                continue

            # Draw bounding box
            cv2.rectangle(
                image,
                (x1, y1),
                (x2, y2),
                (0, 255, 0),
                2
            )

            # Draw vehicle ID
            label = f"Vehicle ID: {annotation_vehicle}"

            cv2.putText(
                image,
                label,
                (x1, max(25, y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0),
                2
            )

            vehicle_count += 1

    # Add camera and frame information
    cv2.putText(
        image,
        f"TrafficFlow | {sequence}_{camera} | Frame {frame_number}",
        (20, 35),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 255),
        2
    )

    # Encode image as JPEG
    success, encoded_image = cv2.imencode(".jpg", image)

    if not success:
        raise HTTPException(status_code=500, detail="Image encoding failed")

    return Response(
        content=encoded_image.tobytes(),
        media_type="image/jpeg",
        headers={
            "X-Frame-Number": str(frame_number),
            "X-Vehicle-Count": str(vehicle_count),
            "X-Sequence": sequence,
            "X-Camera": camera
        }
    )


@app.get("/cityflow/vehicle-frames")
def get_vehicle_frames(
    sequence: str = "S04",
    camera: str = "c016",
    vehicle_id: int = 324
):
    if sequence not in ["S01", "S03", "S04"]:
        raise HTTPException(status_code=400, detail="Invalid sequence")

    if not camera.startswith("c") or not camera[1:].isdigit():
        raise HTTPException(status_code=400, detail="Invalid camera ID")

    if vehicle_id < 1:
        raise HTTPException(status_code=400, detail="Invalid vehicle ID")

    project_root = Path(__file__).resolve().parent.parent

    gt_path = (
        project_root
        / "datasets"
        / "cityflowv2"
        / "train"
        / sequence
        / camera
        / "gt"
        / "gt.txt"
    )

    if not gt_path.exists():
        raise HTTPException(status_code=404, detail="Annotation file not found")

    frames = []

    with open(gt_path, "r", newline="") as file:
        reader = csv.reader(file)

        for row in reader:
            if len(row) < 6:
                continue

            try:
                frame_number = int(float(row[0]))
                current_vehicle_id = int(float(row[1]))
            except (ValueError, IndexError):
                continue

            if current_vehicle_id == vehicle_id:
                frames.append(frame_number)

    frames = sorted(set(frames))

    return {
        "sequence": sequence,
        "camera": camera,
        "vehicle_id": vehicle_id,
        "total_frames": len(frames),
        "frames": frames
    }


# S04 camera video start offsets (seconds)
CAMERA_OFFSETS = {
    "S01": {
        "c001": 0.000,
        "c002": 1.640,
        "c003": 2.049,
        "c004": 2.177,
        "c005": 2.235,
    },

    "S03": {
        "c010": 8.715,
        "c011": 8.457,
        "c012": 5.879,
        "c013": 0.000,
        "c014": 5.042,
        "c015": 8.492,
    },

    "S04": {
        "c016": 0.000,
        "c017": 14.318,
        "c018": 29.955,
        "c019": 26.979,
        "c020": 25.905,
        "c021": 39.973,
        "c022": 49.422,
        "c023": 45.716,
        "c024": 50.853,
        "c025": 50.263,
        "c026": 70.450,
        "c027": 85.097,
        "c028": 100.110,
        "c029": 125.788,
        "c030": 124.319,
        "c031": 125.033,
        "c032": 125.199,
        "c033": 150.893,
        "c034": 140.218,
        "c035": 165.568,
        "c036": 170.797,
        "c037": 170.567,
        "c038": 175.426,
        "c039": 175.644,
        "c040": 175.838,
    }
}

@app.get("/cityflow/multi-camera-tracking/{vehicle_token}")
def track_vehicle_across_cameras(
    vehicle_token: str,
    sequence: str = "S04"
):
    db = SessionLocal()

    try:
        detections = (
            db.query(CityFlowDetection)
            .filter(
                CityFlowDetection.vehicle_token == vehicle_token,
                CityFlowDetection.sequence_id == sequence
            )
            .order_by(
                CityFlowDetection.camera_id,
                CityFlowDetection.frame_number
            )
            .all()
        )

        if not detections:
            raise HTTPException(
                status_code=404,
                detail="Vehicle not found in this sequence"
            )

        camera_data = {}

        for row in detections:
            camera = row.camera_id
            camera_suffix = camera.rsplit("_", 1)[-1]

            offset = CAMERA_OFFSETS.get(sequence, {}).get(camera_suffix)

            if camera not in camera_data:
                camera_data[camera] = {
                    "camera_id": camera,
                    "total_detections": 0,
                    "first_frame": row.frame_number,
                    "last_frame": row.frame_number,
                    "first_timestamp_seconds": row.timestamp_seconds,
                    "last_timestamp_seconds": row.timestamp_seconds,
                    "camera_start_offset_seconds": offset,
                    "frames": []
                }

            info = camera_data[camera]
            info["total_detections"] += 1
            info["last_frame"] = row.frame_number
            info["last_timestamp_seconds"] = row.timestamp_seconds
            info["frames"].append(row.frame_number)

        camera_visits = []

        for info in camera_data.values():
            offset = info["camera_start_offset_seconds"]

            if offset is not None:
                global_start = (
                    offset + info["first_timestamp_seconds"]
                )
                global_end = (
                    offset + info["last_timestamp_seconds"]
                )

                info["global_first_timestamp_seconds"] = round(
                    global_start, 3
                )
                info["global_last_timestamp_seconds"] = round(
                    global_end, 3
                )
            else:
                info["global_first_timestamp_seconds"] = None
                info["global_last_timestamp_seconds"] = None

            camera_visits.append(info)

        # Sort cameras by global detection start time
        camera_visits.sort(
            key=lambda x: (
                x["global_first_timestamp_seconds"] is None,
                x["global_first_timestamp_seconds"] or 0
            )
        )

        # Calculate gap or overlap with previous camera interval
        previous_end = None

        for index, visit in enumerate(camera_visits):
            visit["camera_order"] = index + 1

            current_start = visit["global_first_timestamp_seconds"]
            current_end = visit["global_last_timestamp_seconds"]

            visit["gap_from_previous_seconds"] = None
            visit["overlap_with_previous_seconds"] = None

            if current_start is not None and previous_end is not None:
                gap = current_start - previous_end

                if gap >= 0:
                    visit["gap_from_previous_seconds"] = round(gap, 3)
                    visit["overlap_with_previous_seconds"] = 0
                else:
                    visit["gap_from_previous_seconds"] = 0
                    visit["overlap_with_previous_seconds"] = round(
                        abs(gap), 3
                    )

            if current_end is not None:
                previous_end = current_end
            else:
                previous_end = None

        return {
            "vehicle_token": vehicle_token,
            "sequence": sequence,
            "total_detections": len(detections),
            "total_cameras": len(camera_visits),
            "tracking_method": "CityFlow ground-truth vehicle identity",
            "timeline_method": "Camera start offset + camera-local timestamp",
            "camera_visits": camera_visits,
            "note": (
                "Global timestamps are calculated using camera start offsets. "
                "Detection interval overlap does not prove simultaneous "
                "physical vehicle presence or a confirmed road transition. "
                "Global timestamps are available only for S04 cameras "
                "with configured offsets."
            )
        }

    finally:
        db.close()


