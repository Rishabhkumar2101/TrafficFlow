
import numpy as np
import pandas as pd
import networkx as nx

from sklearn.cluster import DBSCAN


# Earth radius in kilometers
EARTH_RADIUS_KM = 6371.0


# 1. Calculate distance using Haversine formula
def calculate_distance(lat1, lon1, lat2, lon2):

    lat1, lon1, lat2, lon2 = np.radians(
        [lat1, lon1, lat2, lon2]
    )

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        np.sin(dlat / 2) ** 2
        + np.cos(lat1)
        * np.cos(lat2)
        * np.sin(dlon / 2) ** 2
    )

    c = 2 * np.arcsin(np.sqrt(a))

    return EARTH_RADIUS_KM * c


# 2. Build vehicle trajectories
def build_vehicle_trajectories(df):

    trajectories = []

    df = df.sort_values(
        ["vehicle_token", "timestamp"]
    )

    for vehicle_id, group in df.groupby("vehicle_token"):

        group = group.sort_values("timestamp")

        records = group.to_dict("records")

        for i in range(len(records) - 1):

            current = records[i]
            next_record = records[i + 1]

            distance = calculate_distance(
                current["latitude"],
                current["longitude"],
                next_record["latitude"],
                next_record["longitude"]
            )

            time_difference = (
                next_record["timestamp"]
                - current["timestamp"]
            ).total_seconds() / 60

            speed = (
                distance / (time_difference / 60)
                if time_difference > 0
                else 0
            )

            trajectories.append({
                "vehicle_token": vehicle_id,
                "from_camera": current["camera_id"],
                "to_camera": next_record["camera_id"],
                "start_time": current["timestamp"],
                "end_time": next_record["timestamp"],
                "distance_km": round(distance, 4),
                "travel_time_minutes": round(
                    time_difference, 2
                ),
                "speed_kmh": round(speed, 2)
            })

    return pd.DataFrame(trajectories)


# 3. Cluster similar vehicle movements
def cluster_vehicle_movements(
    trajectories,
    eps=0.5,
    min_samples=2
):

    if trajectories.empty:
        return trajectories.copy()

    result = trajectories.copy()

    features = result[
        ["distance_km", "travel_time_minutes"]
    ].to_numpy()

    # Normalize features
    from sklearn.preprocessing import StandardScaler

    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(features)

    # DBSCAN clustering
    clustering = DBSCAN(
        eps=eps,
        min_samples=min_samples
    )

    result["cluster"] = clustering.fit_predict(
        scaled_features
    )

    return result


# 4. Generate trajectory summary
def get_trajectory_summary(trajectories):

    if trajectories.empty:
        return {
            "total_transitions": 0,
            "unique_vehicles": 0,
            "average_distance_km": 0,
            "average_travel_time_minutes": 0
        }

    return {
        "total_transitions": int(len(trajectories)),
        "unique_vehicles": int(
            trajectories["vehicle_token"].nunique()
        ),
        "average_distance_km": round(
            float(trajectories["distance_km"].mean()), 4
        ),
        "average_travel_time_minutes": round(
            float(
                trajectories["travel_time_minutes"].mean()
            ), 2
        )
    }



def discover_recurring_patterns(df, min_support=2):

    """
    Discover recurring camera movement sequences.

    min_support = minimum number of unique vehicles
                  required to consider a pattern recurring.
    """

    if df.empty:
        return []

    df = df.sort_values(
        ["vehicle_token", "timestamp"]
    )

    # Store unique vehicles for each camera sequence
    pattern_vehicles = {}

    for vehicle_id, group in df.groupby("vehicle_token"):

        cameras = group["camera_id"].tolist()

        # Generate contiguous camera sequences
        # of length 2 or greater
        for start in range(len(cameras)):

            for end in range(start + 2, len(cameras) + 1):

                sequence = tuple(cameras[start:end])

                if sequence not in pattern_vehicles:
                    pattern_vehicles[sequence] = set()

                pattern_vehicles[sequence].add(vehicle_id)

    results = []

    for sequence, vehicles in pattern_vehicles.items():

        support = len(vehicles)

        if support >= min_support:

            results.append({
                "route": list(sequence),
                "route_string": " -> ".join(sequence),
                "support_count": support,
                "vehicles": sorted(vehicles)
            })

    # Highest support first
    results.sort(
        key=lambda x: (
            -x["support_count"],
            -len(x["route"])
        )
    )

    return results



def build_camera_network(df):

    """
    Build a directed camera movement graph.

    Nodes represent cameras.
    Edges represent vehicle transitions.
    Edge weights represent unique vehicle counts.
    """

    graph = nx.DiGraph()

    if df.empty:
        return {
            "total_cameras": 0,
            "total_connections": 0,
            "nodes": [],
            "edges": []
        }

    df = df.sort_values(
        ["vehicle_token", "timestamp"]
    )

    # Add camera nodes
    for camera_id in df["camera_id"].unique():

        camera_data = df[
            df["camera_id"] == camera_id
        ]

        graph.add_node(
            camera_id,
            total_detections=int(len(camera_data)),
            latitude=float(camera_data["latitude"].mean()),
            longitude=float(camera_data["longitude"].mean())
        )

    # Collect movement connections
    movement_data = {}

    for vehicle_id, group in df.groupby("vehicle_token"):

        records = group.sort_values(
            "timestamp"
        ).to_dict("records")

        for i in range(len(records) - 1):

            current = records[i]
            next_record = records[i + 1]

            source = current["camera_id"]
            target = next_record["camera_id"]

            if source == target:
                continue

            key = (source, target)

            distance = calculate_distance(
                current["latitude"],
                current["longitude"],
                next_record["latitude"],
                next_record["longitude"]
            )

            travel_time = (
                next_record["timestamp"]
                - current["timestamp"]
            ).total_seconds() / 60

            if key not in movement_data:

                movement_data[key] = {
                    "vehicles": set(),
                    "total_traversals": 0,
                    "distances": [],
                    "travel_times": []
                }

            movement_data[key]["vehicles"].add(
                vehicle_id
            )

            movement_data[key]["total_traversals"] += 1

            movement_data[key]["distances"].append(
                distance
            )

            movement_data[key]["travel_times"].append(
                travel_time
            )

    # Add directed edges
    for (source, target), data in movement_data.items():

        graph.add_edge(
            source,
            target,
            weight=len(data["vehicles"]),
            total_traversals=data["total_traversals"],
            vehicles=sorted(data["vehicles"]),
            average_distance_km=round(
                float(np.mean(data["distances"])), 4
            ),
            average_travel_time_minutes=round(
                float(np.mean(data["travel_times"])), 2
            )
        )

    # Convert graph into JSON-friendly structure
    nodes = [
        {
            "camera_id": node,
            **attributes
        }
        for node, attributes in graph.nodes(data=True)
    ]

    edges = [
        {
            "source": source,
            "target": target,
            **attributes
        }
        for source, target, attributes
        in graph.edges(data=True)
    ]

    return {
        "total_cameras": graph.number_of_nodes(),
        "total_connections": graph.number_of_edges(),
        "nodes": nodes,
        "edges": edges
    }
