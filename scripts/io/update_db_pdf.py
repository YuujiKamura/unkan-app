import sqlite3
import json
import glob
import os

year_map = {
    "R06.CBT": "令和6年 (CBT)",
    "R05.CBT": "令和5年 (CBT)",
    "R04.CBT": "令和4年 (CBT)",
    "R03.CBT": "令和3年 (CBT)",
    "R02.CBT": "令和2年 (CBT)",
    "R02.1": "令和2年 第1回"
}

conn = sqlite3.connect('prisma/dev.db')
cursor = conn.cursor()

for json_file in glob.glob('data/json/*.json'):
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    basename = os.path.basename(json_file).replace(".json", "")
    parts = basename.split("_")
    year_prefix = parts[0]
    
    db_year = year_map.get(year_prefix)
    if not db_year:
        print(f"Unknown year prefix: {year_prefix}")
        continue
    
    for q in data:
        q_num = q.get('questionNumber')
        pdf_page = q.get('pdfPage')
        pdf_url = q.get('pdfUrl')
        
        if pdf_page is not None and pdf_url is not None:
            cursor.execute("""
                UPDATE Question 
                SET pdfPage = ?, pdfUrl = ?
                WHERE year = ? AND questionNumber = ?
            """, (pdf_page, pdf_url, db_year, q_num))

conn.commit()
conn.close()
print("Database updated!")
