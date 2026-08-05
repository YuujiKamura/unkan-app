import json
import os

results = [
  {"id": 122, "knowledgeTags": "#許可・届出・認可", "situationCategory": ""},
  {"id": 123, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 124, "knowledgeTags": "#運行管理者の業務・選任", "situationCategory": ""},
  {"id": 125, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 126, "knowledgeTags": "#事故報告", "situationCategory": "#事故事例・実務ケース"},
  {"id": 127, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 128, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 129, "knowledgeTags": "#運行管理者の業務・選任", "situationCategory": ""},
  {"id": 158, "knowledgeTags": "#許可・届出・認可", "situationCategory": ""},
  {"id": 159, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 160, "knowledgeTags": "#許可・届出・認可", "situationCategory": ""},
  {"id": 161, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 162, "knowledgeTags": "#事故報告", "situationCategory": "#事故事例・実務ケース"},
  {"id": 163, "knowledgeTags": "#運行管理者の業務・選任", "situationCategory": ""},
  {"id": 164, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 165, "knowledgeTags": "#帳票類・記録の保存", "situationCategory": ""},
  {"id": 248, "knowledgeTags": "#許可・届出・認可", "situationCategory": ""},
  {"id": 249, "knowledgeTags": "#許可・届出・認可", "situationCategory": ""},
  {"id": 250, "knowledgeTags": "#運行管理者の業務・選任", "situationCategory": ""},
  {"id": 251, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 252, "knowledgeTags": "#事故報告", "situationCategory": "#事故事例・実務ケース"},
  {"id": 253, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 254, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 255, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 278, "knowledgeTags": "#許可・届出・認可", "situationCategory": ""},
  {"id": 279, "knowledgeTags": "#運行管理者の業務・選任", "situationCategory": ""},
  {"id": 280, "knowledgeTags": "#運行管理者の業務・選任", "situationCategory": ""},
  {"id": 281, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 282, "knowledgeTags": "#事故報告", "situationCategory": "#事故事例・実務ケース"},
  {"id": 283, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 284, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 285, "knowledgeTags": "#帳票類・記録の保存", "situationCategory": ""},
  {"id": 312, "knowledgeTags": "#許可・届出・認可", "situationCategory": ""},
  {"id": 313, "knowledgeTags": "#運行管理者の業務・選任", "situationCategory": ""},
  {"id": 314, "knowledgeTags": "#運行管理者の業務・選任", "situationCategory": ""},
  {"id": 315, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 316, "knowledgeTags": "#事故報告", "situationCategory": "#事故事例・実務ケース"},
  {"id": 317, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 318, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""},
  {"id": 319, "knowledgeTags": "#点呼・乗務制限(安全規則)", "situationCategory": ""}
]

with open('C:/Users/yuuji/unkan-app/result_f1.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("Done writing to result_f1.json")
