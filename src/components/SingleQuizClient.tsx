"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { apiClient, OptionCorrectionRecord } from '@/lib/apiClient';
import EditQuestionModal from './EditQuestionModal';
import EmbeddedFlowchart, { FlowchartData } from './EmbeddedFlowchart';
import { INITIAL_PRESETS } from './FlowchartStudio';
import FlowchartLibraryModal from './FlowchartLibraryModal';
import { saveFlowchartToLibrary, getFlowchartLibrary, SavedFlowchartItem } from '@/lib/flowchartLibrary';
import QuestionOptionsRenderer from './QuestionOptionsRenderer';

type ExpSegment = 
  | { type: 'text'; content: string }
  | { type: 'flowchart'; data: FlowchartData; rawBlock: string; refId?: string };

function parseMultiExplanationSegments(raw: string | null): ExpSegment[] {
  if (!raw || !raw.trim()) return [];
  const regex = /```flowchart(?::([a-zA-Z0-9_-]+))?\s*([\s\S]*?)\s*```/g;
  const segments: ExpSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const libraryItems = getFlowchartLibrary();

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      const textChunk = raw.substring(lastIndex, match.index).trim();
      if (textChunk) segments.push({ type: 'text', content: textChunk });
    }

    const refId = match[1];
    const jsonBody = match[2];

    if (refId) {
      const libItem = libraryItems.find(i => i.id === refId);
      if (libItem) {
        segments.push({
          type: 'flowchart',
          data: { nodes: libItem.nodes, edges: libItem.edges },
          rawBlock: match[0],
          refId
        });
      } else {
        segments.push({ type: 'text', content: match[0] });
      }
    } else if (jsonBody) {
      try {
        const flowchartData = JSON.parse(jsonBody);
        segments.push({ type: 'flowchart', data: flowchartData, rawBlock: match[0] });
      } catch {
        segments.push({ type: 'text', content: match[0] });
      }
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    const textChunk = raw.substring(lastIndex).trim();
    if (textChunk) segments.push({ type: 'text', content: textChunk });
  }

  return segments;
}

