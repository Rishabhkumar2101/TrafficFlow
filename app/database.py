 
import os

from pathlib import Path
from dotenv import load_dotenv

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.engine import URL


# ==========================================
# 1. PROJECT CONFIGURATION
# ==========================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Load environment variables from .env
load_dotenv(PROJECT_ROOT / ".env")


# ==========================================
# 2. DATABASE CONFIGURATION
# ==========================================

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "trafficflow_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD")


if not DB_PASSWORD or DB_PASSWORD == "YOUR_POSTGRES_PASSWORD":
    raise RuntimeError(
        "PostgreSQL password missing. "
        "Please update your .env file."
    )


# ==========================================
# 3. DATABASE URL
# ==========================================

DATABASE_URL = URL.create(
    drivername="postgresql+psycopg",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME
)


# ==========================================
# 4. DATABASE ENGINE
# ==========================================

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=False
)


# ==========================================
# 5. SESSION CONFIGURATION
# ==========================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# ==========================================
# 6. SQLALCHEMY BASE
# ==========================================

Base = declarative_base()


# ==========================================
# 7. DATABASE SESSION DEPENDENCY
# ==========================================

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# ==========================================
# 8. TEST DATABASE CONNECTION
# ==========================================

def test_connection():

    with engine.connect() as connection:

        result = connection.execute(
            text("SELECT current_database()")
        )

        return result.scalar()


# ==========================================
# 9. CREATE DATABASE TABLES
# ==========================================

def create_tables():

    from app import db_models

    Base.metadata.create_all(bind=engine)

    return True


import pandas as pd

from app.db_models import CameraDetection
from app.utils import load_camera_data, preprocess_data


def import_camera_detections():
    df = preprocess_data(load_camera_data())

    records = df.to_dict(orient="records")

    with SessionLocal() as db:
        inserted = 0

        for record in records:
            timestamp = pd.Timestamp(record["timestamp"]).to_pydatetime()

            exists = db.query(CameraDetection).filter(
                CameraDetection.vehicle_token == record["vehicle_token"],
                CameraDetection.camera_id == record["camera_id"],
                CameraDetection.timestamp == timestamp
            ).first()

            if exists:
                continue

            detection = CameraDetection(
                vehicle_token=record["vehicle_token"],
                camera_id=record["camera_id"],
                timestamp=timestamp,
                latitude=float(record["latitude"]),
                longitude=float(record["longitude"])
            )

            db.add(detection)
            inserted += 1

        db.commit()

    return inserted


from app.db_models import (
    CameraDetection,
    VehicleTrajectory,
    RecurringPattern,
    CameraConnection
)
from app.models import (
    build_vehicle_trajectories,
    discover_recurring_patterns,
    build_camera_network
)


def generate_and_save_analytics():
    with SessionLocal() as db:
        detections = db.query(CameraDetection).all()

        if not detections:
            return {"message": "No camera detections found"}

        df = pd.DataFrame([
            {
                "vehicle_token": d.vehicle_token,
                "camera_id": d.camera_id,
                "timestamp": d.timestamp,
                "latitude": d.latitude,
                "longitude": d.longitude
            }
            for d in detections
        ])

        trajectories = build_vehicle_trajectories(df)
        patterns = discover_recurring_patterns(df)
        network = build_camera_network(df)

        # Replace previous analytics with latest results
        db.query(VehicleTrajectory).delete()
        db.query(RecurringPattern).delete()
        db.query(CameraConnection).delete()

        for _, row in trajectories.iterrows():
            db.add(VehicleTrajectory(
                vehicle_token=row["vehicle_token"],
                from_camera=row["from_camera"],
                to_camera=row["to_camera"],
                start_time=row["start_time"],
                end_time=row["end_time"],
                distance_km=float(row["distance_km"]),
                travel_time_minutes=float(row["travel_time_minutes"]),
                speed_kmh=float(row["speed_kmh"])
            ))

        for pattern in patterns:
            db.add(RecurringPattern(
                route_string=" -> ".join(pattern["route"]),
                route=pattern["route"],
                support_count=pattern["support_count"],
                vehicles=pattern["vehicles"]
            ))

        for edge in network["edges"]:
            db.add(CameraConnection(
                source_camera=edge["source"],
                target_camera=edge["target"],
                weight=edge["weight"],
                total_traversals=edge["total_traversals"],
                average_distance_km=edge["average_distance_km"],
                average_travel_time_minutes=edge["average_travel_time_minutes"]
            ))

        db.commit()

        return {
            "trajectories_saved": len(trajectories),
            "patterns_saved": len(patterns),
            "connections_saved": len(network["edges"])
        }
