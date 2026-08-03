import os
import fitz  # PyMuPDF
from pathlib import Path

PDF_DIR = Path("data/pdf")
IMG_DIR = Path("data/images")

def convert_pdf_to_images(pdf_path):
    doc = fitz.open(pdf_path)
    output_dir = IMG_DIR / pdf_path.stem
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Converting {pdf_path.name} ({len(doc)} pages)...")
    for i in range(len(doc)):
        page = doc[i]
        # 解像度を上げる (zoom_x, zoom_y) 
        zoom = 2.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        
        output_file = output_dir / f"page_{i+1:03d}.png"
        pix.save(output_file)
        
    print(f"  -> Saved {len(doc)} images to {output_dir}")

def main():
    if not PDF_DIR.exists():
        print(f"Error: Directory {PDF_DIR} does not exist.")
        return
        
    for pdf_file in PDF_DIR.glob("*.pdf"):
        convert_pdf_to_images(pdf_file)

if __name__ == "__main__":
    main()
