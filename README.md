
# TrafficFlow
### City-Wide Vehicle Trajectory Clustering

TrafficFlow is an intelligent traffic analytics system
designed to identify recurring vehicle movement patterns
across a city-wide network of ANPR and CCTV cameras.

## Problem Statement

City-wide ANPR and CCTV camera networks often operate
independently. As a result, recurring vehicle movement
patterns across multiple camera locations are not
automatically identified.

TrafficFlow aims to connect camera detections, construct
vehicle trajectories and discover recurring movement
patterns using machine learning.

## Key Features

- Multi-camera detection data ingestion
- Vehicle detection data preprocessing
- Cross-camera trajectory construction
- Camera transition analysis
- DBSCAN-based trajectory clustering
- Recurring route identification
- REST API using FastAPI

## Technology Stack

- Python
- Pandas
- NumPy
- Scikit-learn
- FastAPI
- Uvicorn

## Project Structure

```text
TrafficFlow/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── models.py
│   └── utils.py
├── Data/
│   └── sample_data.csv
├── requirements.txt
└── README.md
```

## Installation

Clone the repository:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd TrafficFlow
```

Create virtual environment:

```bash
python -m venv .venv
```

Activate on Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

## Run the Application

```bash
uvicorn app.main:app --reload
```

## API Documentation

Open:

http://127.0.0.1:8000/docs

## Available Endpoints

| Endpoint | Description |
|---|---|
| / | Project information |
| /health | API health |
| /detections | Camera detections |
| /trajectories | Vehicle trajectories |
| /clusters | Clustering results |

## Privacy

The prototype uses pseudonymous vehicle identifiers
instead of storing real number plates. Real-world
deployment requires authorized data access, appropriate
privacy safeguards and retention controls.

## Project Status

Initial ML backend prototype under development.

Future enhancements include:

- YOLO-based vehicle detection
- ANPR integration
- Improved cross-camera association
- Geospatial route clustering
- Interactive traffic dashboard
- Docker deployment
