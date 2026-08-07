'use client';

import React, { useState, useEffect } from 'react';

interface Option {
  id?: number;
  optionNumber: number;
  content: string | null;
  isCorrect?: boolean | null;
  explanation?: string | null;
  structuredData?: string | null;
}

interface QuestionData {
  id: number;
  year?: string | null;
  questionNumber?: number | null;
  field?: string | null;
  situationCategory?: string | null;
  knowledgeTags?: string | null;
  content?: string | null;
  format?: string | null;
  imageUrl?: string | null;
  explanation?: string | null;
  options?: Option[];
}

interface EditQuestionModalProps {
  question: QuestionData;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updated: any) => void;
}

// ---- MULTI_GROUP (穴埋め複数グループ問題) 用のヘルパー ----
// 実データ構造: 1グループ = N個の Option 行 (id, optionNumber, isCorrect が各行固有)。
// 各行の structuredData には同一グループ内で { title, choices } が重複コピーされている。
// 行の並び順 (optionNumber昇順) の k番目が choices[k] (choice.num = k+1) に対応する。
interface MultiChoice {
  num: number;
  text: string;
}

interface MultiGroupState {
  key: string;
  title: string;
  rowIds: number[];
  choices: MultiChoice[];
  correctChoiceNum: number | null;
}

interface StructuredDataJSON {
  title?: string | number;
  choices?: MultiChoice[];
}

const CIRCLED_NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
const circledNum = (n: number) => CIRCLED_NUMS[n - 1] || `(${n})`;

function buildMultiGroups(options: Option[]): MultiGroupState[] {
  const sorted = [...options].sort((a, b) => a.optionNumber - b.optionNumber);
  const order: string[] = [];
  const rowsByTitle: Record<string, Option[]> = {};

  sorted.forEach((opt) => {
    let parsed: StructuredDataJSON | null = null;
    if (opt.structuredData) {
      try {
        parsed = JSON.parse(opt.structuredData);
      } catch {
        // 壊れたJSON: このグループはtitle不明として扱う
      }
    }
    const title = parsed?.title !== undefined && parsed?.title !== null ? String(parsed.title) : `(不明 #${opt.optionNumber})`;
    if (!rowsByTitle[title]) {
      rowsByTitle[title] = [];
      order.push(title);
    }
    rowsByTitle[title].push(opt);
  });

  return order.map((title, gIdx) => {
    const rows = rowsByTitle[title];
    let parsed: StructuredDataJSON | null = null;
    if (rows[0]?.structuredData) {
      try {
        parsed = JSON.parse(rows[0].structuredData as string);
      } catch {
        // ignore
      }
    }
    const baseChoices: MultiChoice[] = Array.isArray(parsed?.choices) ? parsed.choices : [];
    const correctIdx = rows.findIndex((r) => !!r.isCorrect);

    return {
      key: `${title}__${gIdx}`,
      title,
      rowIds: rows.map((r) => r.id as number),
      choices: rows.map((r, idx) => ({
        num: idx + 1,
        text: baseChoices[idx]?.text ?? (r.content || ''),
      })),
      correctChoiceNum: correctIdx >= 0 ? correctIdx + 1 : null,
    };
  });
}

// 保存用: グループ状態から PATCH に送る Option 更新ペイロードを組み立てる。
// 同一グループの全行に一貫した structuredData を書き込み、isCorrect は正解の1行のみtrueにする。
function buildMultiGroupOptionsPayload(groups: MultiGroupState[]) {
  return groups.flatMap((g) => {
    const structuredDataStr = JSON.stringify({
      title: g.title,
      choices: g.choices.map((c) => ({ num: c.num, text: c.text })),
    });
    return g.rowIds.map((id, idx) => ({
      id,
      structuredData: structuredDataStr,
      isCorrect: g.correctChoiceNum !== null && idx + 1 === g.correctChoiceNum,
      content: `${g.title} : ${circledNum(idx + 1)} ${g.choices[idx]?.text ?? ''}`,
    }));
  });
}

