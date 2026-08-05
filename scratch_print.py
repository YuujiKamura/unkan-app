import json
import sys

data = json.load(open('C:/Users/yuuji/unkan-app/chunk_f1.json', encoding='utf-8'))
with open('C:/Users/yuuji/unkan-app/scratch_out.txt', 'w', encoding='utf-8') as f:
    for q in data:
        f.write(f"ID: {q['id']}\n")
        f.write(f"CONTENT: {q['content']}\n")
        f.write("-" * 40 + "\n")
