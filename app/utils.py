
from pathlib import Path
import pandas as pd


# Project directory
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Dataset path
DATA_PATH = PROJECT_ROOT / "Data" / "sample_data.csv"

# Required CSV columns
REQUIRED_COLUMNS = [
    "vehicle_token",
    "camera_id",
    "timestamp",
    "latitude",
    "longitude"
]


# 1. Load camera detection dataset
def load_camera_data():

    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_PATH}"
        )

    df = pd.read_csv(DATA_PATH)

    # Validate required columns
    missing_columns = [
        col for col in REQUIRED_COLUMNS
        if col not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing columns: {missing_columns}"
        )

    return df


# 2. Preprocess camera detection data
def preprocess_data(df):

    df = df.copy()

    # Validate required columns
    missing_columns = [
        col for col in REQUIRED_COLUMNS
        if col not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing columns: {missing_columns}"
        )

    # Remove rows with missing vehicle or camera IDs
    df = df.dropna(
        subset=["vehicle_token", "camera_id"]
    )

    # Convert timestamp
    df["timestamp"] = pd.to_datetime(
        df["timestamp"],
        errors="coerce"
    )

    # Convert latitude and longitude
    df["latitude"] = pd.to_numeric(
        df["latitude"],
        errors="coerce"
    )

    df["longitude"] = pd.to_numeric(
        df["longitude"],
        errors="coerce"
    )

    # Remove invalid records
    df = df.dropna(
        subset=[
            "timestamp",
            "latitude",
            "longitude"
        ]
    )

    # Validate geographic coordinates
    df = df[
        df["latitude"].between(-90, 90)
        & df["longitude"].between(-180, 180)
    ]

    # Sort vehicle detections chronologically
    df = df.sort_values(
        by=["vehicle_token", "timestamp"]
    ).reset_index(drop=True)

    return df


# 3. Generate dataset summary
def get_dataset_summary(df):

    if df.empty:
        return {
            "total_detections": 0,
            "unique_vehicles": 0,
            "unique_cameras": 0,
            "start_time": None,
            "end_time": None
        }

    summary = {
        "total_detections": int(len(df)),

        "unique_vehicles": int(
            df["vehicle_token"].nunique()
        ),

        "unique_cameras": int(
            df["camera_id"].nunique()
        ),

        "start_time": str(
            df["timestamp"].min()
        ),

        "end_time": str(
            df["timestamp"].max()
        )
    }

    return summary
