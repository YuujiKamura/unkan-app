// src/lib/apiClient.ts

export type AttemptPayload = {
  questionId: number;
  selectedOptions: string;
  isCorrect: boolean;
  reasoning?: string;
  judgments?: Record<string, 'O' | 'X'>;
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
        return attempts.filter(a => a.attemptedAt.startsWith(dateFilter));
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