export default function EditQuestionModal({
  question,
  isOpen,
  onClose,
  onSaveSuccess,
}: EditQuestionModalProps) {
  const [field, setField] = useState<string>(
    question.field || ''
  );
  const [situationCategory, setSituationCategory] = useState<string>(question.situationCategory || '');
  const [knowledgeTags, setKnowledgeTags] = useState<string>(question.knowledgeTags || '');
  const [content, setContent] = useState<string>(question.content || '');
  const [explanation, setExplanation] = useState<string>(
    question.explanation || ''
  );
  const isMultiGroup = question.format === 'MULTI_GROUP';
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
  const [multiGroups, setMultiGroups] = useState<MultiGroupState[]>(
    isMultiGroup ? buildMultiGroups(question.options || []) : []
  );
  const [imageUrl, setImageUrl] = useState<string>(question.imageUrl || '');
  const [pdfPageFiles, setPdfPageFiles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/pdf-pages')
      .then((res) => (res.ok ? res.json() : { files: [] }))
      .then((data) => setPdfPageFiles(Array.isArray(data.files) ? data.files : []))
      .catch(() => setPdfPageFiles([]));
  }, [isOpen]);

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
      const IS_SPA_MODE = process.env.NEXT_PUBLIC_APP_MODE === 'spa' || (typeof window !== 'undefined' && window.location.hostname.includes('github.io'));
      if (IS_SPA_MODE) {
        throw new Error('Github PagesなどのSPA環境からは問題文の編集はできません。');
      }

      const optionsPayload = isMultiGroup
        ? buildMultiGroupOptionsPayload(multiGroups)
        : options;

      const res = await fetch(`/api/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          situationCategory,
          knowledgeTags,
          content,
          explanation,
          options: optionsPayload,
          imageUrl,
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
              <label>分野 (大分類)</label>
              <input
                type="text"
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder="例: 労働基準法"
                className="text-input"
              />
            </div>
          </div>
          <div className="form-group row">
            <div className="field-half">
              <label>形式・アプローチタグ (カンマ区切り)</label>
              <input
                type="text"
                value={situationCategory}
                onChange={(e) => setSituationCategory(e.target.value)}
                placeholder="例: #表・グラフ,#時間計算(改善基準等)"
                className="text-input"
              />
            </div>
            <div className="field-half">
              <label>重要テーマタグ (カンマ区切り)</label>
              <input
                type="text"
                value={knowledgeTags}
                onChange={(e) => setKnowledgeTags(e.target.value)}
                placeholder="例: #改善基準(拘束・休息)"
                className="text-input"
              />
            </div>
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
            <label>画像 (図・標識)</label>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
              ※ 表示される画像がズレている場合、下の一覧またはパス直接入力で差し替えられます (public/pdf_pages/ 配下)。
            </div>
            {imageUrl && /\.(png|jpe?g|svg|gif|webp)$/i.test(imageUrl) && (
              <div style={{ marginBottom: '0.6rem' }}>
                <img
                  src={imageUrl}
                  alt="現在の画像プレビュー"
                  className="image-preview"
                />
              </div>
            )}
            <select
              className="select-input"
              value={pdfPageFiles.includes(imageUrl.replace(/^\/pdf_pages\//, '')) ? imageUrl.replace(/^\/pdf_pages\//, '') : ''}
              onChange={(e) => {
                if (e.target.value) setImageUrl(`/pdf_pages/${e.target.value}`);
              }}
              style={{ marginBottom: '0.5rem' }}
            >
              <option value="">-- pdf_pages/ から選択 --</option>
              {pdfPageFiles.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="/pdf_pages/R02.1_Q1.png"
              className="text-input"
            />
          </div>

          {isMultiGroup ? (
            <div className="form-group">
              <label>穴埋めグループの選択肢と正解設定 (MULTI_GROUP)</label>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                ※ 各グループにつき正解は1つだけ選べます (ラジオボタン)。同一グループの全選択肢データは保存時に一括更新されます。
              </div>
              {multiGroups.length === 0 && (
                <div className="error-banner">選択肢データが見つかりません。</div>
              )}
              {multiGroups.map((g, gIdx) => (
                <div key={g.key} className="multi-group-card">
                  <div className="multi-group-header">
                    <span className="opt-badge">グループ {gIdx + 1}</span>
                    <input
                      type="text"
                      className="text-input"
                      value={g.title}
                      onChange={(e) => {
                        const next = [...multiGroups];
                        next[gIdx] = { ...next[gIdx], title: e.target.value };
                        setMultiGroups(next);
                      }}
                      placeholder="グループタイトル (例: A)"
                    />
                  </div>
                  <div className="multi-group-choices">
                    {g.choices.map((c, cIdx) => (
                      <div key={c.num} className="multi-choice-row">
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            cursor: 'pointer',
                            color: g.correctChoiceNum === c.num ? '#4ade80' : '#cbd5e1',
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <input
                            type="radio"
                            name={`multi-group-${gIdx}-correct`}
                            checked={g.correctChoiceNum === c.num}
                            onChange={() => {
                              const next = [...multiGroups];
                              next[gIdx] = { ...next[gIdx], correctChoiceNum: c.num };
                              setMultiGroups(next);
                            }}
                          />
                          正解
                        </label>
                        <span className="multi-choice-num">{circledNum(c.num)}</span>
                        <input
                          type="text"
                          className="text-input"
                          value={c.text}
                          onChange={(e) => {
                            const next = [...multiGroups];
                            const nextChoices = [...next[gIdx].choices];
                            nextChoices[cIdx] = { ...nextChoices[cIdx], text: e.target.value };
                            next[gIdx] = { ...next[gIdx], choices: nextChoices };
                            setMultiGroups(next);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="form-group">
              <label>選択肢の本文と正解設定</label>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                ※ 複数選択問題（二項目選択など）の場合は、該当するすべての選択肢を「正解」に設定してください。
              </div>
              {options.map((opt, idx) => (
                <div key={opt.optionNumber} className="option-edit-row">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className={`opt-badge ${opt.isCorrect ? 'correct' : ''}`}>
                      肢{opt.optionNumber} {opt.isCorrect ? ' (正解)' : ''}
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: opt.isCorrect ? '#4ade80' : '#cbd5e1' }}>
                      <input
                        type="checkbox"
                        checked={!!opt.isCorrect}
                        onChange={(e) => {
                          const next = [...options];
                          next[idx].isCorrect = e.target.checked;
                          setOptions(next);
                        }}
                      />
                      正解にする
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    value={opt.content || ''}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className="textarea-input opt-textarea"
                  />
                </div>
              ))}
            </div>
          )}

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

        .image-preview {
          max-width: 100%;
          max-height: 240px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: block;
        }

        .multi-group-card {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 0.8rem;
          margin-bottom: 0.8rem;
        }

        .multi-group-header {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 0.6rem;
        }

        .multi-group-header .text-input {
          font-weight: 700;
          color: #38bdf8;
        }

        .multi-group-choices {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .multi-choice-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .multi-choice-num {
          font-size: 0.9rem;
          opacity: 0.75;
          min-width: 1.4rem;
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
