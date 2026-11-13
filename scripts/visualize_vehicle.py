
import cv2
import csv
import os

# Project paths
VIDEO_PATH = "datasets/cityflowv2/train/S04/c016/vdo.avi"
GT_PATH = "datasets/cityflowv2/train/S04/c016/gt/gt.txt"

OUTPUT_DIR = "outputs"
FRAME_NUMBER = 64

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load video
video = cv2.VideoCapture(VIDEO_PATH)

if not video.isOpened():
    raise RuntimeError("Could not open CityFlow video.")

# Frame numbers in GT start at 1; OpenCV indexes start at 0
video.set(cv2.CAP_PROP_POS_FRAMES, FRAME_NUMBER - 1)

success, frame = video.read()
video.release()

if not success:
    raise RuntimeError(f"Could not read frame {FRAME_NUMBER}.")

# Read annotations for the selected frame
vehicle_count = 0

with open(GT_PATH, "r", newline="") as file:
    reader = csv.reader(file)

    for row in reader:
        if len(row) < 6:
            continue

        try:
            frame_number = int(float(row[0]))
            vehicle_id = int(float(row[1]))

            x = int(float(row[2]))
            y = int(float(row[3]))
            width = int(float(row[4]))
            height = int(float(row[5]))

        except (ValueError, IndexError):
            continue

        if frame_number != FRAME_NUMBER:
            continue

        # Draw bounding box
        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(frame.shape[1] - 1, x + width)
        y2 = min(frame.shape[0] - 1, y + height)

        cv2.rectangle(
            frame,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            2
        )

        # Draw vehicle ID
        label = f"Vehicle ID: {vehicle_id}"

        cv2.putText(
            frame,
            label,
            (x1, max(25, y1 - 10)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (0, 255, 0),
            2
        )

        vehicle_count += 1

# Add frame information
cv2.putText(
    frame,
    f"Camera: S04_c016 | Frame: {FRAME_NUMBER}",
    (30, 40),
    cv2.FONT_HERSHEY_SIMPLEX,
    0.8,
    (255, 255, 255),
    2
)

# Save output
output_path = os.path.join(
    OUTPUT_DIR,
    f"S04_c016_frame_{FRAME_NUMBER}.jpg"
)

cv2.imwrite(output_path, frame)

print("Visualization completed!")
print("Frame:", FRAME_NUMBER)
print("Vehicles detected:", vehicle_count)
print("Saved at:", output_path)
