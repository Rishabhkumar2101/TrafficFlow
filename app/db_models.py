
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    JSON,
    UniqueConstraint
)

from app.database import Base


class CameraDetection(Base):
    __tablename__ = "camera_detections"

    detection_id = Column(Integer, primary_key=True, index=True)
    vehicle_token = Column(String(100), nullable=False, index=True)
    camera_id = Column(String(100), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)


class VehicleTrajectory(Base):
    __tablename__ = "vehicle_trajectories"

    trajectory_id = Column(Integer, primary_key=True, index=True)
    vehicle_token = Column(String(100), nullable=False, index=True)
    from_camera = Column(String(100), nullable=False)
    to_camera = Column(String(100), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    distance_km = Column(Float)
    travel_time_minutes = Column(Float)
    speed_kmh = Column(Float)


class RecurringPattern(Base):
    __tablename__ = "recurring_patterns"

    pattern_id = Column(Integer, primary_key=True, index=True)
    route_string = Column(String(500), nullable=False)
    route = Column(JSON, nullable=False)
    support_count = Column(Integer, nullable=False)
    vehicles = Column(JSON, nullable=False)


class CameraConnection(Base):
    __tablename__ = "camera_connections"

    connection_id = Column(Integer, primary_key=True, index=True)
    source_camera = Column(String(100), nullable=False)
    target_camera = Column(String(100), nullable=False)
    weight = Column(Integer, default=0)
    total_traversals = Column(Integer, default=0)
    average_distance_km = Column(Float)
    average_travel_time_minutes = Column(Float)

    __table_args__ = (
        UniqueConstraint(
            "source_camera",
            "target_camera",
            name="unique_camera_connection"
        ),
    )


class CityFlowDetection(Base):
    __tablename__ = "cityflow_detections"

    id = Column(Integer, primary_key=True, index=True)

    vehicle_token = Column(String(100), nullable=False, index=True)
    sequence_id = Column(String(20), nullable=False, index=True)
    camera_id = Column(String(100), nullable=False, index=True)

    frame_number = Column(Integer, nullable=False)
    timestamp_seconds = Column(Float, nullable=False)

    x = Column(Float, nullable=False)
    y = Column(Float, nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)

    confidence = Column(Float, default=1.0)

    __table_args__ = (
        UniqueConstraint(
            "vehicle_token",
            "camera_id",
            "frame_number",
            name="unique_cityflow_detection"
        ),
    )
