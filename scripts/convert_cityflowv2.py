
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATASET = ROOT / "datasets" / "cityflowv2" / "train"
OUTPUT = ROOT / "Data" / "cityflowv2_train_annotations.csv"

columns = [
    "vehicle_token", "sequence_id", "camera_id",
    "frame_number", "timestamp_seconds",
    "x", "y", "width", "height", "confidence"
]

def main():
    if not DATASET.exists():
        print("Dataset folder not found:", DATASET)
        return

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    total = 0

    with OUTPUT.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=columns)
        writer.writeheader()

        for sequence_dir in sorted(DATASET.iterdir()):
            if not sequence_dir.is_dir():
                continue

            sequence = sequence_dir.name

            for camera_dir in sorted(sequence_dir.iterdir()):
                gt_file = camera_dir / "gt" / "gt.txt"

                if not gt_file.exists():
                    continue

                fps = 8 if sequence == "S03" and camera_dir.name == "c015" else 10

                with gt_file.open("r", encoding="utf-8") as source:
                    for line in source:
                        values = line.strip().split(",")

                        if len(values) < 6:
                            continue

                        try:
                            frame = int(values[0])
                            vehicle_id = int(values[1])
                            x, y, width, height = map(float, values[2:6])
                            confidence = float(values[6]) if len(values) > 6 else 1.0
                        except ValueError:
                            continue

                        writer.writerow({
                            "vehicle_token": f"{sequence}_V{vehicle_id}",
                            "sequence_id": sequence,
                            "camera_id": f"{sequence}_{camera_dir.name}",
                            "frame_number": frame,
                            "timestamp_seconds": round((frame - 1) / fps, 3),
                            "x": x,
                            "y": y,
                            "width": width,
                            "height": height,
                            "confidence": confidence
                        })

                        total += 1

    print("\nCSV GENERATED SUCCESSFULLY!")
    print("Total annotations:", total)
    print("Output file:", OUTPUT)

if __name__ == "__main__":
    main()
