import os
import glob
import json
import base64
import requests
import re
import time
from pathlib import Path

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("No GEMINI_API_KEY found")
    exit(1)

# Endpoint for gemini-1.5-pro
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={api_key}"

prompt = """
You are an expert OCR parser. Your task is to process the provided image of a Japanese exam (運行管理者試験 貨物) and transcribe the questions with 100% precision.
For each question, extract the question number (問1, 問2 etc. -> 1, 2), main content text, and choices 1-4.
Fix any OCR typos or line breaks so it reads as perfect natural Japanese text. Do not omit any question or option.
Output your response as a pure JSON array containing an object for each question, using exactly the following structure:
[
  {
    "questionNumber": 1,
    "content": "...",
    "choices": {
      "1": "...",
      "2": "...",
      "3": "...",
      "4": "..."
    }
  }
]
IMPORTANT: Return ONLY the JSON array, with no markdown code blocks or extra text. If the page does not contain any questions (e.g., cover page or answer key), return an empty array [].
"""

IMG_ROOT = Path(r"C:\Users\yuuji\unkan-app\data\images")
JSON_DIR = Path(r"C:\Users\yuuji\unkan-app\data\json")
JSON_DIR.mkdir(parents=True, exist_ok=True)

def process_directory(img_dir):
    dir_name = img_dir.name
    out_path = JSON_DIR / f"{dir_name}.json"
    if out_path.exists():
        print(f"Skipping {dir_name}, output already exists.")
        return

    images = list(img_dir.glob("*.png"))
    images.sort()
    
    all_questions = []
    
    for img_path in images:
        filename = img_path.name
        print(f"[{dir_name}] Processing {filename}...")
        
        with open(img_path, "rb") as f:
            img_data = f.read()
        
        b64_img = base64.b64encode(img_data).decode("utf-8")
        
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": "image/png",
                            "data": b64_img
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.0
            }
        }
        
        headers = {'Content-Type': 'application/json'}
        
        retries = 3
        for attempt in range(retries):
            try:
                resp = requests.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                if 'candidates' not in data or not data['candidates']:
                    print(f"  No candidates returned for {filename}")
                    break
                
                text_resp = data['candidates'][0]['content']['parts'][0]['text'].strip()
                
                # Remove markdown if present
                if text_resp.startswith("```json"):
                    text_resp = text_resp[7:]
                if text_resp.startswith("```"):
                    text_resp = text_resp[3:]
                if text_resp.endswith("```"):
                    text_resp = text_resp[:-3]
                text_resp = text_resp.strip()
                
                qs = json.loads(text_resp)
                if isinstance(qs, list):
                    all_questions.extend(qs)
                else:
                    all_questions.append(qs)
                
                print(f"  Found {len(qs) if isinstance(qs, list) else 1} questions in {filename}")
                time.sleep(2) # rate limit prevention
                break
            except Exception as e:
                print(f"  Error on {filename} attempt {attempt+1}: {e}")
                if hasattr(e, 'response') and e.response:
                    print(e.response.text)
                time.sleep(5)
                
    final_qs = [q for q in all_questions if "questionNumber" in q]
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(final_qs, f, ensure_ascii=False, indent=2)
    print(f"Done! Saved {len(final_qs)} questions to {out_path}")

def main():
    if not IMG_ROOT.exists():
        print(f"Error: {IMG_ROOT} not found.")
        return
    for d in IMG_ROOT.iterdir():
        if d.is_dir():
            process_directory(d)

if __name__ == "__main__":
    main()
