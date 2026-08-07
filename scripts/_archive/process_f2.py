import json

def classify(text):
    tags = []
    category = ""
    
    if "保安基準及びその細目を定める告示" in text:
        tags.append("#保安基準(寸法・重量・灯火・装備)")
    elif "点検整備等に関する" in text:
        tags.append("#日常点検・定期点検")
    elif "自動車の登録等" in text or "検査等について" in text or "検査等" in text:
        tags.append("#自動車の登録・車検")
    else:
        if "点検" in text or "整備" in text:
            tags.append("#日常点検・定期点検")
        elif "登録" in text or "車検" in text:
            tags.append("#自動車の登録・車検")
        elif "保安基準" in text:
            tags.append("#保安基準(寸法・重量・灯火・装備)")
        else:
            tags.append("#自動車の登録・車検")
            
    return tags, category

with open("C:/Users/yuuji/unkan-app/chunk_f2.json", "r", encoding="utf-8") as f:
    data = json.load(f)

results = []
for q in data:
    tags, category = classify(q["content"])
    results.append({
        "id": q["id"],
        "knowledgeTags": ",".join(tags),
        "situationCategory": category
    })

with open("C:/Users/yuuji/unkan-app/result_f2.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("Done. Wrote to C:/Users/yuuji/unkan-app/result_f2.json")
