export type DayStat = {
  total: number;
  correct: number;
  // 連続する解答の間隔がgapThresholdMinutes以内のものだけを積算した"実質学習時間"(分)。
  // 休憩や日をまたいだ別セッションの空白は自動的に除外される。最初の1問は直前の
  // 解答が存在せず間隔を測れないため(=助走の読み込み時間は原理的に計測不能)、
  // その分は含まれない。
  activeMinutes: number;
};

type AttemptLike = { attemptedAt: string | Date; isCorrect: boolean };

const DEFAULT_GAP_THRESHOLD_MINUTES = 15;

export function computeAttemptsByDate(
  attempts: AttemptLike[],
  gapThresholdMinutes: number = DEFAULT_GAP_THRESHOLD_MINUTES
): Record<string, DayStat> {
  const byDate = new Map<string, AttemptLike[]>();

  for (const a of attempts) {
    const d = new Date(a.attemptedAt);
    d.setHours(d.getHours() + 9); // JST
    const dateStr = d.toISOString().split('T')[0];
    const list = byDate.get(dateStr) || [];
    list.push(a);
    byDate.set(dateStr, list);
  }

  const gapThresholdMs = gapThresholdMinutes * 60 * 1000;
  const result: Record<string, DayStat> = {};

  for (const [dateStr, list] of byDate) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime()
    );

    let activeMs = 0;
    for (let i = 1; i < sorted.length; i++) {
      const gapMs = new Date(sorted[i].attemptedAt).getTime() - new Date(sorted[i - 1].attemptedAt).getTime();
      if (gapMs > 0 && gapMs <= gapThresholdMs) {
        activeMs += gapMs;
      }
    }

    result[dateStr] = {
      total: sorted.length,
      correct: sorted.filter((a) => a.isCorrect).length,
      activeMinutes: Math.round(activeMs / 60000)
    };
  }

  return result;
}
