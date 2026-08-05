import json
import glob
import os
import fitz
import urllib.request
import re

os.makedirs("public/extracted_images", exist_ok=True)

pdf_cache = {}

for json_file in glob.glob("data/json/*.json"):
    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # infer year from filename, e.g. R04.CBT_21_30.json -> R04.CBT
    basename = os.path.basename(json_file).replace(".json", "")
    parts = basename.split("_")
    year = parts[0]
    
    pdf_name = f"{year}.pdf"
    pdf_url = f"https://www.unkan-net.com/kakomon/{pdf_name}"

    for q in data:
        if q.get("knowledgeTags") and "#NEEDS_IMAGE" in q["knowledgeTags"]:
            q_num = q.get("questionNumber")
            
            out_path = f"public/extracted_images/{year}_Q{q_num}.png"
            if os.path.exists(out_path):
                print(f"Already extracted: {out_path}")
                continue
                
            if pdf_name not in pdf_cache:
                if not os.path.exists(pdf_name):
                    print(f"Downloading {pdf_name} from {pdf_url} ...")
                    try:
                        urllib.request.urlretrieve(pdf_url, pdf_name)
                    except Exception as e:
                        print(f"Failed to download {pdf_url}: {e}")
                        continue
                print(f"Opening {pdf_name} ...")
                pdf_cache[pdf_name] = fitz.open(pdf_name)
            
            doc = pdf_cache[pdf_name]
            target_page = -1
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()
                if re.search(r"問\s*"+str(q_num), text) or re.search(r"\s*"+str(q_num), text) or re.search(r"@"+str(q_num), text):
                    target_page = page_num
                    break
                    
            if target_page != -1:
                print(f"Extracting {year} Q{q_num} from page {target_page + 1}")
                page = doc[target_page]
                matrix = fitz.Matrix(2.0, 2.0)
                pix = page.get_pixmap(matrix=matrix)
                pix.save(out_path)
            else:
                print(f"WARNING: Could not find Q{q_num} in {pdf_name}. Using fallback page 0.")
                page = doc[0]
                matrix = fitz.Matrix(2.0, 2.0)
                pix = page.get_pixmap(matrix=matrix)
                pix.save(out_path)

print("Done extracting all images!")
