const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const fs = require("fs");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY not found");
  process.exit(1);
}

const fileManager = new GoogleAIFileManager(apiKey);
const genAI = new GoogleGenerativeAI(apiKey);

async function main() {
  const filePath = "data/pdf/R04.CBT.pdf";
  console.log(`Uploading ${filePath} to Gemini...`);
  const uploadResult = await fileManager.uploadFile(filePath, {
    mimeType: "application/pdf",
    displayName: "R04 CBT Questions",
  });
  const fileUri = uploadResult.file.uri;
  console.log(`Upload complete. URI: ${fileUri}`);
  
  // PDFの処理にはgemini-1.5-proが推奨
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.0,
    }
  });

  const prompt = `あなたは「運行管理者試験（貨物）」の試験問題を解析・構造化するAIです。
添付したPDFには、全30問の試験問題が含まれています。これを読み取り、以下のJSON配列として厳格に出力してください。
ルール:
1. 全30問（問1〜問30）をもれなく抽出すること。
2. もし問題文や選択肢の中に「図、標識、運行計画表、グラフ」などの視覚的な要素が含まれており、文字情報だけ抽出しても解答不可能な問題である場合は、knowledgeTags に "#NEEDS_IMAGE" という文字列を必ず追加してください。文字だけで解ける場合は空文字列 "" にしてください。
3. 問題形式が「〜正しいものを1つ選びなさい」「〜誤っているものを1つ選びなさい」のように単一の選択肢から選ぶ場合は、formatを "SINGLE" にし、各選択肢を options に含めてください。
4. 問題形式が「A,B,C,Dに入るべき字句を選べ」のような複数穴埋めでグループ化された選択肢群（[A]の群、[B]の群...）や、問1〜問3のように中問で構成されている場合は format を "MULTI_GROUP" とし、構造化されたデータを options の "structuredData" など工夫して格納するか、あるいは全ての肢を1つのリストにまとめても構いません。
5. 現時点では正解が不明なため、isCorrect は全て false に設定してください。

出力JSONスキーマ:
[
  {
    "questionNumber": number,
    "pdfPage": number, // この問題が記載されているPDFの元ページ番号（1から始まる整数）
    "content": "問題文のテキスト（図表があれば「※図表は外部PDF参照」等と追記）",
    "format": "SINGLE" | "MULTI_GROUP",
    "knowledgeTags": "#NEEDS_IMAGE" | "",
    "options": [
      {
        "optionNumber": number,
        "content": "選択肢のテキスト",
        "isCorrect": false
      }
    ]
  }
]
`;

  console.log("Requesting parsing...");
  const result = await model.generateContent([
    {
      fileData: {
        mimeType: uploadResult.file.mimeType,
        fileUri: uploadResult.file.uri
      }
    },
    { text: prompt },
  ]);
  
  const text = result.response.text();
  fs.writeFileSync("data/json/R04.CBT_parsed.json", text, "utf8");
  console.log("Done! Saved to data/json/R04.CBT_parsed.json");
}

main().catch(console.error);
