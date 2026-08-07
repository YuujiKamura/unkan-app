import json

with open('chunk_f3.json', encoding='utf-8') as f:
    data = json.load(f)

for q in data:
    print(f"--- ID: {q['id']} ---")
    print(q['content'])
    print()
