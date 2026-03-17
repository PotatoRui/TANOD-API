import sys
import json
from ultralytics import YOLO

image_path = sys.argv[1]

yolo_obj = YOLO("yolov8m.pt")
yolo_obj = YOLO("yolov8-people.pt")
yolo_obj = YOLO("yolov10-accodemt.pt")
yolo_obj = YOLO("yolov10-landslide.pt")
yolo_obj = YOLO("yolov10-flood.pt")
yolo_obj = YOLO("yolov10-fire.pt")  # change path if needed

results = yolo_obj(image_path, verbose=False)
detections = []

if results and results[0].boxes:
    for box in results[0].boxes:
        cls_id = int(box.cls[0])
        label = results[0].names[cls_id]
        confidence = float(box.conf[0]) * 100
        detections.append({"label": label, "confidence": confidence})

if detections:
    top_detection = max(detections, key=lambda x: x["confidence"])
    output = {
        "label": top_detection["label"],
        "ai_accuracy": round(top_detection["confidence"], 2),      # for YOLOv8
        "ai_accuracy_yolov10": round(top_detection["confidence"], 2),  # for YOLOv10
        "detections": detections
    }
else:
    output = {"label": "Unknown", "ai_accuracy": 0, "ai_accuracy_yolov10": 0, "detections": []}

print(json.dumps(output))
