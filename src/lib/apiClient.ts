// src/lib/apiClient.ts

import { getQuestionsClient } from './dataRepository';
import { toJstDateStr } from './attemptStats';

export type AttemptPayload = {
  questionId: number;
  selectedOptions: string;
  isCorrect: boolean;
  reasoning?: string;
  judgments?: Record<string, 'O' | 'X'>;
};

export type CorrectionPayload = {
  questionId: number;
  optionNumber: number;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  correctionText: string;
};

export type OptionCorrectionRecord = CorrectionPayload & { id: number; createdAt: string };

export type ExportedAttempt = {
  isCorrect: boolean;
  selectedOptions: string;
  reasoning?: string;
  attemptedAt: string;
};

export type ExportedCorrection = {
  optionNumber: number;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  correctionText: string;
  createdAt: string;
};

export type UserDataExportItem = {
  year: string | null;
  questionNumber: number | null;
  meta: { isBookmarked: boolean } | null;
  attempts: ExportedAttempt[];
  explanation: { content: string | null; isDebated: boolean } | null;
  corrections: ExportedCorrection[];
};

// 環境変数等で SPA (LocalStorage) モードか App (API) モードかを切り替える
// Vite 等でビルドする場合は、ここで true になるようなフラグを設ける
const IS_SPA_MODE = process.env.NEXT_PUBLIC_APP_MODE === 'spa' || typeof window !== 'undefined' && window.location.hostname.includes('github.io');

/**
 * データアクセス層のアダプター
 * App環境ではNext.jsのAPIルートを叩き、SPA環境ではLocalStorageにデータを保存する
 */
