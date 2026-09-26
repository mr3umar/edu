import easyocr

reader = easyocr.Reader(['ar', 'en'])

result = reader.readtext("./images/math-05-1-005.png")

for bbox, text, confidence in result:
    print(text, confidence)