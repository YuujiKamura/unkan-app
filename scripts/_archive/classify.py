import json

def classify(q):
    content = q['content']
    options = q.get('options', [])
    full_text = content + " " + " ".join([o.get('content', '') for o in options])
    
    k_tags = []
    s_tags = []
    
    # 道路交通法 context is guaranteed by chunk_f3.json
    
    is_parking_license = False
    is_prohibited = False
    is_traffic_rule = False
    
    if "酒気" in full_text or "過労" in full_text or "過積載" in full_text or "飲酒" in full_text:
        is_prohibited = True
        
    if "駐車" in full_text or "免許" in full_text or "罰金" in full_text or "拘禁刑" in full_text or "点数制度" in full_text:
        is_parking_license = True
        
    if "自動車の種類" in full_text:
        is_parking_license = True
        
    if "交通方法" in full_text or "追越し" in full_text or "徐行" in full_text or "交差点" in full_text or "横断" in full_text or "速度" in full_text or "標識" in full_text or "灯火" in full_text or "合図" in full_text or "歩行者" in full_text or "通行" in full_text or "用語の定義" in full_text:
        is_traffic_rule = True
        
    # If nothing matched, default to 通行ルール
    if not is_prohibited and not is_parking_license and not is_traffic_rule:
        is_traffic_rule = True
        
    # It's possible to have multiple, let's limit to 1-2.
    if is_prohibited:
        k_tags.append("#禁止行為(過労・酒気・過積載)")
    if is_parking_license and len(k_tags) < 2:
        k_tags.append("#道交法(駐車・免許・罰則)")
    if is_traffic_rule and len(k_tags) < 2 and not (is_prohibited and is_parking_license):
        k_tags.append("#道交法(通行ルール)")
        
    if not k_tags:
        k_tags.append("#道交法(通行ルール)")
        
    # Situation categories
    if "標識の画像あり" in full_text or "図の標識は" in full_text or "下の道路標識は" in full_text or "掲げる標識" in full_text or "標識の画像" in full_text or "標識" in content:
        # Note: sometimes content just says "道路標識等により" which is not a picture. 
        # Check carefully for picture mentions:
        if "掲げる標識" in content or "図の標識" in content or "下の道路標識" in content or "標識の画像" in full_text:
            s_tags.append("#図表・写真問題")
            
    # Format output
    return {
        "id": q["id"],
        "knowledgeTags": ",".join(k_tags),
        "situationCategory": ",".join(s_tags)
    }

def main():
    with open('chunk_f3.json', encoding='utf-8') as f:
        data = json.load(f)
        
    results = [classify(q) for q in data]
    
    with open('result_f3.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    main()
