import json
import glob
import os
import fitz
import re

pdf_cache = {}

for json_file in glob.glob("data/json/*.json"):
    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    basename = os.path.basename(json_file).replace(".json", "")
    parts = basename.split("_")
    year = parts[0]
    
    pdf_name = f"{year}.pdf"
    
    if not os.path.exists(pdf_name):
        continue
            
    if pdf_name not in pdf_cache:
        pdf_cache[pdf_name] = fitz.open(pdf_name)
        
    doc = pdf_cache[pdf_name]
    
    modified = False
    for q in data:
        q_num = q.get("questionNumber")
        
        target_page = -1
        # Search for question number in PDF
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            
            # Stricter match for "問 23", "問23", "問　23"
            if re.search(r"問\s*" + str(q_num) + r"(?!\d)", text):
                target_page = page_num
                break
                
        if target_page != -1:
            q["pdfPage"] = target_page + 1 # 1-indexed
            q["pdfUrl"] = f"https://www.unkan-net.com/kakomon/{pdf_name}"
            modified = True
        else:
            print(f"Could not find Question {q_num} in {pdf_name}")
            
    if modified:
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Updated {json_file} with pdfPage information.")

print("Finished updating JSONs with pdfPage.")
