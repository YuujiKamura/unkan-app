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

// attemptedAtはUTCのISO文字列(または Date)で保存されているため、JSTの日付境界
// (0時〜9時台)をUTC文字列の前方一致で判定すると日付がズレる。必ずこの関数で
// JST変換してから日付文字列を取る。
export function toJstDateStr(attemptedAt: string | Date): string {
  const d = new Date(attemptedAt);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().split('T')[0];
}

// 実データでギャップ分布を計測して較正: 閾値15分だと1問あたりの深い調べ物・
// 解説読み込み時間まで削られ、丸一日学習した実感(全体スパン10時間超)に対して
// 3〜5時間しか出なかった。45分にすると内訳が安定し(60分に上げても同じ結果)、
// かつ真に長い休憩(2〜9時間の空白)は正しく除外される。
const DEFAULT_GAP_THRESHOLD_MINUTES = 45;

export function computeAttemptsByDate(
  attempts: AttemptLike[],
  gapThresholdMinutes: number = DEFAULT_GAP_THRESHOLD_MINUTES
): Record<string, DayStat> {
  const byDate = new Map<string, AttemptLike[]>();

  for (const a of attempts) {
    const dateStr = toJstDateStr(a.attemptedAt);
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
