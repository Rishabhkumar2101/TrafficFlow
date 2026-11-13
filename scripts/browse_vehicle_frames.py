
import cv2
import csv

VIDEO_PATH = "datasets/cityflowv2/train/S04/c016/vdo.avi"
GT_PATH = "datasets/cityflowv2/train/S04/c016/gt/gt.txt"

# Load ground-truth annotations
annotations = {}

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

            annotations.setdefault(frame_number, []).append({
                "vehicle_id": vehicle_id,
                "x": x,
                "y": y,
                "width": width,
                "height": height
            })

        except (ValueError, IndexError):
            continue

# Ask for vehicle ID
vehicle_input = input(
    "Enter Vehicle ID (e.g. 324) or press Enter for all vehicles: "
).strip()

selected_vehicle = int(vehicle_input) if vehicle_input else None

# Open video
video = cv2.VideoCapture(VIDEO_PATH)

if not video.isOpened():
    raise RuntimeError("Could not open video.")

total_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))

window_name = "TrafficFlow - Multi Frame Vehicle Visualization"

cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)

# Trackbar callback
def update_frame(value):
    pass

cv2.createTrackbar(
    "Frame",
    window_name,
    0,
    total_frames - 1,
    update_frame
)

current_frame = 0

print("\nControls:")
print("N = Next frame")
print("P = Previous frame")
print("Q = Quit")
print("Use the Frame slider to jump to any frame.")

while True:

    # Read selected frame from slider
    slider_frame = cv2.getTrackbarPos("Frame", window_name)

    if slider_frame != current_frame:
        current_frame = slider_frame

    # OpenCV frame index starts at 0
    video.set(cv2.CAP_PROP_POS_FRAMES, current_frame)

    success, frame = video.read()

    if not success:
        break

    frame_number = current_frame + 1

    frame_annotations = annotations.get(frame_number, [])

    visible_count = 0

    for item in frame_annotations:

        vehicle_id = item["vehicle_id"]

        if (
            selected_vehicle is not None
            and vehicle_id != selected_vehicle
        ):
            continue

        x = item["x"]
        y = item["y"]
        width = item["width"]
        height = item["height"]

        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(frame.shape[1] - 1, x + width)
        y2 = min(frame.shape[0] - 1, y + height)

        if x2 <= x1 or y2 <= y1:
            continue

        # Draw bounding box
        cv2.rectangle(
            frame,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            2
        )

        # Vehicle label
        cv2.putText(
            frame,
            f"Vehicle ID: {vehicle_id}",
            (x1, max(25, y1 - 10)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (0, 255, 0),
            2
        )

        visible_count += 1

    # Display information
    cv2.rectangle(frame, (10, 10), (490, 90), (0, 0, 0), -1)

    cv2.putText(
        frame,
        "TrafficFlow | S04_c016",
        (20, 35),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 255),
        2
    )

    cv2.putText(
        frame,
        f"Frame: {frame_number}/{total_frames} | Vehicles: {visible_count}",
        (20, 68),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (0, 255, 255),
        2
    )

    cv2.imshow(window_name, frame)

    key = cv2.waitKey(30) & 0xFF

    if key == ord("q"):
        break

    elif key == ord("n"):
        current_frame = min(current_frame + 1, total_frames - 1)
        cv2.setTrackbarPos("Frame", window_name, current_frame)

    elif key == ord("p"):
        current_frame = max(current_frame - 1, 0)
        cv2.setTrackbarPos("Frame", window_name, current_frame)

video.release()
cv2.destroyAllWindows()

print("Vehicle visualization closed.")
