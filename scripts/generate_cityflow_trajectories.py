
import sys
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.database import SessionLocal
from app.db_models import CityFlowDetection, VehicleTrajectory

SEQUENCES = ["S01", "S03", "S04"]

EPOCH = datetime(1970, 1, 1)


def get_camera_fps(sequence, camera):
    # S03 camera c015 runs at 8 FPS.
    if sequence == "S03" and camera.endswith("_c015"):
        return 8

    return 10


def load_camera_offsets(sequence):
    timestamp_file = (
        ROOT
        / "datasets"
        / "cityflowv2"
        / "cam_timestamp"
        / f"{sequence}.txt"
    )

    if not timestamp_file.exists():
        raise FileNotFoundError(
            f"Timestamp file not found: {timestamp_file}"
        )

    offsets = {}

    with timestamp_file.open("r", encoding="utf-8") as file:
        for line in file:
            values = line.split()

            if len(values) != 2:
                continue

            camera, start_time = values
            offsets[f"{sequence}_{camera}"] = float(start_time)

    return offsets


def generate_sequence_trajectories(sequence, db):

    offsets = load_camera_offsets(sequence)

    detections = (
        db.query(CityFlowDetection)
        .filter(CityFlowDetection.sequence_id == sequence)
        .order_by(
            CityFlowDetection.vehicle_token,
            CityFlowDetection.camera_id,
            CityFlowDetection.frame_number
        )
        .all()
    )

    grouped = defaultdict(list)

    for detection in detections:
        grouped[
            (detection.vehicle_token, detection.camera_id)
        ].append(detection)

    vehicle_visits = defaultdict(list)

    for (vehicle, camera), records in grouped.items():

        if camera not in offsets:
            continue

        fps = get_camera_fps(sequence, camera)

        first_frame = min(r.frame_number for r in records)
        last_frame = max(r.frame_number for r in records)

        camera_start = offsets[camera]

        entry_time = (
            camera_start + (first_frame - 1) / fps
        )

        exit_time = (
            camera_start + (last_frame - 1) / fps
        )

        vehicle_visits[vehicle].append({
            "camera": camera,
            "entry": entry_time,
            "exit": exit_time
        })

    new_trajectories = []

    for vehicle, visits in vehicle_visits.items():

        visits.sort(key=lambda item: item["entry"])

        for previous, current in zip(visits, visits[1:]):

            travel_seconds = (
                current["entry"] - previous["exit"]
            )

            # Ignore overlapping or non-positive intervals.
            if travel_seconds <= 0:
                continue

            new_trajectories.append(
                VehicleTrajectory(
                    vehicle_token=vehicle,
                    from_camera=previous["camera"],
                    to_camera=current["camera"],
                    start_time=EPOCH + timedelta(
                        seconds=previous["exit"]
                    ),
                    end_time=EPOCH + timedelta(
                        seconds=current["entry"]
                    ),
                    distance_km=None,
                    travel_time_minutes=round(
                        travel_seconds / 60, 3
                    ),
                    speed_kmh=None
                )
            )

    # Replace only records belonging to this sequence.
    db.query(VehicleTrajectory).filter(
        VehicleTrajectory.vehicle_token.startswith(
            f"{sequence}_"
        )
    ).delete(synchronize_session=False)

    db.add_all(new_trajectories)
    db.flush()

    print(f"\n{sequence} TRAJECTORY GENERATION")
    print("Detections:", len(detections))
    print("Vehicles processed:", len(vehicle_visits))
    print(
        "Camera visits:",
        sum(len(v) for v in vehicle_visits.values())
    )
    print("Trajectories saved:", len(new_trajectories))


def generate_trajectories():

    db = SessionLocal()

    try:
        for sequence in SEQUENCES:
            generate_sequence_trajectories(sequence, db)

        db.commit()

        print("\nALL SEQUENCES PROCESSED SUCCESSFULLY")

    except Exception as error:
        db.rollback()
        print("Error:", error)
        raise

    finally:
        db.close()


if __name__ == "__main__":
    generate_trajectories()
