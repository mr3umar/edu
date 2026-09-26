from pdf2image import convert_from_path
import pytesseract


images = convert_from_path("./books/math-05-1.pdf", first_page=1,
    last_page=5,
    dpi=400
    )

text = pytesseract.image_to_string(
    images[4],
    lang="ara",
    config="--oem 3 --psm 6"
    
)

print(text)