export default function SingleQuizClient({ 
  initialQuestion, 
  similarQuestions = [],
  nextQuestionId,
  prevQuestionId,
  nextIncorrectId,
  contextModeLabel = '年度別演習',
  groupTitle = '',
  currentPosition = 0,
  totalInGroup = 0,
  navQueryStr = '',
  mode = '',
  groupQuestionIds = []
}: { 
  initialQuestion: any, 
  similarQuestions?: any[],
  nextQuestionId?: number | null,
  prevQuestionId?: number | null,
  nextIncorrectId?: number | null,
  contextModeLabel?: string,
  groupTitle?: string,
  currentPosition?: number,
  totalInGroup?: number,
  navQueryStr?: string,
  mode?: string,
  groupQuestionIds?: number[]
}) {
  const [currentQ, setCurrentQ] = useState(initialQuestion);
  const isMultiMode = currentQ.format === 'MULTI_GROUP';
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [selectedMultiOptions, setSelectedMultiOptions] = useState<Record<number, number>>({});
  const [isAnswered, setIsAnswered] = useState(mode === 'explain');
  const [copied, setCopied] = useState(false);
  const [isEditingExp, setIsEditingExp] = useState(false);
  const [expText, setExpText] = useState(initialQuestion?.explanation || '');
  const [isSavingExp, setIsSavingExp] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState<number | null>(null);
  const [reasoningText, setReasoningText] = useState('');
  const [isSavingReasoning, setIsSavingReasoning] = useState(false);
  const [hasSavedReasoning, setHasSavedReasoning] = useState(false);
  const [judgments, setJudgments] = useState<Record<string, 'O' | 'X'>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [selectedFilterKeyword, setSelectedFilterKeyword] = useState<string | null>(null);
  const [effectiveNextIncorrectId, setEffectiveNextIncorrectId] = useState<number | null>(nextIncorrectId || null);
  const [isLocalEnv, setIsLocalEnv] = useState(false);
  const [isImageMaximized, setIsImageMaximized] = useState(false);

  useEffect(() => {
    setIsLocalEnv(typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
    (async () => {
      try {
        // 解答履歴（LocalStorage / DB）を取得
        const attempts = await apiClient.getAttempts();
        
        // 挑戦カウント（Attempt count > 0）が存在し、かつ直近の解答結果が明確に「不正解」である問題IDのセット
        const incorrectSet = new Set<number>();
        if (attempts && attempts.length > 0) {
          const attemptsByQ = new Map<number, any[]>();
          attempts.forEach((a: any) => {
            if (!attemptsByQ.has(a.questionId)) {
              attemptsByQ.set(a.questionId, []);
            }
            attemptsByQ.get(a.questionId)!.push(a);
          });

          attemptsByQ.forEach((qAttempts, qId) => {
            if (qAttempts.length > 0) {
              const latestAttempt = qAttempts[0];
              const isFail = latestAttempt.isCorrect === false || latestAttempt.isCorrect === 0 || latestAttempt.isCorrect === 'false';
              if (isFail) {
                incorrectSet.add(qId);
              }
            }
          });
        }

        // 現在の演習グループ（groupQuestionIds）内での並び順で巡回探索
        const targetGroupIds = groupQuestionIds && groupQuestionIds.length > 0 ? groupQuestionIds : [currentQ.id];
        const curIdx = targetGroupIds.indexOf(currentQ.id);

        let foundId: number | null = null;
        if (curIdx !== -1 && targetGroupIds.length > 1) {
          for (let step = 1; step < targetGroupIds.length; step++) {
            const checkId = targetGroupIds[(curIdx + step) % targetGroupIds.length];
            if (incorrectSet.has(checkId)) {
              foundId = checkId;
              break;
            }
          }
        }

        setEffectiveNextIncorrectId(foundId || (nextIncorrectId && nextIncorrectId !== currentQ.id ? nextIncorrectId : null));
      } catch (e) {
        setEffectiveNextIncorrectId(nextIncorrectId && nextIncorrectId !== currentQ.id ? nextIncorrectId : null);
      }
    })();
  }, [nextIncorrectId, currentQ.id, groupQuestionIds]);
  // 全共通キーワードの収集
  const allKeywords = Array.from(new Set(similarQuestions.flatMap(sq => sq.sharedKeywords || [])))
    .filter((kw: string) => !kw.startsWith('分野:') && !kw.startsWith('項目:'));

  // ソート：最新年度順 (年度数値降順)
  const parseYearVal = (yStr: string) => {
    if (!yStr) return 0;
    const mR = yStr.match(/令和(\d+)年/);
    if (mR) return 2018 + parseInt(mR[1], 10) + (yStr.includes('12月') ? 0.2 : yStr.includes('10月') ? 0.1 : 0);
    const mH = yStr.match(/平成(\d+)年/);
    if (mH) return 1988 + parseInt(mH[1], 10);
    return 0;
  };

  // フィルタリングと最新年度順ソート
  const filteredQs = selectedFilterKeyword
    ? similarQuestions.filter(sq => sq.sharedKeywords && sq.sharedKeywords.includes(selectedFilterKeyword))
    : similarQuestions;

  const sortedQs = [...filteredQs].sort((a, b) => parseYearVal(b.year) - parseYearVal(a.year));

  const toggleJudgment = (e: React.MouseEvent, key: string, judge: 'O' | 'X') => {
    e.stopPropagation();
    if (isAnswered) return;
    setJudgments(prev => {
      const newJ = { ...prev };
      if (newJ[key] === judge) {
        delete newJ[key];
      } else {
        newJ[key] = judge;
      }
      return newJ;
    });
  };
  
  // Update state if history already contains attempts
  const pastAttempts = currentQ.attempts || [];

  const saveExplanation = async () => {
    setIsSavingExp(true);
    try {
      await apiClient.saveExplanation(currentQ.id, expText);

      let nextIsDebated = currentQ.isDebated;
      if (!currentQ.isDebated) {
        nextIsDebated = true;
        await apiClient.toggleDebate(currentQ.id, true);
      }

      setCurrentQ({ ...currentQ, explanation: expText, isDebated: nextIsDebated });
      setIsEditingExp(false);
    } catch (err) {
      console.error("Failed to save explanation", err);
    } finally {
      setIsSavingExp(false);
    }
  };

  const checkIsVoided = (q: any) => {
    // 「解なし(不適切問題)」判定: 実際に選択肢データ(SINGLE/MULTI_GROUPともに Option 行の集合)があり、
    // isCorrect=true な行が1つも無い場合のみ voided とする。MULTI_GROUP でも Option 行はグループ内の
    // choice 単位でフラット化されているため、この一括チェックで「全グループが正答choiceを持たない」
    // ことと等価になる。選択肢データ自体が未取得/未登録の場合は voided と誤判定しない。
    return !!q.options && q.options.length > 0 && q.options.every((o: any) => !o.isCorrect);
  };

  const isOptionFactuallyCorrect = (q: any, optionNum: number) => {
    if (q.options && q.options.length > 0) {
      const opt = q.options.find((o: any) => o.optionNumber === optionNum);
      if (opt && typeof opt.isCorrect === 'boolean') {
        return opt.isCorrect;
      }
    }
    return false;
  };

  const isPointAwarded = (q: any, optionNum: number) => {
    if (checkIsVoided(q)) return true;
    return isOptionFactuallyCorrect(q, optionNum);
  };

  const getCorrectAnswersText = (q: any) => {
    if (q.format === 'MULTI_GROUP' && q.correctOptions) {
      return q.correctOptions.join(', ');
    }
    if (checkIsVoided(q)) return '解なし(不適切問題)';
    if (q.options && q.options.length > 0) {
      const corrects = q.options.filter((o: any) => o.isCorrect).map((o: any) => o.optionNumber);
      if (corrects.length > 0) return corrects.join(', ');
    }
    return '不明';
  };

  const handleSelect = (optionNumber: number) => {
    if (isAnswered) return;
    setSelectedOptions(prev => 
      prev.includes(optionNumber) ? prev.filter(n => n !== optionNumber) : [...prev, optionNumber].sort()
    );
  };

  const handleMultiSelect = (optionNumber: number, choiceNum: number) => {
    if (isAnswered) return;
    setSelectedMultiOptions(prev => ({
      ...prev,
      [optionNumber]: choiceNum
    }));
  };

  const correctOptionNumbers = (currentQ.options || []).filter((o: any) => o.isCorrect).map((o: any) => o.optionNumber).sort();
  // Find unique groups for correct evaluation
  let multiGroupsCount = 0;
  let uniqueGroupOptNumbers: number[] = [];
  if (currentQ.format === 'MULTI_GROUP' && currentQ.options) {
    const seen = new Set();
    currentQ.options.forEach((o: any) => {
      if (o.structuredData) {
        try { const p = JSON.parse(o.structuredData); if (!seen.has(p.title)) { seen.add(p.title); uniqueGroupOptNumbers.push(o.optionNumber); } } catch(e){}
      }
    });
    multiGroupsCount = uniqueGroupOptNumbers.length;
  }

  const isActuallyCorrect = (() => {
    if (typeof window !== 'undefined') {
      console.log('--- DEBUG INFO ---');
      console.log('format:', currentQ?.format);
      console.log('correctOptions:', currentQ?.correctOptions);
      console.log('selectedMultiOptions:', selectedMultiOptions);
      if (currentQ?.format === 'MULTI_GROUP') {
        const derivedSelected = Object.entries(selectedMultiOptions).map(([base, choiceNum]) => parseInt(base) + choiceNum - 1);
        console.log('derivedSelected:', derivedSelected);
      }
    }

    if (checkIsVoided(currentQ)) return true;
    if (currentQ.format === 'MULTI_GROUP') {
      if (!correctOptionNumbers || correctOptionNumbers.length === 0) return false;
      const derivedSelected = Object.entries(selectedMultiOptions).map(([base, choiceNum]) => parseInt(base) + choiceNum - 1);
      return derivedSelected.length === correctOptionNumbers.length && correctOptionNumbers.every((c: number) => derivedSelected.includes(c));
    }
    return correctOptionNumbers.length > 0 && selectedOptions.length === correctOptionNumbers.length && selectedOptions.every(n => correctOptionNumbers.includes(n));
  })();

  const submitAnswer = async () => {
    if (isAnswered) return;
    if (isMultiMode && Object.keys(selectedMultiOptions).length !== multiGroupsCount) return;
    if (!isMultiMode && selectedOptions.length === 0) return;
    setIsAnswered(true);
    try {
      const attemptData = await apiClient.saveAttempt({
        questionId: currentQ.id,
        selectedOptions: isMultiMode ? JSON.stringify(selectedMultiOptions) : selectedOptions.join(','),
        isCorrect: isActuallyCorrect,
        judgments
      });
      if (attemptData && attemptData.id) {
        setCurrentAttemptId(attemptData.id);
      }
    } catch (err) {
      console.error("Failed to log attempt", err);
    }
  };

  const saveReasoning = async () => {
    setIsSavingReasoning(true);
    let attemptId = currentAttemptId;
    let savedAttempt: any = null;

    try {
      if (attemptId) {
        // Just patch if attempt was already created
        savedAttempt = await apiClient.updateAttemptReasoning(attemptId, reasoningText);
      } else {
        // Create new attempt with reasoning (for incorrect answers)
        savedAttempt = await apiClient.saveAttempt({
          questionId: currentQ.id,
        selectedOptions: isMultiMode ? JSON.stringify(selectedMultiOptions) : selectedOptions.join(','),
          isCorrect: isActuallyCorrect,
          reasoning: reasoningText,
          judgments
        });
      }

      // Update local state to reflect saved reasoning
      setCurrentQ((prev: any) => ({
        ...prev,
        attempts: [
          {
            id: savedAttempt?.id || Date.now(),
        selectedOptions: isMultiMode ? JSON.stringify(selectedMultiOptions) : selectedOptions.join(','),
            isCorrect: isActuallyCorrect,
            attemptedAt: savedAttempt?.attemptedAt || new Date().toISOString(),
            reasoning: reasoningText,
            judgments: typeof savedAttempt.judgments === 'string' ? JSON.parse(savedAttempt.judgments) : (savedAttempt.judgments || judgments)
          },
          ...(prev.attempts || [])
        ]
      }));
      setReasoningText('');
      setHasSavedReasoning(true);
    } catch (err) {
      console.error("Failed to save reasoning", err);
    } finally {
      setIsSavingReasoning(false);
    }
  };

  const toggleBookmark = async () => {
    const newStatus = !currentQ.isBookmarked;
    setCurrentQ({ ...currentQ, isBookmarked: newStatus });
    await apiClient.toggleBookmark(currentQ.id, newStatus);
  };

  const addCorrection = async (payload: {
    questionId: number;
    optionNumber: number;
    selectedText: string;
    startOffset: number;
    endOffset: number;
    correctionText: string;
  }) => {
    try {
      const saved = await apiClient.saveCorrection(payload);
      setCurrentQ((prev: typeof currentQ) => ({ ...prev, corrections: [...(prev.corrections || []), saved] }));
    } catch (err) {
      console.error('Failed to save correction', err);
    }
  };

  const deleteCorrection = async (id: number, questionId: number) => {
    try {
      await apiClient.deleteCorrection(id, questionId);
      setCurrentQ((prev: typeof currentQ) => ({ ...prev, corrections: (prev.corrections || []).filter((c: OptionCorrectionRecord) => c.id !== id) }));
    } catch (err) {
      console.error('Failed to delete correction', err);
    }
  };

  const copyToClipboard = async () => {
    if (!currentQ) return;
    
    let text = `【${currentQ.year}年度 問${currentQ.questionNumber}】 ${currentQ.field || '分野不明'}\n\n`;
    text += `${currentQ.content || ''}\n\n`;
    
    if (currentQ.options && currentQ.options.length > 0) {
      const sortedOptions = [...currentQ.options].sort((a: any, b: any) => a.optionNumber - b.optionNumber);
      sortedOptions.forEach(opt => {
        text += `${opt.optionNumber}. ${opt.content}\n`;
      });
    }

    if (currentQ.explanation && currentQ.explanation.trim() !== "") {
      text += `\n【解説】\n`;
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

  const toggleDebate = async () => {
    const newStatus = !currentQ.isDebated;
    setCurrentQ({ ...currentQ, isDebated: newStatus });
    await apiClient.toggleDebate(currentQ.id, newStatus);
  };

  return (
    <div className="container animate-fade-in-up" style={{ maxWidth: '800px' }}>
      {/* 演習モードコンテキストヘッダーバッジ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        border: '2px solid #2563eb',
        borderRadius: '14px',
        padding: '0.7rem 1.2rem',
        marginBottom: '1.2rem',
        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.08)',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#0f172a', fontWeight: 'bold', fontSize: '0.95rem' }}>
          <span style={{ background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.6rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 800 }}>
            {contextModeLabel}
          </span>
          {groupTitle && <span style={{ color: '#2563eb', fontWeight: 800 }}>{groupTitle}</span>}
          {totalInGroup > 0 && <span style={{ color: '#475569', fontSize: '0.9rem' }}>({currentPosition} / {totalInGroup}問目)</span>}
        </div>
        <Link href={`/questions${navQueryStr}`} style={{ fontSize: '0.88rem', color: '#2563eb', fontWeight: 'bold', textDecoration: 'none' }}>
          ← 一覧へ戻る
        </Link>
      </div>

      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 className="text-secondary" style={{ margin: 0 }}>{currentQ.year}年度 問{currentQ.questionNumber}</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {prevQuestionId && (
              <Link href={`/quiz/${prevQuestionId}${navQueryStr}`} className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem', borderRadius: '20px' }}>
                ◀ 前の問題
              </Link>
            )}
            {nextQuestionId && (
              <Link href={`/quiz/${nextQuestionId}${navQueryStr}`} className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem', borderRadius: '20px' }}>
                次の問題 ▶
              </Link>
            )}
            {effectiveNextIncorrectId && effectiveNextIncorrectId !== currentQ.id ? (
              <Link 
                href={`/quiz/${effectiveNextIncorrectId}${navQueryStr}`} 
                className="btn btn-primary" 
                style={{ 
                  padding: '0.35rem 0.9rem', 
                  fontSize: '0.85rem', 
                  borderRadius: '20px', 
                  background: '#dc2626', 
                  border: '1px solid #ef4444', 
                  color: '#ffffff', 
                  fontWeight: 'bold',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                次の不正解へ ⏭
              </Link>
            ) : (
              <button 
                disabled 
                className="btn btn-secondary" 
                style={{ 
                  padding: '0.35rem 0.9rem', 
                  fontSize: '0.85rem', 
                  borderRadius: '20px', 
                  opacity: 0.4, 
                  cursor: 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                次の不正解へ ⏭
              </button>
            )}
          </div>
        </div>
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'inline-block', padding: '0.3rem 1rem', background: 'var(--surface-border)', borderRadius: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {currentQ.field || '分野不明'}
              </div>
              {currentQ.situationCategory && currentQ.situationCategory.split(',').map((t: string) => (
                <div key={t} style={{ display: 'inline-block', padding: '0.3rem 0.8rem', background: 'rgba(96, 165, 250, 0.1)', border: '1px solid #60a5fa', borderRadius: '20px', fontSize: '0.8rem', color: '#60a5fa' }}>
                  {t}
                </div>
              ))}
              {currentQ.knowledgeTags && currentQ.knowledgeTags.split(',').map((t: string) => (
                <div key={t} style={{ display: 'inline-block', padding: '0.3rem 0.8rem', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid #34d399', borderRadius: '20px', fontSize: '0.8rem', color: '#34d399' }}>
                  {t}
                </div>
              ))}
            </div>
            <button onClick={copyToClipboard} className="btn" style={{ padding: '0.3rem 0.8rem', background: 'transparent', border: '1px solid var(--surface-border)', borderRadius: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {copied ? '✓ コピー完了' : '📋 クリップボードにコピー'}
            </button>
            <button onClick={() => setIsEditModalOpen(true)} className="btn" style={{ padding: '0.3rem 0.8rem', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', borderRadius: '20px', fontSize: '0.9rem', color: '#38bdf8', fontWeight: 'bold', cursor: 'pointer' }}>
              ✏️ 正解・データを修正
            </button>
          </div>
          <button onClick={toggleBookmark} className="btn" style={{ padding: '0.5rem 1rem', background: currentQ.isBookmarked ? 'var(--accent-primary)' : 'transparent', border: '1px solid var(--surface-border)', color: currentQ.isBookmarked ? '#fff' : 'inherit' }}>
            {currentQ.isBookmarked ? '★ 要復習リスト(済)' : '☆ 弱点・まぐれ登録'}
          </button>
        </div>
        
        {currentQ.content ? (
          <>
          {(() => {
            const isLocal = isLocalEnv;
            const needsImage = currentQ.knowledgeTags?.includes('#NEEDS_IMAGE');
            
            let pdfName = 'unknown';
            let pdfUrl = currentQ.pdfUrl;
            
            const isPdfLink = currentQ.imageUrl && currentQ.imageUrl.endsWith('.pdf');
            const isImageLink = currentQ.imageUrl && /\.(png|jpe?g|svg|gif|webp)$/i.test(currentQ.imageUrl);

            if (isPdfLink) {
              const pdfMatch = currentQ.imageUrl.match(/\/([^/]+)\.pdf$/i);
              if (pdfMatch) pdfName = pdfMatch[1];
              if (!pdfUrl) pdfUrl = currentQ.imageUrl;
            } else if (currentQ.year) {
              const yearMap: Record<string, string> = {
                "令和6年 (CBT)": "R06.CBT",
                "令和5年 (CBT)": "R05.CBT",
                "令和4年 (CBT)": "R04.CBT",
                "令和3年 (CBT)": "R03.CBT",
                "令和2年 (CBT)": "R02.CBT",
                "令和2年 第1回": "R02.1"
              };
              pdfName = yearMap[currentQ.year] || 'unknown';
              if (!pdfUrl) pdfUrl = `https://www.unkan-net.com/kakomon/${pdfName}.pdf`;
            } else if (currentQ.id && typeof currentQ.id === 'string') {
              const yearMatch = (currentQ.id as string).match(/^([^_]+)/);
              if (yearMatch) pdfName = yearMatch[1];
              if (!pdfUrl) pdfUrl = `https://www.unkan-net.com/kakomon/${pdfName}.pdf`;
            }

            // In local dev, we have images for ALL pages now (pdf_pages/)
            const hasLocalImage = isLocal && currentQ.id;
            const localImageSrc = isImageLink ? currentQ.imageUrl : (hasLocalImage ? `/pdf_pages/${pdfName}_Q${currentQ.questionNumber}.png` : null);

            return (
              <div style={{ display: 'flex', flexDirection: 'row', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {hasLocalImage && localImageSrc && (
                  <div style={{ flex: '0 0 auto', width: needsImage ? '100%' : '300px', maxWidth: '100%', margin: needsImage ? '0 auto 2rem' : '0' }}>
                    <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      📄 PDF元データ ({needsImage ? '画像問題' : 'テキスト問題・参考サムネイル'})
                    </div>
                    <img 
                      src={localImageSrc} 
                      alt="問題の図・標識" 
                      onClick={() => setIsImageMaximized(true)}
                      style={{ width: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'zoom-in' }} 
                    />
                    
                    {isImageMaximized && typeof document !== 'undefined' ? createPortal(
                      <div 
                        onClick={() => setIsImageMaximized(false)}
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          width: '100vw',
                          height: '100vh',
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 9999,
                          cursor: 'zoom-out'
                        }}
                      >
                        <img 
                          src={localImageSrc} 
                          alt="問題の図・標識 (拡大)" 
                          style={{ maxWidth: '95%', maxHeight: '95%', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', objectFit: 'contain' }} 
                        />
                      </div>,
                      document.body
                    ) : null}
                  </div>
                )}

                <div style={{ flex: '1 1 400px' }}>
                  <h3 style={{ marginBottom: '2rem', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                    {currentQ.content}
                  </h3>
                  
                  {!hasLocalImage && needsImage && (
                    <div style={{ marginTop: '1rem' }}>
                      <a 
                        href="https://www.unkan-net.com/" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn btn-primary"
                        style={{ display: 'inline-block', padding: '0.8rem 1.5rem', fontWeight: 'bold' }}
                      >
                        📄 この問題の図表を確認する（外部サイト）
                      </a>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        ※外部サイト（運行管理者試験対策.net）のトップページが開きます。<br/>
                        該当年度（{currentQ.year}）のPDFを開き、問{currentQ.questionNumber}をご参照ください。
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          </>
        ) : (
          <h3 style={{ marginBottom: '2rem', lineHeight: '1.8' }}>
            ※問題データはExcelに登録されていないため、お手元の過去問題集（{currentQ.year}年度 問{currentQ.questionNumber}）をご参照ください。
          </h3>
        )}

        {(() => {
          const hasItems = currentQ.content && /(?:^|\n)[ア-オA-DＡ-Ｄ][．\.\s　]/.test(currentQ.content);
          const hasComboOptions = (currentQ.options || []).some((o: any) => /一つ|二つ|三つ|四つ|なし/.test(o.content || ''));
          const isCombinationQuestion = hasItems || hasComboOptions;

          return (
            <>
              {isCombinationQuestion && (
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ width: '100%', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>💡 記述ごとの判定メモ（個数・組合せ問題用）</div>
                  {['ア', 'イ', 'ウ', 'エ'].map(label => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'center', background: 'var(--surface-color)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                      <span style={{ fontWeight: 'bold' }}>{label}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={(e) => toggleJudgment(e, label, 'O')}
                          disabled={isAnswered}
                          style={{
                            padding: '0.2rem 0.6rem',
                            background: judgments[label] === 'O' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                            border: `1px solid ${judgments[label] === 'O' ? 'var(--success)' : 'transparent'}`,
                            color: judgments[label] === 'O' ? 'var(--success)' : 'var(--text-secondary)',
                            borderRadius: '6px',
                            cursor: isAnswered ? 'default' : 'pointer',
                          }}
                        >◯</button>
                        <button
                          onClick={(e) => toggleJudgment(e, label, 'X')}
                          disabled={isAnswered}
                          style={{
                            padding: '0.2rem 0.6rem',
                            background: judgments[label] === 'X' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                            border: `1px solid ${judgments[label] === 'X' ? 'var(--error)' : 'transparent'}`,
                            color: judgments[label] === 'X' ? 'var(--error)' : 'var(--text-secondary)',
                            borderRadius: '6px',
                            cursor: isAnswered ? 'default' : 'pointer',
                          }}
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <QuestionOptionsRenderer
                currentQ={currentQ}
                selectedOptions={selectedOptions}
                isAnswered={isAnswered}
                onSelectOption={handleSelect}
                onSelectMultiOption={handleMultiSelect}
                selectedMultiOptions={selectedMultiOptions}
                isOptionFactuallyCorrect={isOptionFactuallyCorrect}
                checkIsVoided={checkIsVoided}
                showJudgments={!isCombinationQuestion}
                judgments={judgments}
                toggleJudgment={toggleJudgment}
                onAddCorrection={addCorrection}
                onDeleteCorrection={deleteCorrection}
              />

              {/* 解答せずに正解・解説を見るボタン */}
              {!isAnswered && (
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {(selectedOptions.length > 0 || (isMultiMode && multiGroupsCount > 0 && Object.keys(selectedMultiOptions).length === multiGroupsCount)) && (
                    <button 
                      onClick={submitAnswer} 
                      className="btn btn-primary" 
                      style={{ 
                        padding: '0.8rem 2rem', 
                        fontSize: '1.1rem', 
                        fontWeight: 'bold', 
                        borderRadius: '25px',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                      }}
                    >
                      ✓ 解答する
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setIsAnswered(true);
                      setSelectedOptions([]); // 解答なし閲覧
                      if (isMultiMode) setSelectedMultiOptions({});
                    }} 
                    className="btn" 
                    style={{ 
                      padding: '0.7rem 1.5rem', 
                      background: 'rgba(56, 189, 248, 0.12)', 
                      border: '1px solid #38bdf8', 
                      color: '#38bdf8', 
                      borderRadius: '25px', 
                      fontWeight: 'bold', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.95rem'
                    }}
                  >
                    📖 解答せずに正解・解説を見る（解説閲覧モード）
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {isAnswered && (
        <div className="glass-panel animate-fade-in-up" style={{ padding: '2rem', borderTop: `4px solid ${(selectedOptions.length === 0 && Object.keys(selectedMultiOptions).length === 0) ? '#38bdf8' : isActuallyCorrect ? 'var(--success)' : 'var(--error)'}` }}>
          <h3 style={{ color: (selectedOptions.length === 0 && Object.keys(selectedMultiOptions).length === 0) ? '#38bdf8' : isActuallyCorrect ? 'var(--success)' : 'var(--error)', marginBottom: '1rem' }}>
            {(selectedOptions.length === 0 && Object.keys(selectedMultiOptions).length === 0)
              ? `📖 解説閲覧モード（正答: ${getCorrectAnswersText(currentQ)}）`
              : checkIsVoided(currentQ)
                ? '🎉 正解！（不適切問題のため全員正解）'
                : isActuallyCorrect 
                  ? '🎉 正解！' 
                  : `❌ 不正解... (正答: ${getCorrectAnswersText(currentQ)})`}
          </h3>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            ※まぐれで当たった場合や、まだ理解が不十分な場合は右上の「☆ 弱点・まぐれ登録」を押してコレクトしてください。
          </p>

          {/* 1. 思考プロセスの記録（解説の邪魔にならないよう下に折りたたみ配置） */}
          {!hasSavedReasoning && selectedOptions.length > 0 && (
            <details open style={{ marginTop: '1.2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
              <summary style={{ padding: '0.8rem 1.2rem', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>🧠 思考プロセスの記録・メモを追加する</span>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(クリックで開く)</span>
              </summary>
              <div style={{ padding: '1.2rem', borderTop: '1px solid var(--surface-border)' }}>
                <div className="flex gap-4" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
                  {isActuallyCorrect 
                    ? '正解に至った思考回路や、他の選択肢を除外した理由を言語化しておくことで、正しい思考法を定着させることができます。'
                    : '間違えた理由や、迷ったポイントを言語化しておくことで、後から「どういう思考回路でミスしたか」を振り返ることができます。'}
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', marginRight: '0.2rem' }}>タグ:</span>
                  <button onClick={() => setReasoningText(prev => prev + (prev ? ' ' : '') + '#用語不明')} className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)' }}>⚠️ 用語不明</button>
                  <button onClick={() => setReasoningText(prev => prev + (prev ? ' ' : '') + '#消去法')} className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)' }}>✂️ 消去法</button>
                  <button onClick={() => setReasoningText(prev => prev + (prev ? ' ' : '') + '#構文矛盾')} className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)' }}>🕵️ 構文矛盾</button>
                  <button onClick={() => setReasoningText(prev => prev + (prev ? ' ' : '') + '#直近記憶')} className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)' }}>⏱️ 直近記憶</button>
                  <button onClick={() => setReasoningText(prev => prev + (prev ? ' ' : '') + '#機械的暗記')} className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)' }}>🤖 機械的暗記</button>
                  <button onClick={() => setReasoningText(prev => prev + (prev ? ' ' : '') + '#思い込み')} className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)' }}>🙈 思い込み</button>
                  <button onClick={() => setReasoningText(prev => prev + (prev ? ' ' : '') + '#見落とし')} className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)' }}>🪤 見落とし</button>
                  <button onClick={() => setReasoningText(prev => prev + (prev ? ' ' : '') + '#根拠あり')} className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)' }}>🎯 根拠あり</button>
                </div>

                <textarea
                  value={reasoningText}
                  onChange={e => setReasoningText(e.target.value)}
                  style={{ width: '100%', minHeight: '80px', fontSize: '0.95rem', lineHeight: '1.5' }}
                  placeholder="例: 選択肢2と迷った。◯◯の例外規定を忘れていて、原則通りに解いてしまったため。"
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.8rem' }}>
                  <button onClick={saveReasoning} disabled={isSavingReasoning} className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}>
                    {isSavingReasoning ? '保存中...' : '記録する'}
                  </button>
                </div>
              </div>
            </details>
          )}

          {/* 2. 解説メモ（最優先表示） */}
          <details open style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden' }}>
            <summary style={{ padding: '1.2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', outline: 'none', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)', listStyle: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ transition: 'transform 0.2s', display: 'inline-block' }} className="details-marker">▶</span>
                <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 'bold' }}>📖 解説メモ</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.7, fontWeight: 'normal' }}>(クリックで開閉)</span>
              </div>
              {!isEditingExp && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      setIsLibraryModalOpen(true);
                    }} 
                    className="btn btn-primary" 
                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', fontWeight: 'bold' }}
                  >
                    📚 チャート呼出
                  </button>
                  <button 
                    onClick={(e) => { e.preventDefault(); setIsEditingExp(true); }} 
                    className="btn btn-secondary" 
                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                  >
                    {currentQ.explanation ? '✏️ 編集' : '📝 追加'}
                  </button>
                </div>
              )}
            </summary>
            
            <div style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
              {(() => {
                // 文章と埋め込み図（フローチャート）を順番通り交互に挿絵レンダリング
                const segments = parseMultiExplanationSegments(currentQ.explanation);

                return isEditingExp ? (
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>解説テキスト (Markdown対応)</span>
                      <button
                        onClick={() => setIsLibraryModalOpen(true)}
                        className="btn btn-primary"
                        style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        📚 チャート呼出
                      </button>
                    </div>

                    <textarea
                      value={expText}
                      onChange={e => setExpText(e.target.value)}
                      style={{ width: '100%', minHeight: '220px', marginBottom: '1rem', fontSize: '0.95rem', lineHeight: '1.6' }}
                      placeholder="解説を入力してください。選択肢1の解説... の下に ```flowchart ... ``` を置くことで文章途中に挿絵配置できます。"
                    />

                    {/* 編集モード時の各フローチャート挿絵のライブプレビュー・編集 */}
                    {segments.filter(s => s.type === 'flowchart').map((seg, idx) => {
                      if (seg.type !== 'flowchart') return null;
                      return (
                        <div key={idx} style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', marginBottom: '1rem', border: '1px solid var(--surface-border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                              📐 挿絵チャート #{idx + 1}
                            </span>
                            <button
                              onClick={() => {
                                const cat = currentQ.field || '貨物自動車運送事業法';
                                const title = prompt('共通ライブラリに保存するタイトルを入力してください:', `図解: ${currentQ.questionNumber || '問題'} 用フローチャート`);
                                if (title) {
                                  saveFlowchartToLibrary({
                                    id: `custom_${Date.now()}`,
                                    title,
                                    category: cat,
                                    nodes: seg.data.nodes,
                                    edges: seg.data.edges
                                  });
                                  alert('📚 共通ライブラリに保存・登録しました！');
                                }
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem', color: 'var(--success)', borderColor: 'var(--success)' }}
                            >
                              💾 ライブラリ保存
                            </button>
                          </div>

                          <EmbeddedFlowchart
                            data={seg.data}
                            editable={true}
                            onSave={(newData) => {
                              const newFcBlock = `\`\`\`flowchart\n${JSON.stringify(newData, null, 2)}\n\`\`\``;
                              setExpText((prev: string) => prev.replace(seg.rawBlock, newFcBlock));
                            }}
                          />
                        </div>
                      );
                    })}

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <button onClick={() => setIsEditingExp(false)} className="btn btn-secondary" style={{ padding: '0.4rem 1rem' }}>
                        キャンセル
                      </button>
                      <button onClick={saveExplanation} disabled={isSavingExp} className="btn btn-primary" style={{ padding: '0.4rem 1rem' }}>
                        {isSavingExp ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '1rem', lineHeight: '1.8' }}>
                    {segments.length === 0 ? (
                      <div style={{ color: 'var(--text-secondary)', padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <p style={{ fontStyle: 'italic', margin: 0 }}>※この問題の解説・図解フローチャートはまだ登録されていません。</p>
                        <button
                          onClick={() => {
                            setIsLibraryModalOpen(true);
                          }}
                          className="btn btn-primary"
                          style={{ padding: '0.6rem 1.5rem', fontWeight: 'bold' }}
                        >
                          📐 チャート追加
                        </button>
                      </div>
                    ) : (
                      segments.map((seg, idx) => {
                        if (seg.type === 'text') {
                          return (
                            <div key={idx} className="markdown-body" style={{ marginBottom: '1rem' }}>
                              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                {seg.content}
                              </ReactMarkdown>
                            </div>
                          );
                        } else {
                          return (
                            <div key={idx} style={{ margin: '1.5rem 0', position: 'relative' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                                  📐 挿絵チャート #{idx + 1}
                                </span>
                                <button
                                  onClick={() => setIsEditingExp(true)}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.15rem 0.5rem', fontSize: '0.75rem' }}
                                >
                                  ✏️ チャート編集
                                </button>
                              </div>
                              <EmbeddedFlowchart
                                data={seg.data}
                                editable={false}
                              />
                            </div>
                          );
                        }
                      })
                    )}
                  </div>
                );
              })()}
            </div>
          </details>

          
        </div>
      )}

      {/* 過去履歴・類題リストを isAnswered の外に出して常に表示 */}
      <div className="glass-panel animate-fade-in-up" style={{ padding: '2rem', marginTop: '2rem' }}>
        
        {pastAttempts && pastAttempts.length > 0 && (
          <details open style={{ marginBottom: '2.5rem' }}>
            <summary style={{ color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.8rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📝 過去の解答履歴 <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.7, fontWeight: 'normal' }}>(クリックで開閉)</span>
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {pastAttempts.map((attempt: any) => (
                <div key={attempt.id} style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', borderLeft: `4px solid ${isAnswered ? (attempt.isCorrect ? 'var(--success)' : 'var(--error)') : 'var(--surface-border)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {new Date(attempt.attemptedAt).toLocaleString('ja-JP')}
                    </span>
                    <span style={{ fontWeight: 'bold' }}>
                      {isAnswered ? (
                        <span style={{ color: attempt.isCorrect ? 'var(--success)' : 'var(--error)' }}>
                          {attempt.isCorrect ? '正解' : '不正解'} (選択: {attempt.selectedOptions || 'なし'})
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>解答済 (結果は回答後に表示)</span>
                      )}
                    </span>
                  </div>
                  {(() => {
                    const parsedJudgments = typeof attempt.judgments === 'string' ? JSON.parse(attempt.judgments) : attempt.judgments;
                    return parsedJudgments && Object.keys(parsedJudgments).length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>仮判定:</span>
                        {Object.entries(parsedJudgments).map(([key, judge]) => (
                          <span key={key} style={{ color: judge === 'O' ? 'var(--success)' : 'var(--error)' }}>
                            {isNaN(Number(key)) ? key : `肢${key}`}: {judge === 'O' ? '◯' : '×'}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                  {attempt.reasoning ? (
                    <div style={{ marginTop: '0.8rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>💭 思考のメモ:</span>
                      {attempt.reasoning}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.5rem' }}>思考のメモはありません</div>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}

        {similarQuestions.length > 0 && (
          <details open style={{ marginBottom: '2.5rem' }}>
            <summary style={{ color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.8rem', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🧠 関連する類題 <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 'normal' }}>({sortedQs.length}件 / 直近年順)</span>
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', opacity: 0.7, fontWeight: 'normal' }}>(クリックで開閉)</span>
            </summary>

            {/* キーワードワンクリック絞り込みバー */}
            {allKeywords.length > 0 && (
              <div style={{ marginBottom: '1.2rem', padding: '0.8rem 1rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  🏷️ 特定キーワードで類題を絞り込む:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={() => setSelectedFilterKeyword(null)}
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.3rem 0.7rem',
                      borderRadius: '16px',
                      border: '1px solid var(--surface-border)',
                      background: selectedFilterKeyword === null ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                      color: selectedFilterKeyword === null ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: selectedFilterKeyword === null ? 'bold' : 'normal'
                    }}
                  >
                    すべて表示 ({similarQuestions.length})
                  </button>
                  {allKeywords.map((kw: string) => (
                    <button
                      key={kw}
                      onClick={() => setSelectedFilterKeyword(kw === selectedFilterKeyword ? null : kw)}
                      style={{
                        fontSize: '0.8rem',
                        padding: '0.3rem 0.7rem',
                        borderRadius: '16px',
                        border: `1px solid ${kw === selectedFilterKeyword ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)'}`,
                        background: kw === selectedFilterKeyword ? 'rgba(0, 168, 255, 0.25)' : 'rgba(255,255,255,0.05)',
                        color: kw === selectedFilterKeyword ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: kw === selectedFilterKeyword ? 'bold' : 'normal',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      🔍 {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 類題リスト（直近年順） */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {sortedQs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  該当する過去問は見つかりませんでした。
                </div>
              ) : (
                sortedQs.map(sq => (
                  <Link key={sq.id} href={`/quiz/${sq.id}`} className="btn btn-secondary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '1rem', textAlign: 'left', gap: '0.6rem', borderLeft: '4px solid var(--accent-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <span style={{ background: 'var(--accent-primary)', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          {sq.year}
                        </span>
                        <strong style={{ fontSize: '1.05rem' }}>問{sq.questionNumber}</strong>
                        <span style={{ fontSize: '0.85rem', color: sq.isDebated ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                          {sq.isDebated ? '✨ ディベート済' : '未解説'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {sq.field || '法令上の制限'}
                      </span>
                    </div>
                    {sq.sharedKeywords && sq.sharedKeywords.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                        {sq.sharedKeywords.map((kw: string, i: number) => (
                          <span key={i} style={{ fontSize: '0.75rem', background: kw === selectedFilterKeyword ? 'rgba(0, 168, 255, 0.3)' : 'rgba(255, 255, 255, 0.08)', color: kw === selectedFilterKeyword ? '#fff' : 'var(--text-secondary)', border: `1px solid ${kw === selectedFilterKeyword ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.15)'}`, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))
              )}
            </div>
          </details>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Link href="/questions" className="btn btn-primary" style={{ width: '100%', maxWidth: '300px', textAlign: 'center', textDecoration: 'none' }}>
            一覧に戻る
          </Link>
        </div>
      </div>

      <EditQuestionModal
        question={currentQ}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaveSuccess={(updated) => {
          setCurrentQ((prev: any) => ({
            ...prev,
            ...updated,
            explanation: updated.explanation || prev.explanation,
          }));
          if (updated.explanation) {
            setExpText(updated.explanation);
          }
        }}
      />

      <FlowchartLibraryModal
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        onSelect={async (item: SavedFlowchartItem) => {
          const fcTag = `\n\n\`\`\`flowchart:${item.id}\n\`\`\``;
          const newExp = (currentQ.explanation || '') + fcTag;
          setExpText(newExp);
          setCurrentQ((prev: any) => ({ ...prev, explanation: newExp }));
          try {
            await apiClient.saveExplanation(currentQ.id, newExp);
          } catch (e) {}
        }}
      />
    </div>
  );
}
