import json
import glob
import os
import fitz

os.makedirs("public/pdf_pages", exist_ok=True)
pdf_cache = {}

for json_file in glob.glob("data/json/*.json"):
    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    basename = os.path.basename(json_file).replace(".json", "")
    parts = basename.split("_")
    year = parts[0]
    
    pdf_name = f"{year}.pdf"
    
    if pdf_name not in pdf_cache:
        if not os.path.exists(pdf_name):
            print(f"Skipping {pdf_name} - not found.")
            continue
        pdf_cache[pdf_name] = fitz.open(pdf_name)
    
    doc = pdf_cache[pdf_name]
    
    for q in data:
        q_num = q.get("questionNumber")
        pdf_page = q.get("pdfPage")
        
        if pdf_page is None:
            continue
            
        out_path = f"public/pdf_pages/{year}_Q{q_num}.png"
        if os.path.exists(out_path):
            continue
            
        page_index = pdf_page - 1
        if 0 <= page_index < len(doc):
            print(f"Extracting {year} Q{q_num} from page {pdf_page}")
            page = doc[page_index]
            # Standard resolution is fine for thumbnail/reference
            matrix = fitz.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=matrix)
            pix.save(out_path)

print("Finished extracting all PDF pages.")
