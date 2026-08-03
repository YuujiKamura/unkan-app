"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import EditQuestionModal from './EditQuestionModal';

import { apiClient } from '../lib/apiClient';

type Question = {
  id: number;
  year: string;
  questionNumber: number;
  field: string | null;
  content: string | null;
  correctAnswer: number;
  explanation: string | null;
  isBookmarked: boolean;
  isDebated: boolean;
  options?: { optionNumber: number; content: string; isCorrect?: boolean }[];
};

export default function Quiz({ mode }: { mode: 'random' | 'review' }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const IS_SPA_MODE = process.env.NEXT_PUBLIC_APP_MODE === 'spa' || (typeof window !== 'undefined' && window.location.hostname.includes('github.io'));
    
    if (IS_SPA_MODE) {
      import('../lib/dataRepository').then(({ getQuestionsClient, getAttemptsClient }) => {
        getQuestionsClient().then(allQs => {
          let candidates = allQs.filter(q => q.content && !['平成26年', '平成27年', '平成28年', '平成29年', '平成30年'].includes(q.year));
          
          const bookmarks = (() => { try { return JSON.parse(localStorage.getItem('unkan_spa_bookmarks') || '{}'); } catch { return {}; } })();
          const debates = (() => { try { return JSON.parse(localStorage.getItem('unkan_spa_debates') || '{}'); } catch { return {}; } })();
          const explanations = (() => { try { return JSON.parse(localStorage.getItem('unkan_spa_explanations') || '{}'); } catch { return {}; } })();
          const attempts = getAttemptsClient();

          if (mode === 'review') {
            candidates = candidates.filter(q => {
              if (bookmarks[q.id]) return true;
              return attempts.some((a: any) => a.questionId === q.id && !a.isCorrect);
            });
          }

          for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
          }
          
          const selected = candidates.slice(0, 10).map(q => ({
            ...q,
            isBookmarked: bookmarks[q.id] || false,
            isDebated: debates[q.id] || false,
            explanation: explanations[q.id] || q.explanation || null
          }));
          
          setQuestions(selected);
        });
      });
    } else {
      fetch(`/api/questions?limit=10&mode=${mode}`)
        .then(res => res.json())
        .then(data => setQuestions(data));
    }
  }, [mode]);

  if (questions.length === 0) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '20vh' }}>
        <h3>{mode === 'review' ? '復習対象の問題が見つかりません。優秀です！' : '問題を取得中...'}</h3>
        {mode === 'review' && <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>ホームに戻る</Link>}
      </div>
    );
  }

  if (currentIndex >= questions.length) {
    return (
      <div className="container animate-fade-in-up" style={{ textAlign: 'center', marginTop: '10vh' }}>
        <h2 className="text-gradient" style={{ fontSize: '3rem' }}>演習完了！</h2>
        <p style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
          正答数: {score} / {questions.length}
        </p>
        <Link href="/" className="btn btn-primary">ホームに戻る</Link>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  const checkIsVoided = (q: Question) => {
    return q.correctAnswer === null && (!q.options || q.options.every((o: any) => !o.isCorrect));
  };

  const isOptionFactuallyCorrect = (q: Question, optionNum: number) => {
    if (q.options && q.options.length > 0) {
      const opt = q.options.find((o: any) => o.optionNumber === optionNum);
      if (opt && typeof opt.isCorrect === 'boolean') {
        return opt.isCorrect;
      }
    }
    return optionNum === q.correctAnswer;
  };

  const isPointAwarded = (q: Question, optionNum: number) => {
    if (checkIsVoided(q)) return true;
    return isOptionFactuallyCorrect(q, optionNum);
  };

  const getCorrectAnswersText = (q: Question) => {
    if (checkIsVoided(q)) return '解なし(不適切問題)';
    if (q.options && q.options.length > 0) {
      const corrects = q.options.filter((o: any) => o.isCorrect).map((o: any) => o.optionNumber);
      if (corrects.length > 0) return corrects.join(', ');
    }
    return q.correctAnswer || '不明';
  };

  const handleSelect = async (optionNumber: number) => {
    if (isAnswered) return;
    setSelectedOption(optionNumber);
    setIsAnswered(true);
    const isCorrect = isPointAwarded(currentQ, optionNumber);
    
    if (isCorrect) {
      setScore(score + 1);
    }

    // ログ記録
    await apiClient.saveAttempt({
      questionId: currentQ.id,
      selectedOptions: optionNumber.toString(),
      isCorrect
    });
  };

  const toggleBookmark = async () => {
    const newStatus = !currentQ.isBookmarked;
    const newQuestions = [...questions];
    newQuestions[currentIndex].isBookmarked = newStatus;
    setQuestions(newQuestions);

    await apiClient.toggleBookmark(currentQ.id, newStatus);
  };

  const toggleDebate = async () => {
    const newStatus = !currentQ.isDebated;
    
    // Update local state for current question
    const updatedQuestions = [...questions];
    updatedQuestions[currentIndex] = { ...currentQ, isDebated: newStatus };
    setQuestions(updatedQuestions);

    await apiClient.toggleDebate(currentQ.id, newStatus);
  };

  const nextQuestion = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setCurrentIndex(currentIndex + 1);
  };

  const copyToClipboard = async () => {
    if (!currentQ) return;
    
    let text = "";
    if (currentQ.explanation && currentQ.explanation.trim() !== "") {
      text += `以下の運行管理者試験の過去問と、それに対する【ある解説者の解説】の内容が法的に正確か、論理に飛躍や誤りがないかを厳しく検証・添削してください。\n`;
      text += `もし誤りや、運行管理者試験の基準に照らし合わせて不適切な部分があれば指摘し、正しい解説を提示してください。\n\n`;
      text += `=== 問題 ===\n`;
    }

    text += `【${currentQ.year}年度 問${currentQ.questionNumber}】 ${currentQ.field || '分野不明'}\n\n`;
    text += `${currentQ.content || ''}\n\n`;
    
    if (currentQ.options && currentQ.options.length > 0) {
      const sortedOptions = [...currentQ.options].sort((a, b) => a.optionNumber - b.optionNumber);
      sortedOptions.forEach(opt => {
        text += `${opt.optionNumber}. ${opt.content}\n`;
      });
    }

    if (currentQ.explanation && currentQ.explanation.trim() !== "") {
      text += `\n=== 解説者の解説 ===\n`;
      text += `${currentQ.explanation}\n`;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="container animate-fade-in-up" style={{ maxWidth: '800px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <h2 className="text-secondary" style={{ margin: 0 }}>
          {mode === 'review' ? '復習モード' : 'ランダム演習'} ({currentIndex + 1} / {questions.length})
          <span style={{ fontSize: '1rem', marginLeft: '1rem' }}>{currentQ.year}年度 問{currentQ.questionNumber}</span>
        </h2>
        <button 
          onClick={toggleDebate}
          className="btn" 
          style={{ 
            background: currentQ.isDebated ? 'rgba(0, 168, 255, 0.2)' : 'var(--surface-color)', 
            border: `1px solid ${currentQ.isDebated ? 'var(--accent-primary)' : 'var(--surface-border)'}`,
            padding: '0.5rem 1rem', 
            borderRadius: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <span className={currentQ.isDebated ? "text-gradient" : ""} style={{ fontWeight: 'bold', color: currentQ.isDebated ? 'inherit' : 'var(--text-secondary)' }}>
            {currentQ.isDebated ? '✨ ディベート済' : '未解説 (クリックで済にする)'}
          </span>
        </button>
      </header>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ display: 'inline-block', padding: '0.3rem 1rem', background: 'var(--surface-border)', borderRadius: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {currentQ.field || '分野不明'}
            </div>
            <button onClick={copyToClipboard} className="btn" style={{ padding: '0.3rem 0.8rem', background: 'transparent', border: '1px solid var(--surface-border)', borderRadius: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {copied ? '✓ コピー完了' : '📋 コピー'}
            </button>
            <button onClick={() => setIsEditModalOpen(true)} className="btn" style={{ padding: '0.3rem 0.8rem', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', borderRadius: '20px', fontSize: '0.9rem', color: '#38bdf8', fontWeight: 'bold', cursor: 'pointer' }}>
              ✏️ 修正
            </button>
          </div>
          <button onClick={toggleBookmark} className="btn" style={{ padding: '0.5rem 1rem', background: currentQ.isBookmarked ? 'var(--accent-primary)' : 'transparent', border: '1px solid var(--surface-border)', color: currentQ.isBookmarked ? '#fff' : 'inherit' }}>
            {currentQ.isBookmarked ? '★ 要復習リスト(済)' : '☆ 弱点・まぐれ登録'}
          </button>
        </div>
        
        {currentQ.content ? (
          <h3 style={{ marginBottom: '2rem', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
            {currentQ.content}
          </h3>
        ) : (
          <h3 style={{ marginBottom: '2rem', lineHeight: '1.8' }}>
            ※問題データはExcelに登録されていないため、お手元の過去問題集（{currentQ.year}年度 問{currentQ.questionNumber}）をご参照ください。
          </h3>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(currentQ.options && currentQ.options.length > 0 ? currentQ.options : [
            { optionNumber: 1, content: '' },
            { optionNumber: 2, content: '' },
            { optionNumber: 3, content: '' },
            { optionNumber: 4, content: '' }
          ]).sort((a, b) => a.optionNumber - b.optionNumber).map(opt => {
            let btnStyle: React.CSSProperties = { justifyContent: 'flex-start', padding: '1.2rem', width: '100%', textAlign: 'left', fontSize: '1.1rem' };
            let btnClass = "btn btn-secondary";
            
            if (isAnswered) {
              if (isOptionFactuallyCorrect(currentQ, opt.optionNumber)) {
                btnStyle.background = 'var(--success-glow)';
                btnStyle.borderColor = 'var(--success)';
                btnStyle.color = '#fff';
              } else if (selectedOption === opt.optionNumber) {
                if (checkIsVoided(currentQ)) {
                  btnStyle.background = 'var(--success-glow)';
                  btnStyle.borderColor = 'var(--success)';
                  btnStyle.color = '#fff';
                } else {
                  btnStyle.background = 'var(--error-glow)';
                  btnStyle.borderColor = 'var(--error)';
                  btnStyle.color = '#fff';
                }
              }
            } else if (selectedOption === opt.optionNumber) {
              btnClass = "btn btn-primary";
            }

            return (
              <button 
                key={opt.optionNumber} 
                className={btnClass}
                style={btnStyle}
                onClick={() => handleSelect(opt.optionNumber)}
              >
                <span style={{ fontWeight: 'bold', marginRight: '1rem', opacity: 0.7 }}>{opt.optionNumber}.</span> 
                {opt.content || `選択肢 ${opt.optionNumber}`}
              </button>
            )
          })}
        </div>
      </div>

      {isAnswered && (
        <div className="glass-panel animate-fade-in-up" style={{ padding: '2rem', borderTop: `4px solid ${isPointAwarded(currentQ, selectedOption!) ? 'var(--success)' : 'var(--error)'}` }}>
          <h3 style={{ color: isPointAwarded(currentQ, selectedOption!) ? 'var(--success)' : 'var(--error)', marginBottom: '1rem' }}>
            {checkIsVoided(currentQ)
              ? '🎉 正解！（不適切問題のため全員正解）'
              : isPointAwarded(currentQ, selectedOption!) 
                ? '🎉 正解！' 
                : `❌ 不正解... (正答: ${getCorrectAnswersText(currentQ)})`}
          </h3>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            ※まぐれで当たった場合や、まだ理解が不十分な場合は右上の「☆ 弱点・まぐれ登録」を押してコレクトしてください。
          </p>

          {currentQ.explanation && (
            <details style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
              <summary style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', outline: 'none' }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>解説メモ：</p>
              </summary>
              <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', lineHeight: '1.6' }} className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                  {currentQ.explanation}
                </ReactMarkdown>
              </div>
            </details>
          )}
          
          <button className="btn btn-primary" style={{ marginTop: '2rem', width: '100%' }} onClick={nextQuestion}>
            次の問題へ進む ➔
          </button>
        </div>
      )}

      {currentQ && (
        <EditQuestionModal
          question={currentQ}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSaveSuccess={(updated) => {
            setQuestions((prev) =>
              prev.map((q, idx) =>
                idx === currentIndex
                  ? {
                      ...q,
                      ...updated,
                      explanation: updated.explanation || q.explanation,
                    }
                  : q
              )
            );
          }}
        />
      )}
    </div>
  );
}
