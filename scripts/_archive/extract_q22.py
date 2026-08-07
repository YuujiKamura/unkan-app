import fitz
import urllib.request
import os

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
    if "問22" in text or "問 22" in text or "問　22" in text:
        target_page = page_num
        print(f"Found Q22 on page {page_num + 1}")
        break

if target_page != -1:
    page = doc[target_page]
    # Render page to an image
    # Increase resolution
    matrix = fitz.Matrix(2.0, 2.0)
    pix = page.get_pixmap(matrix=matrix)
    out_path = "public/extracted_images/R04.CBT_Q22.png"
    pix.save(out_path)
    print(f"Saved image to {out_path}")
else:
    print("Question 22 not found in text. Saving first page as fallback...")
    page = doc[0]
    matrix = fitz.Matrix(2.0, 2.0)
    pix = page.get_pixmap(matrix=matrix)
    out_path = "public/extracted_images/R04.CBT_Q22.png"
    pix.save(out_path)
    print(f"Saved fallback image to {out_path}")
