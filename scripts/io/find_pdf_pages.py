import json
import os
import fitz
import re

json_file = "public/data/questions.json"
with open(json_file, "r", encoding="utf-8") as f:
    data = json.load(f)

pdf_dir = r"H:\マイドライブ\試験系\うんかん"

year_map = {
    "令和6年 (CBT)": "R06.CBT",
    "令和5年 (CBT)": "R05.CBT",
    "令和4年 (CBT)": "R04.CBT",
    "令和3年 (CBT)": "R03.CBT",
    "令和2年 (CBT)": "R02.CBT",
    "令和2年 第1回": "R02.1",
    "令和元年 第1回": "R01.1"
}

def get_pdf_path(pdf_filename):
    local_path = os.path.join("data", "raw_pdfs", pdf_filename)
    h_drive_path = os.path.join(r"H:\マイドライブ\試験系\うんかん", pdf_filename)
    if os.path.exists(local_path):
        return local_path
    elif os.path.exists(pdf_filename):
        return pdf_filename
    elif os.path.exists(h_drive_path):
        return h_drive_path
    return None

pdf_cache = {}
updated = False

for q in data:
    year = q.get("year")
    q_num = q.get("questionNumber")
    
    if not year or not q_num:
        continue
        
    pdf_name = year_map.get(year)
    if not pdf_name:
        continue
        
    pdf_filename = f"{pdf_name}.pdf"
    
    # Update pdfUrl if missing
    if not q.get("pdfUrl"):
        q["pdfUrl"] = f"https://www.unkan-net.com/kakomon/{pdf_filename}"
        updated = True
        
    # Update pdfPage if missing
    if q.get("pdfPage") is None:
        if pdf_filename not in pdf_cache:
            pdf_path = get_pdf_path(pdf_filename)
            if not pdf_path:
                print(f"Cannot find {pdf_filename}. Please place it in data/raw_pdfs/")
                pdf_cache[pdf_filename] = None
                continue
            print(f"Opening {pdf_path}")
            pdf_cache[pdf_filename] = fitz.open(pdf_path)
            
        doc = pdf_cache[pdf_filename]
        if doc is None:
            continue
            
        target_page = -1
        # regex to match "問 29" or "@29" or "問29"
        pat = re.compile(r"(問\s*" + str(q_num) + r"|@" + str(q_num) + r")")
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            if pat.search(text):
                target_page = page_num + 1 # 1-indexed
                break
                
        if target_page != -1:
            print(f"Found {year} Q{q_num} on page {target_page}")
            q["pdfPage"] = target_page
            updated = True
        else:
            print(f"Could not find {year} Q{q_num} in {pdf_filename}")
            
if updated:
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Updated questions.json")
else:
    print("No updates needed.")
