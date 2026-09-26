import sys
import json
import os
import pdfplumber
from arabic_reshaper import reshape
from bidi.algorithm import get_display

def clean_arabic_text(text):
    if not text.strip():
        return ""

    arabic_range = any('\u0600' <= c <= '\u06FF' for c in text)

    if not arabic_range:
        return text

    try:
        reshaped = reshape(text)
        bidi_text = get_display(reshaped)

        # fallback if reshaping damaged text
        if len(bidi_text.replace(" ", "")) < len(text.replace(" ", "")) * 0.7:
            return text

        return bidi_text

    except:
        return text

def clean_arabic_text3(text):
    if not text.strip():
        return ""

    try:
        reshaped = reshape(text)
        fixed = get_display(reshaped)
        return fixed
    except Exception:
        return text

def clean_arabic_text2(raw_text):
    """
    Connects disconnected Arabic presentation glyphs and fixes the 
    Right-to-Left (RTL) reading sequence vector natively.
    """
    if not raw_text.strip():
        return ""
    # 1. Reshape connects characters contextually (e.g. م + ع + د -> معد)
    reshaped_text = reshape(raw_text)
    # 2. get_display applies the Unicode Bidi algorithm to reverse reading lines
    return get_display(reshaped_text)

def process_pdf_to_json(pdf_path, output_json_path):
    pages_output = []

    with pdfplumber.open(pdf_path) as pdf:
        for index, page in enumerate(pdf.pages, 1):
            if index > 10:
                    break
            print(f"⏳ Processing page index {index}...")
            
            # Extract words along with their exact spatial coordinates and font metadata
            # y_tolerance=3 bundles adjacent inline characters into shared line items automatically
            # words = page.extract_words(keep_blank_chars=False, y_tolerance=3)
            words = page.extract_words(
    keep_blank_chars=True,
    use_text_flow=True,
    y_tolerance=3
    )
            
            # Step 1: Line-by-Line Grouping Engine
            # We group separate word tokens sharing the same horizontal layout row line
            lines_map = {}
            for word in words:
                y_coord = round(word['top'], 1)  # Snaps floating values to a uniform baseline row
                if y_coord not in lines_map:
                    lines_map[y_coord] = []
                lines_map[y_coord].append(word)

            page_elements = []
            page_title = None
            max_font_size_seen = 0
            seq_counter = 1

            # Step 2: Extract Content & Calculate Bounding Boxes
            for y_baseline in sorted(lines_map.keys()):
                line_words = lines_map[y_baseline]
                
                # Sort line elements right-to-left to map proper Arabic character flows
                # line_words.sort(key=lambda w: w['x0'], reverse=True)
                line_words.sort(key=lambda w: w['x0'])
                
                # Combine words on the same line into a single string row
                combined_raw_text = " ".join([w['text'] for w in line_words])
                cleaned_text = clean_arabic_text(combined_raw_text)
                
                if not cleaned_text.strip():
                    continue

                # Calculate the complete bounding box wrapper dimensions for the entire line item
                x_min = min([w['x0'] for w in line_words])
                y_min = min([w['top'] for w in line_words])
                x_max = max([w['x1'] for w in line_words])
                y_max = max([w['bottom'] for w in line_words])
                
                # Determine font sizes to classify headings
                # (pdfplumber maps font sizes inside the text metadata array dictionary)
                font_size = max([w.get('size', 12) for w in line_words])

                element_type = "text"
                if font_size > 18:
                    element_type = "heading"
                    # Capture the largest text element near the top of the page as the title
                    if font_size > max_font_size_seen and y_min < 150:
                        max_font_size_seen = font_size
                        page_title = cleaned_text

                page_elements.append({
                    "seq_id": seq_counter,
                    "id": f"p{index}_el_{seq_counter}",
                    "type": element_type,
                    "text": cleaned_text,
                    "coordinates": {
                        "x_min": round(x_min, 2),
                        "y_min": round(y_min, 2),
                        "x_max": round(x_max, 2),
                        "y_max": round(y_max, 2)
                    }
                })
                seq_counter += 1

            # Compile page block payload structure
            pages_output.append({
                "page_number": index,
                "title": page_title if page_title else f"Page {index} Document Content",
                "parts": page_elements
            })

    # Step 3: Write out to the file system as an explicit UTF-8 JSON file
    with open(output_json_path, 'w', encoding='utf-8') as json_file:
        json.dump(pages_output, json_file, ensure_ascii=False, indent=2)
        
    print(f"💾 Successfully compiled complete structural data to: {output_json_path}")

if __name__ == "__main__":
    # Expect file path input arguments via command line execution execution loops
    if len(sys.argv) < 3:
        print("Usage: python extract_pdf.py <input_pdf_path> <output_json_path>")
        sys.argv = ["", "./books/math-05-1.pdf", "../output.json"] # Safe local testing defaults
        
    input_pdf = sys.argv[1]
    output_json = sys.argv[2]
    
    process_pdf_to_json(input_pdf, output_json)
