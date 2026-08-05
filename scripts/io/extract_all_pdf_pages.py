import json
import os
import fitz
import re

os.makedirs("public/pdf_pages", exist_ok=True)
pdf_cache = {}

json_file = "public/data/questions.json"
with open(json_file, "r", encoding="utf-8") as f:
    data = json.load(f)

for q in data:
    pdf_url = q.get("pdfUrl")
    pdf_page = q.get("pdfPage")
    q_num = q.get("questionNumber")
    
    if not pdf_url or pdf_page is None or q_num is None:
        continue
        
    # Extract PDF filename from URL (e.g. "R06.CBT.pdf")
    pdf_name = pdf_url.split("/")[-1]
    year = pdf_name.replace(".pdf", "")
    
    if pdf_name not in pdf_cache:
        # First check in data/raw_pdfs (for public cloning reproducibility)
        local_path = os.path.join("data", "raw_pdfs", pdf_name)
        h_drive_path = os.path.join(r"H:\マイドライブ\試験系\うんかん", pdf_name)
        
        pdf_path = None
        if os.path.exists(local_path):
            pdf_path = local_path
        elif os.path.exists(pdf_name):
            pdf_path = pdf_name
        elif os.path.exists(h_drive_path):
            pdf_path = h_drive_path
            
        if pdf_path is None:
            print(f"Cannot find {pdf_name}. Please place it in data/raw_pdfs/")
            pdf_cache[pdf_name] = None
            continue
        pdf_cache[pdf_name] = fitz.open(pdf_path)
    
    doc = pdf_cache[pdf_name]
    if doc is None:
        continue
        
    out_path = f"public/pdf_pages/{year}_Q{q_num}.png"
    if os.path.exists(out_path):
        continue
        
    page_index = pdf_page - 1
    if 0 <= page_index < len(doc):
        print(f"Extracting {year} Q{q_num} from page {pdf_page}")
        page = doc[page_index]
        matrix = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=matrix)
        pix.save(out_path)

print("Finished extracting all PDF pages.")
