'use client';

import React, { useState } from 'react';

interface Option {
  id?: number;
  optionNumber: number;
  content: string | null;
  isCorrect?: boolean | null;
  explanation?: string | null;
}

interface QuestionData {
  id: number;
  year?: string | null;
  questionNumber?: number | null;
  majorField?: string | null;
  subField?: string | null;
  content?: string | null;
  correctAnswer?: number | null;
  explanation?: string | null;
  options?: Option[];
}

interface EditQuestionModalProps {
  question: QuestionData;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updated: any) => void;
}

export default function EditQuestionModal({
  question,
  isOpen,
  onClose,
  onSaveSuccess,
}: EditQuestionModalProps) {
  const [correctAnswer, setCorrectAnswer] = useState<number>(
    question.correctAnswer || 1
  );
  const [majorField, setMajorField] = useState<string>(
    question.majorField || ''
  );
  const [subField, setSubField] = useState<string>(question.subField || '');
  const [content, setContent] = useState<string>(question.content || '');
  const [explanation, setExplanation] = useState<string>(
    question.explanation || ''
  );
  const [options, setOptions] = useState<Option[]>(
    question.options && question.options.length > 0
      ? question.options.map((o) => ({ ...o }))
      : [
          { optionNumber: 1, content: '' },
          { optionNumber: 2, content: '' },
          { optionNumber: 3, content: '' },
          { optionNumber: 4, content: '' },
        ]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleOptionChange = (idx: number, val: string) => {
    const next = [...options];
    next[idx].content = val;
    setOptions(next);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctAnswer,
          majorField,
          subField,
          content,
          explanation,
          options,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '更新に失敗しました');
      }

      const updated = await res.json();
      onSaveSuccess(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'エラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card glass-panel">
        <div className="modal-header">
          <h3>
            ✏️ 問題データの修正 ({question.year || ''} 問
            {question.questionNumber || question.id})
          </h3>
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {errorMsg && <div className="error-banner">{errorMsg}</div>}

          <div className="form-group row">
            <div className="field-half">
              <label>正答肢 (正解)</label>
              <select
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(Number(e.target.value))}
                className="select-input highlight-select"
              >
                <option value={1}>肢 1 が正解</option>
                <option value={2}>肢 2 が正解</option>
                <option value={3}>肢 3 が正解</option>
                <option value={4}>肢 4 が正解</option>
              </select>
            </div>

            <div className="field-half">
              <label>分野 (大分類)</label>
              <input
                type="text"
                value={majorField}
                onChange={(e) => setMajorField(e.target.value)}
                placeholder="例: 権利関係, 貨物自動車運送事業法"
                className="text-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>中分類・テーマ</label>
            <input
              type="text"
              value={subField}
              onChange={(e) => setSubField(e.target.value)}
              placeholder="例: 意思表示, 代理, 37条書面"
              className="text-input"
            />
          </div>

          <div className="form-group">
            <label>問題文</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="textarea-input"
            />
          </div>

          <div className="form-group">
            <label>選択肢の本文</label>
            {options.map((opt, idx) => (
              <div key={opt.optionNumber} className="option-edit-row">
                <span className={`opt-badge ${correctAnswer === opt.optionNumber ? 'correct' : ''}`}>
                  肢{opt.optionNumber} {correctAnswer === opt.optionNumber ? ' (正解)' : ''}
                </span>
                <textarea
                  rows={2}
                  value={opt.content || ''}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  className="textarea-input opt-textarea"
                />
              </div>
            ))}
          </div>

          <div className="form-group">
            <label>全体の解説</label>
            <textarea
              rows={4}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="textarea-input"
              placeholder="問題の解説を入力してください"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            キャンセル
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '💾 修正を保存する'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }

        .modal-card {
          background: rgba(22, 28, 45, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          width: 100%;
          max-width: 720px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          color: #f1f5f9;
        }

        .modal-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 600;
          color: #38bdf8;
        }

        .btn-close {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
        }
        .btn-close:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }

        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid #ef4444;
          color: #fca5a5;
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-group.row {
          flex-direction: row;
          gap: 1rem;
        }

        .field-half {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #cbd5e1;
        }

        .text-input,
        .select-input,
        .textarea-input {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: #f8fafc;
          padding: 0.6rem 0.8rem;
          font-size: 0.95rem;
          width: 100%;
          outline: none;
          transition: border-color 0.2s;
        }

        .text-input:focus,
        .select-input:focus,
        .textarea-input:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
        }

        .highlight-select {
          background: rgba(56, 189, 248, 0.15);
          border-color: #38bdf8;
          font-weight: 700;
          color: #38bdf8;
        }

        .option-edit-row {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          margin-bottom: 0.5rem;
        }

        .opt-badge {
          font-size: 0.8rem;
          font-weight: 600;
          color: #94a3b8;
        }
        .opt-badge.correct {
          color: #4ade80;
          font-weight: 700;
        }

        .opt-textarea {
          font-size: 0.88rem;
        }

        .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .btn {
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.18);
        }

        .btn-primary {
          background: linear-gradient(135deg, #0284c7, #2563eb);
          color: #fff;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .btn-primary:hover {
          background: linear-gradient(135deg, #0369a1, #1d4ed8);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
        }
      `}</style>
    </div>
  );
}
