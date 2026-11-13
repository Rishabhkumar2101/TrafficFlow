
import sys
import csv
from pathlib import Path

# Project root path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from sqlalchemy.dialects.postgresql import insert

from app.database import SessionLocal
from app.db_models import CityFlowDetection

CSV_FILE = ROOT / "Data" / "cityflowv2_train_annotations.csv"

BATCH_SIZE = 5000

def import_cityflow_data():

    if not CSV_FILE.exists():
        print("CSV file not found:", CSV_FILE)
        return

    db = SessionLocal()
    total_inserted = 0
    total_read = 0

    try:
        with CSV_FILE.open("r", encoding="utf-8", newline="") as file:
            reader = csv.DictReader(file)
            batch = []

            for row in reader:
                record = {
                    "vehicle_token": row["vehicle_token"],
                    "sequence_id": row["sequence_id"],
                    "camera_id": row["camera_id"],
                    "frame_number": int(row["frame_number"]),
                    "timestamp_seconds": float(row["timestamp_seconds"]),
                    "x": float(row["x"]),
                    "y": float(row["y"]),
                    "width": float(row["width"]),
                    "height": float(row["height"]),
                    "confidence": float(row["confidence"])
                }

                batch.append(record)
                total_read += 1

                if len(batch) >= BATCH_SIZE:
                    total_inserted += save_batch(db, batch)
                    batch.clear()
                    print("Processed:", total_read)

            if batch:
                total_inserted += save_batch(db, batch)

        print("\nIMPORT COMPLETED")
        print("Rows read:", total_read)
        print("New rows inserted:", total_inserted)

    except Exception as error:
        db.rollback()
        print("Import failed:", error)

    finally:
        db.close()


def save_batch(db, batch):

    statement = insert(CityFlowDetection).values(batch)

    statement = statement.on_conflict_do_nothing(
        constraint="unique_cityflow_detection"
    )

    result = db.execute(statement)
    db.commit()

    return max(result.rowcount, 0)


if __name__ == "__main__":
    import_cityflow_data()
