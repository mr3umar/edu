from pdf2image import convert_from_path
from surya.model.recognition.model import load_predictor
from surya.ocr import run_ocr

predictor = load_predictor()

images = convert_from_path(
    "./books/math-05-1-2.pdf",
    first_page=1,
    last_page=2,
    dpi=150
)

result = run_ocr(images, predictor)

for page in result:
    print(page.text)