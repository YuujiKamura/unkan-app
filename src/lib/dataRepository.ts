export interface Question {
  id: number;
  year: string;
  questionNumber: number;
  majorField: string | null;
  subField: string | null;
  field: string | null;
  content: string;
  options: any[];
  correctAnswer: number;
  knowledgeTags?: string | null;
  explanation?: string | null;
  isDebated?: boolean;
}

let cachedQuestions: Question[] | null = null;

// クライアントサイドでの questions.json の取得
export async function getQuestionsClient(): Promise<Question[]> {
  if (cachedQuestions) {
    return cachedQuestions;
  }

  try {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const res = await fetch(`${basePath}/data/questions.json`);
    if (res.ok) {
      cachedQuestions = await res.json();
      return cachedQuestions || [];
    }
  } catch (e) {
    console.error("Failed to load questions.json", e);
  }

  return [];
}

// クライアントサイドでの単一問題取得
export async function getQuestionByIdClient(id: number): Promise<Question | null> {
  const all = await getQuestionsClient();
  return all.find(q => q.id === id) || null;
}

// ユーザー回答履歴のクライアント保存 (LocalStorage Fallback)
export interface AttemptRecord {
  id?: number;
  questionId: number;
  selectedOptions: string;
  isCorrect: boolean;
  attemptedAt: string;
  reasoning?: string;
}

export function saveAttemptClient(record: AttemptRecord) {
  if (typeof window === 'undefined') return;
  try {
    const existingRaw = localStorage.getItem('unkan_attempts') || '[]';
    const attempts: AttemptRecord[] = JSON.parse(existingRaw);
    attempts.push(record);
    localStorage.setItem('unkan_attempts', JSON.stringify(attempts));
  } catch (e) {
    console.error("Failed to save attempt to localStorage", e);
  }
}

export function getAttemptsClient(): AttemptRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const existingRaw = localStorage.getItem('unkan_attempts') || '[]';
    return JSON.parse(existingRaw);
  } catch {
    return [];
  }
}