export const apiClient = {
  async saveExplanation(questionId: number, content: string): Promise<void> {
    if (IS_SPA_MODE) {
      const data = getLocalData<Record<number, string>>('explanations', {});
      data[questionId] = content;
      setLocalData('explanations', data);
      return Promise.resolve();
    }
    
    await fetch(`/api/questions/${questionId}/explanation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
  },

  async toggleDebate(questionId: number, isDebated: boolean): Promise<void> {
    if (IS_SPA_MODE) {
      const data = getLocalData<Record<number, boolean>>('debates', {});
      data[questionId] = isDebated;
      setLocalData('debates', data);
      return Promise.resolve();
    }

    await fetch(`/api/questions/${questionId}/debate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDebated })
    });
  },

  async toggleBookmark(questionId: number, isBookmarked: boolean): Promise<void> {
    if (IS_SPA_MODE) {
      const data = getLocalData<Record<number, boolean>>('bookmarks', {});
      data[questionId] = isBookmarked;
      setLocalData('bookmarks', data);
      return Promise.resolve();
    }

    await fetch(`/api/questions/${questionId}/bookmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBookmarked })
    });
  },

  async saveAttempt(payload: AttemptPayload): Promise<{ id: number }> {
    if (IS_SPA_MODE) {
      const attempts = getLocalData<any[]>('attempts', []);
      const newAttempt = {
        id: Date.now(), // 簡易的な一意ID
        ...payload,
        attemptedAt: new Date().toISOString()
      };
      attempts.unshift(newAttempt);
      setLocalData('attempts', attempts);
      return Promise.resolve({ id: newAttempt.id });
    }

    const res = await fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Failed to log attempt: ${err.error}`);
    }
    return res.json();
  },

  async updateAttemptReasoning(attemptId: number, reasoning: string): Promise<any> {
    if (IS_SPA_MODE) {
      const attempts = getLocalData<any[]>('attempts', []);
      const attemptIndex = attempts.findIndex(a => a.id === attemptId);
      if (attemptIndex !== -1) {
        attempts[attemptIndex].reasoning = reasoning;
        setLocalData('attempts', attempts);
        return Promise.resolve(attempts[attemptIndex]);
      }
      throw new Error('Attempt not found in LocalStorage');
    }

    const res = await fetch(`/api/attempts/${attemptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reasoning })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Failed to update reasoning: ${err.error}`);
    }
    return res.json();
  },

  async getAttempts(dateFilter?: string): Promise<any[]> {
    if (IS_SPA_MODE) {
      const attempts = getLocalData<any[]>('attempts', []);
      if (dateFilter) {
        // attemptedAtはUTC文字列なのでJST変換してから日付を比較する
        // (単純な前方一致だとJST 0〜9時台の解答が別日にズレる)
        return attempts.filter(a => toJstDateStr(a.attemptedAt) === dateFilter);
      }
      return attempts;
    }

    const url = dateFilter ? `/api/attempts?date=${dateFilter}` : '/api/attempts';
    const res = await fetch(url);
    if (!res.ok) return [];
    return res.json();
  },

  async getAllAttempts(): Promise<any[]> {
    if (IS_SPA_MODE) {
      return getLocalData<any[]>('attempts', []);
    }
    const res = await fetch('/api/attempts?all=true');
    if (!res.ok) return [];
    return res.json();
  },

  async saveCorrection(payload: CorrectionPayload): Promise<OptionCorrectionRecord> {
    if (IS_SPA_MODE) {
      const data = getLocalData<Record<number, OptionCorrectionRecord[]>>('corrections', {});
      const list = data[payload.questionId] || [];
      const newItem: OptionCorrectionRecord = { id: Date.now(), ...payload, createdAt: new Date().toISOString() };
      list.push(newItem);
      data[payload.questionId] = list;
      setLocalData('corrections', data);
      return Promise.resolve(newItem);
    }

    const res = await fetch(`/api/questions/${payload.questionId}/corrections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Failed to save correction: ${err.error}`);
    }
    return res.json();
  },

  // SPAモード専用: localStorage上の全ユーザーデータをquestionId単位のまま生で返す
  // (questions.json一覧ページ等でinitialQuestionsにクライアント側マージするために使う)
  getLocalUserData(): {
    attempts: (AttemptPayload & { id: number; attemptedAt: string })[];
    bookmarks: Record<number, boolean>;
    explanations: Record<number, string>;
    debates: Record<number, boolean>;
    corrections: Record<number, OptionCorrectionRecord[]>;
  } {
    return {
      attempts: getLocalData('attempts', []),
      bookmarks: getLocalData('bookmarks', {}),
      explanations: getLocalData('explanations', {}),
      debates: getLocalData('debates', {}),
      corrections: getLocalData('corrections', {})
    };
  },

  async deleteCorrection(id: number, questionId?: number): Promise<void> {
    if (IS_SPA_MODE) {
      if (questionId === undefined) return;
      const data = getLocalData<Record<number, OptionCorrectionRecord[]>>('corrections', {});
      data[questionId] = (data[questionId] || []).filter((c) => c.id !== id);
      setLocalData('corrections', data);
      return Promise.resolve();
    }

    await fetch(`/api/corrections/${id}`, { method: 'DELETE' });
  },

  async updateCorrection(id: number, correctionText: string, questionId?: number): Promise<void> {
    if (IS_SPA_MODE) {
      if (questionId === undefined) return;
      const data = getLocalData<Record<number, OptionCorrectionRecord[]>>('corrections', {});
      const list = data[questionId] || [];
      const idx = list.findIndex((c) => c.id === id);
      if (idx !== -1) list[idx] = { ...list[idx], correctionText };
      data[questionId] = list;
      setLocalData('corrections', data);
      return Promise.resolve();
    }

    await fetch(`/api/corrections/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correctionText })
    });
  },

  async exportUserData(): Promise<UserDataExportItem[]> {
    if (IS_SPA_MODE) {
      const questions = await getQuestionsClient();
      const bookmarks = getLocalData<Record<number, boolean>>('bookmarks', {});
      const explanations = getLocalData<Record<number, string>>('explanations', {});
      const debates = getLocalData<Record<number, boolean>>('debates', {});
      const attempts = getLocalData<(AttemptPayload & { id: number; attemptedAt: string })[]>('attempts', []);
      const corrections = getLocalData<Record<number, OptionCorrectionRecord[]>>('corrections', {});

      const attemptsByQuestion = new Map<number, (AttemptPayload & { id: number; attemptedAt: string })[]>();
      for (const a of attempts) {
        const list = attemptsByQuestion.get(a.questionId) || [];
        list.push(a);
        attemptsByQuestion.set(a.questionId, list);
      }

      const questionIds = new Set<number>([
        ...Object.keys(bookmarks).map(Number),
        ...Object.keys(explanations).map(Number),
        ...attemptsByQuestion.keys(),
        ...Object.keys(corrections).map(Number),
      ]);

      const result: UserDataExportItem[] = [];
      for (const qid of questionIds) {
        const q = questions.find((qq) => qq.id === qid);
        if (!q) continue;

        const hasMeta = qid in bookmarks;
        const hasExplanation = qid in explanations;
        const qAttempts = attemptsByQuestion.get(qid) || [];
        const qCorrections = corrections[qid] || [];
        if (!hasMeta && !hasExplanation && qAttempts.length === 0 && qCorrections.length === 0) continue;

        result.push({
          year: q.year,
          questionNumber: q.questionNumber,
          meta: hasMeta ? { isBookmarked: bookmarks[qid] } : null,
          attempts: qAttempts.map((a) => ({
            isCorrect: a.isCorrect,
            selectedOptions: a.selectedOptions,
            reasoning: a.reasoning,
            attemptedAt: a.attemptedAt
          })),
          explanation: hasExplanation ? { content: explanations[qid], isDebated: debates[qid] || false } : null,
          corrections: qCorrections.map((c) => ({
            optionNumber: c.optionNumber,
            selectedText: c.selectedText,
            startOffset: c.startOffset,
            endOffset: c.endOffset,
            correctionText: c.correctionText,
            createdAt: c.createdAt
          }))
        });
      }
      return result;
    }

    const res = await fetch('/api/userdata/export');
    if (!res.ok) throw new Error('Export failed');
    return res.json();
  },

  async importUserData(data: UserDataExportItem[]): Promise<{ success: boolean; updatedCount: number }> {
    if (IS_SPA_MODE) {
      const questions = await getQuestionsClient();
      const bookmarks = getLocalData<Record<number, boolean>>('bookmarks', {});
      const explanations = getLocalData<Record<number, string>>('explanations', {});
      const debates = getLocalData<Record<number, boolean>>('debates', {});
      const attempts = getLocalData<(AttemptPayload & { id: number; attemptedAt: string })[]>('attempts', []);
      const corrections = getLocalData<Record<number, OptionCorrectionRecord[]>>('corrections', {});

      let updatedCount = 0;
      let seq = 0;

      for (const item of data) {
        if (!item.year || item.questionNumber === undefined) continue;
        const q = questions.find((qq) => qq.year === item.year && qq.questionNumber === item.questionNumber);
        if (!q) continue;

        if (item.meta) bookmarks[q.id] = !!item.meta.isBookmarked;

        if (item.explanation) {
          explanations[q.id] = item.explanation.content || '';
          debates[q.id] = !!item.explanation.isDebated;
        }

        if (item.attempts && Array.isArray(item.attempts)) {
          for (let i = attempts.length - 1; i >= 0; i--) {
            if (attempts[i].questionId === q.id) attempts.splice(i, 1);
          }
          for (const a of item.attempts) {
            attempts.push({
              id: Date.now() + (seq++),
              questionId: q.id,
              isCorrect: a.isCorrect,
              selectedOptions: a.selectedOptions,
              reasoning: a.reasoning,
              attemptedAt: a.attemptedAt || new Date().toISOString()
            });
          }
        }

        if (item.corrections && Array.isArray(item.corrections)) {
          corrections[q.id] = item.corrections.map((c) => ({
            id: Date.now() + (seq++),
            questionId: q.id,
            optionNumber: c.optionNumber,
            selectedText: c.selectedText,
            startOffset: c.startOffset,
            endOffset: c.endOffset,
            correctionText: c.correctionText || '',
            createdAt: c.createdAt || new Date().toISOString()
          }));
        }

        updatedCount++;
      }

      setLocalData('bookmarks', bookmarks);
      setLocalData('explanations', explanations);
      setLocalData('debates', debates);
      setLocalData('attempts', attempts);
      setLocalData('corrections', corrections);

      return { success: true, updatedCount };
    }

    const res = await fetch('/api/userdata/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Import failed');
    return res.json();
  }
};

// --- Helper Functions for SPA Mode (LocalStorage) ---

function getLocalData<T>(key: string, defaultValue: any = {}): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(`unkan_spa_${key}`);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalData(key: string, value: any): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`unkan_spa_${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to LocalStorage', e);
  }
}
