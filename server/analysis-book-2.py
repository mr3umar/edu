import sys
import json
import pdfplumber
from arabic_reshaper import reshape
from bidi.algorithm import get_display


def clean_arabic_text(text):
    if not text.strip():
        return ""

    # Detect Arabic
    has_arabic = any('\u0600' <= c <= '\u06FF' for c in text)

    if not has_arabic:
        return text

    try:
        # reshaped = reshape(text)
        # bidi_text = get_display(reshaped)

        # Fallback if reshaping damaged content
        original_len = len(text.replace(" ", ""))
        fixed_len = len(bidi_text.replace(" ", ""))

        if fixed_len < original_len * 0.7:
            return text

        return text

    except Exception:
        return text


def process_pdf_to_json(pdf_path, output_json_path):
    pages_output = []

    with pdfplumber.open(pdf_path) as pdf:

        for page_index, page in enumerate(pdf.pages, 1):

            if page_index > 10:
                break
            print(f"Processing page {page_index}")

            # Better Arabic extraction settings
            words = page.extract_words(
                keep_blank_chars=True,
                use_text_flow=True,
                y_tolerance=3
            )

            lines_map = {}

            for word in words:

                y = round(word["top"], 1)

                if y not in lines_map:
                    lines_map[y] = []

                lines_map[y].append(word)

            page_parts = []
            seq_id = 1

            for y in sorted(lines_map.keys()):

                line_words = lines_map[y]

                # IMPORTANT:
                # ascending x order for Arabic PDFs
                line_words.sort(key=lambda w: w["x0"])

                raw_text = " ".join(
                    w["text"] for w in line_words
                )

                cleaned_text = clean_arabic_text(raw_text)

                if not cleaned_text.strip():
                    continue

                x_min = min(w["x0"] for w in line_words)
                y_min = min(w["top"] for w in line_words)
                x_max = max(w["x1"] for w in line_words)
                y_max = max(w["bottom"] for w in line_words)

                page_parts.append({
                    "seq_id": seq_id,
                    "id": f"p{page_index}_el_{seq_id}",
                    "type": "text",
                    "text": cleaned_text,
                    "coordinates": {
                        "x_min": round(x_min, 2),
                        "y_min": round(y_min, 2),
                        "x_max": round(x_max, 2),
                        "y_max": round(y_max, 2)
                    }
                })

                seq_id += 1

            pages_output.append({
                "page_number": page_index,
                "parts": page_parts
            })

    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(
            pages_output,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(f"Saved to {output_json_path}")


if __name__ == "__main__":

    if len(sys.argv) < 3:
        print("Usage:")
        print("python extract_pdf.py input.pdf output.json")
        sys.exit(1)

    process_pdf_to_json(
        sys.argv[1],
        sys.argv[2]
    )