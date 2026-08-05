import fitz
import urllib.request
import os
import sys

if len(sys.argv) < 2:
    print("Usage: python extract_image.py <question_number>")
    sys.exit(1)

q_num = sys.argv[1]

pdf_url = "https://www.unkan-net.com/kakomon/R04.CBT.pdf"
pdf_path = "R04.CBT.pdf"

if not os.path.exists(pdf_path):
    print("Downloading PDF...")
    urllib.request.urlretrieve(pdf_url, pdf_path)
    print("Downloaded.")

print("Opening PDF...")
doc = fitz.open(pdf_path)

target_page = -1
for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text()
    if f"問{q_num}" in text or f"問 {q_num}" in text or f"問　{q_num}" in text:
        target_page = page_num
        print(f"Found Q{q_num} on page {page_num + 1}")
        break

if target_page != -1:
    page = doc[target_page]
    matrix = fitz.Matrix(2.0, 2.0)
    pix = page.get_pixmap(matrix=matrix)
    out_path = f"public/extracted_images/R04.CBT_Q{q_num}.png"
    pix.save(out_path)
    print(f"Saved image to {out_path}")
else:
    print(f"Question {q_num} not found in text.")
