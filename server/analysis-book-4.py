import os

os.environ["OMP_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"
os.environ["CUDA_VISIBLE_DEVICES"] = ""
os.environ["no_proxy"] = "*"

import numpy as np
from paddleocr import PaddleOCR
from PIL import Image
import json
import cv2



print("Loading image...")
# img = Image.open("./images/math-05-1-005.jpg") #.convert("RGB")  # Force RGB — fixes RGBA/grayscale issues
# img_array = np.array(img)

# print(f"Image shape: {img_array.shape}")  # Should be (H, W, 3)

print("Initializing PaddleOCR...")
# ocr = PaddleOCR(
#     use_angle_cls=True,
#     lang="ar",
# #     rec_algorithm="SVTR_LCNet",
#     det_db_box_thresh=0.3,
#     det_db_unclip_ratio=2.0
# #     show_log=False,
# #     enable_mkldnn=False,
# )

print("Running OCR...")
ocr = PaddleOCR(lang="ar", use_angle_cls=True)

img = cv2.imread("./books/images/math-05-1.6.png")

result = ocr.ocr(img)

# for item in result:
#     for line in item.get("rec_texts", []):
#         print(line)

output = []

# PaddleOCR returns: [ [line1, line2, ...] ]
output = []

rec_texts = result[0]["rec_texts"]
rec_scores = result[0]["rec_scores"]
rec_polys = result[0]["rec_polys"]

for i in range(len(rec_texts)):
    output.append({
        "text": rec_texts[i],
        "confidence": float(rec_scores[i]) if rec_scores[i] is not None else None,
        "bbox": rec_polys[i].tolist() if hasattr(rec_polys[i], "tolist") else rec_polys[i]
    })

print(output)

# for line in result[0]:
#     bbox = line[0]
#     text, confidence = line[1]

#     output.append({
#         "text": text,
#         "confidence": float(confidence),
#         "bbox": bbox
#     })

#     # safest extraction
#     if isinstance(rec, tuple) or isinstance(rec, list):
#         text = rec[0]
#         confidence = rec[1] if len(rec) > 1 else None
#     else:
#         text = rec
#         confidence = None

#     output.append({
#         "text": text,
#         "confidence": float(confidence) if confidence is not None else None,
#         "bbox": bbox
#     })

print(json.dumps(output, ensure_ascii=False, indent=2))