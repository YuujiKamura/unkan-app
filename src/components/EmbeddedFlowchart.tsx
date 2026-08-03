"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { FlowNode, FlowEdge } from './FlowchartStudio';

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; subtext: string; headerBg: string }> = {
  blue: { bg: '#ffffff', border: '#2563eb', text: '#000000', subtext: '#334155', headerBg: '#2563eb' },
  green: { bg: '#ffffff', border: '#10b981', text: '#000000', subtext: '#334155', headerBg: '#10b981' },
  amber: { bg: '#ffffff', border: '#f59e0b', text: '#000000', subtext: '#334155', headerBg: '#f59e0b' },
  purple: { bg: '#ffffff', border: '#8b5cf6', text: '#000000', subtext: '#334155', headerBg: '#8b5cf6' },
  rose: { bg: '#ffffff', border: '#f43f5e', text: '#000000', subtext: '#334155', headerBg: '#f43f5e' },
  emerald: { bg: '#ffffff', border: '#059669', text: '#000000', subtext: '#334155', headerBg: '#059669' }
};

export type FlowchartData = {
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export default function EmbeddedFlowchart({
  data,
  editable = false,
  onSave
}: {
  data: FlowchartData;
  editable?: boolean;
  onSave?: (newData: FlowchartData) => void;
}) {
  const [nodes, setNodes] = useState<FlowNode[]>(data.nodes || []);
  const [edges, setEdges] = useState<FlowEdge[]>(data.edges || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setNodes(data.nodes || []);
    setEdges(data.edges || []);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [data]);

  // ノードサイズ動的計算の共通化ヘルパー
  const getNodeDimensions = (titleText: string = '') => {
    const maxPerCol = 7;
    const lines: string[] = [];
    for (let i = 0; i < titleText.length; i += maxPerCol) {
      lines.push(titleText.slice(i, i + maxPerCol));
    }
    if (lines.length === 0) lines.push('');

    const fontSz = lines.length > 2 ? 11 : 12;
    const colCount = lines.length;
    const maxLineLen = Math.max(...lines.map(l => l.length), 1);

    const boxWidth = Math.max(68, colCount * 22 + 14);
    const boxHeight = Math.max(95, maxLineLen * (fontSz + 3) + 20);

    return { boxWidth, boxHeight, lines, fontSz };
  };

  // 縦長ボックス(実サイズ一致)アンカー計算
  const getAnchorPoint = (fromNode: any, toNode: any) => {
    const fDim = getNodeDimensions(fromNode.title);
    const tDim = getNodeDimensions(toNode.title);

    const fW = fDim.boxWidth;
    const fH = fDim.boxHeight;
    const tW = tDim.boxWidth;
    const tH = tDim.boxHeight;

    const fromX = fromNode.renderX !== undefined ? fromNode.renderX : fromNode.x;
    const toX = toNode.renderX !== undefined ? toNode.renderX : toNode.x;
    const fromY = fromNode.renderY !== undefined ? fromNode.renderY : fromNode.y;
    const toY = toNode.renderY !== undefined ? toNode.renderY : toNode.y;

    const fCenter = { x: fromX + fW / 2, y: fromY + fH / 2 };
    const tCenter = { x: toX + tW / 2, y: toY + tH / 2 };

    const dx = tCenter.x - fCenter.x;
    const dy = tCenter.y - fCenter.y;

    let sx = fCenter.x;
    let sy = fCenter.y;
    if (Math.abs(dx) >= Math.abs(dy) * 0.5) {
      sx = dx > 0 ? fromX + fW : fromX;
      sy = fCenter.y;
    } else {
      sx = fCenter.x;
      sy = dy > 0 ? fromY + fH : fromY;
    }

    let ex = tCenter.x;
    let ey = tCenter.y;
    if (Math.abs(dx) >= Math.abs(dy) * 0.5) {
      ex = dx > 0 ? toX : toX + tW;
      ey = tCenter.y;
    } else {
      ex = tCenter.x;
      ey = dy > 0 ? toY : toY + tH;
    }

    return { sx, sy, ex, ey };
  };

  // 線上ラベル自動オフセット計算
  const getEdgeLabelPosition = (sx: number, sy: number, ex: number, ey: number, offsetDistance = 16) => {
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;

    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const nx = -dy / len;
    const ny = dx / len;

    const lx = mx + nx * offsetDistance;
    const ly = my + ny * offsetDistance;

    return { lx, ly };
  };

  // 線テキストの長さに応じた動的・最小/最大クランプ間隔計算 (110px <= X間隔 <= 160px)
  const calculateNodeXOffset = (label: string = '') => {
    const labelLen = label.length;
    const fontWidth = 13;
    const textPadding = 30; // 左右パディング
    const labelWidth = labelLen * fontWidth + textPadding;
    const rawDistance = labelWidth + 68; // 68: boxWidth
    return Math.max(150, rawDistance);
  };

  // どんな旧データであっても表示時にX座標を綺麗に最適距離へ自動引き締め調整する
  const processedNodes = useMemo(() => {
    if (!nodes || nodes.length === 0) return [];
    
    // 親ノードからの最長接続線ラベルを取得
    const maxIncomingLabelMap = new Map<string, string>();

    edges.forEach(e => {
      const currentLabel = maxIncomingLabelMap.get(e.to) || '';
      if ((e.label || '').length >= currentLabel.length) {
        maxIncomingLabelMap.set(e.to, e.label || '');
      }
    });

    // ノードのX座標を描画用に最適正規化 (再帰的トポロジカルソート)
    const nodeXMap = new Map<string, number>();

    const getX = (nodeId: string, visited = new Set<string>()): number => {
      if (nodeXMap.has(nodeId)) return nodeXMap.get(nodeId)!;
      if (visited.has(nodeId)) return 40; // 循環参照回避
      visited.add(nodeId);

      const incomingEdges = edges.filter(e => e.to === nodeId);
      if (incomingEdges.length === 0) {
        nodeXMap.set(nodeId, 40);
        return 40;
      }

      let maxX = 40;
      incomingEdges.forEach(e => {
        const parentX = getX(e.from, new Set(visited));
        const incomingLabel = maxIncomingLabelMap.get(nodeId) || '接続';
        const offset = calculateNodeXOffset(incomingLabel);
        if (parentX + offset > maxX) {
          maxX = parentX + offset;
        }
      });

      nodeXMap.set(nodeId, maxX);
      return maxX;
    };

    // 全ノードのX座標を計算
    nodes.forEach(n => getX(n.id));

    // 計算されたX座標と元のY座標でベースを作成
    const resolvedNodes = nodes.map(n => ({
      ...n,
      renderX: nodeXMap.has(n.id) ? nodeXMap.get(n.id)! : 40,
      renderY: n.y
    }));

    // Y座標の衝突回避 (同じX列内でY座標が被らないようにスペーサーを入れる)
    resolvedNodes.sort((a, b) => a.renderX - b.renderX || a.renderY - b.renderY);
    for (let i = 0; i < resolvedNodes.length; i++) {
      for (let j = 0; j < i; j++) {
        const nA = resolvedNodes[j];
        const nB = resolvedNodes[i];
        if (Math.abs(nA.renderX - nB.renderX) < 40) {
           const hA = getNodeDimensions(nA.title).boxHeight;
           if (Math.abs(nA.renderY - nB.renderY) < hA + 20) {
              nB.renderY = nA.renderY + hA + 20;
           }
        }
      }
    }

    return resolvedNodes;
  }, [nodes, edges]);

  // ノード追加 (選択ボックスまたは末尾ボックスの右隣にスマート配置 & 自動線接続)
  const handleAddNode = () => {
    const newId = `n_${Date.now()}`;
    const baseNode = nodes.find(n => n.id === selectedNodeId) || nodes[nodes.length - 1];

    let newX = 40;
    let newY = 180;

    if (baseNode) {
      const xOffset = calculateNodeXOffset('次の手続');
      newX = baseNode.x + xOffset;
      newY = baseNode.y;
      // 右端(860px)を超える場合は次の段へ改行
      if (newX > 860) {
        newX = 40;
        newY = Math.min(480, baseNode.y + 130);
      }
    }

    const newNode: FlowNode = {
      id: newId,
      x: newX,
      y: newY,
      width: 70,
      height: 115,
      title: '新規ステップ',
      color: 'blue'
    };

    const updatedNodes = [...nodes, newNode];
    const updatedEdges = [...edges];

    // 直前のボックスから自動で接続線を引く
    if (baseNode) {
      updatedEdges.push({
        id: `e_${Date.now()}`,
        from: baseNode.id,
        to: newId,
        label: '次の手続',
        style: 'solid'
      });
    }

    setNodes(updatedNodes);
    setEdges(updatedEdges);
    setSelectedNodeId(newId);
    if (onSave) onSave({ nodes: updatedNodes, edges: updatedEdges });
  };

  // ノード削除
  const handleDeleteNode = (id: string) => {
    const updatedNodes = nodes.filter(n => n.id !== id);
    const updatedEdges = edges.filter(e => e.from !== id && e.to !== id);
    setNodes(updatedNodes);
    setEdges(updatedEdges);
    setSelectedNodeId(null);
    if (onSave) onSave({ nodes: updatedNodes, edges: updatedEdges });
  };

  // エッジ追加
  const handleAddEdge = (fromId: string, toId: string) => {
    const newEdge: FlowEdge = {
      id: `e_${Date.now()}`,
      from: fromId,
      to: toId,
      label: '条件・期間',
      style: 'solid'
    };
    const updatedEdges = [...edges, newEdge];
    setEdges(updatedEdges);
    if (onSave) onSave({ nodes, edges: updatedEdges });
  };

  // エッジ削除
  const handleDeleteEdge = (id: string) => {
    const updatedEdges = edges.filter(e => e.id !== id);
    setEdges(updatedEdges);
    setSelectedEdgeId(null);
    if (onSave) onSave({ nodes, edges: updatedEdges });
  };

  // 2分岐追加 (基点ノードから上下へ2つ分岐)
  const handleAddBranch2 = (baseNodeId?: string) => {
    const baseNode = nodes.find(n => n.id === (baseNodeId || selectedNodeId)) || nodes[nodes.length - 1];
    const xOffset = calculateNodeXOffset('条件適合');
    const bx = baseNode ? baseNode.x + xOffset : 80;
    const by = baseNode ? baseNode.y : 180;

    const id1 = `n_${Date.now()}_1`;
    const id2 = `n_${Date.now()}_2`;

    const n1: FlowNode = { id: id1, x: bx, y: Math.max(20, by - 120), width: 70, height: 115, title: '条件適合', color: 'emerald' };
    const n2: FlowNode = { id: id2, x: bx, y: Math.min(480, by + 120), width: 70, height: 115, title: '条件不適合', color: 'rose' };

    const newNodes = [...nodes, n1, n2];
    const newEdges = [...edges];

    if (baseNode) {
      newEdges.push(
        { id: `e_${Date.now()}_1`, from: baseNode.id, to: id1, label: '適合', style: 'solid' },
        { id: `e_${Date.now()}_2`, from: baseNode.id, to: id2, label: '不適合', style: 'dashed' }
      );
    }

    setNodes(newNodes);
    setEdges(newEdges);
    if (onSave) onSave({ nodes: newNodes, edges: newEdges });
  };

  // 3分岐追加 (基点ノードから上・中・下へ3つ分岐)
  const handleAddBranch3 = (baseNodeId?: string) => {
    const baseNode = nodes.find(n => n.id === (baseNodeId || selectedNodeId)) || nodes[nodes.length - 1];
    const xOffset = calculateNodeXOffset('事後届出要件');
    const bx = baseNode ? baseNode.x + xOffset : 80;
    const by = baseNode ? baseNode.y : 220;

    const id1 = `n_${Date.now()}_1`;
    const id2 = `n_${Date.now()}_2`;
    const id3 = `n_${Date.now()}_3`;

    const n1: FlowNode = { id: id1, x: bx, y: Math.max(20, by - 180), width: 70, height: 115, title: '事前届出要件', color: 'blue' };
    const n2: FlowNode = { id: id2, x: bx, y: by, width: 70, height: 115, title: '事後届出要件', color: 'amber' };
    const n3: FlowNode = { id: id3, x: bx, y: Math.min(480, by + 180), width: 70, height: 115, title: '適用除外要件', color: 'purple' };

    const newNodes = [...nodes, n1, n2, n3];
    const newEdges = [...edges];

    if (baseNode) {
      newEdges.push(
        { id: `e_${Date.now()}_1`, from: baseNode.id, to: id1, label: '事前届出', style: 'solid' },
        { id: `e_${Date.now()}_2`, from: baseNode.id, to: id2, label: '事後届出', style: 'solid' },
        { id: `e_${Date.now()}_3`, from: baseNode.id, to: id3, label: '適用除外', style: 'dashed' }
      );
    }

    setNodes(newNodes);
    setEdges(newEdges);
    if (onSave) onSave({ nodes: newNodes, edges: newEdges });
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);

  return (
    <div style={{ marginTop: '1.2rem', marginBottom: '1.2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#000000', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          📐 手続きフローチャート
        </div>
        {editable && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button onClick={handleAddNode} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#e2e8f0', color: '#000000', fontWeight: 'bold', border: '1px solid #94a3b8' }}>
              ＋ ボックス追加
            </button>
            <button onClick={() => handleAddBranch2()} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#2563eb', color: '#ffffff', fontWeight: 'bold', border: 'none' }}>
              🔀 2分岐を作成
            </button>
            <button onClick={() => handleAddBranch3()} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#059669', color: '#ffffff', fontWeight: 'bold', border: 'none' }}>
              🔱 3分岐を作成
            </button>
          </div>
        )}
      </div>

      {/* SVGキャンバス */}
      <svg
        ref={svgRef}
        width="100%"
        height="520"
        viewBox="0 0 1050 520"
        onClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '2px solid #cbd5e1',
          cursor: 'default'
        }}
      >
        <defs>
          <marker id="emb-arrow-solid" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
          </marker>
          <marker id="emb-arrow-dashed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
          </marker>
        </defs>

        {/* エッジ */}
        {edges.map(edge => {
          const fNode = processedNodes.find(n => n.id === edge.from);
          const tNode = processedNodes.find(n => n.id === edge.to);
          if (!fNode || !tNode) return null;

          const { sx, sy, ex, ey } = getAnchorPoint(fNode, tNode);
          const { lx, ly } = getEdgeLabelPosition(sx, sy, ex, ey, 16);
          const isSelected = selectedEdgeId === edge.id;
          const isDashed = edge.style === 'dashed';

          return (
            <g key={edge.id} onClick={(e) => { e.stopPropagation(); if (editable) { setSelectedEdgeId(edge.id); setSelectedNodeId(null); } }}>
              <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="transparent" strokeWidth="16" />
              <line
                x1={sx}
                y1={sy}
                x2={ex}
                y2={ey}
                stroke={isSelected ? '#2563eb' : isDashed ? '#f43f5e' : '#64748b'}
                strokeWidth={isSelected ? 3 : 2}
                strokeDasharray={isDashed ? '5 4' : 'none'}
                markerEnd={`url(#${isDashed ? 'emb-arrow-dashed' : 'emb-arrow-solid'})`}
              />
              {edge.label && (
                <g transform={`translate(${lx}, ${ly})`}>
                  {(() => {
                    const rectW = edge.label.length * 13 + 24;
                    return (
                      <rect
                        x={-rectW / 2}
                        y="-12"
                        width={rectW}
                        height="24"
                        fill="#ffffff"
                        stroke="none"
                      />
                    );
                  })()}
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#000000"
                    fontSize="13"
                    fontWeight="bold"
                  >
                    {edge.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* ノード (縦長ボックス + 日本語縦書き文字・自動最適レイアウト) */}
        {processedNodes.map(node => {
          const c = COLOR_MAP[node.color || 'blue'];
          const isSelected = selectedNodeId === node.id;
          const nodeX = node.renderX !== undefined ? node.renderX : node.x;
          const nodeY = node.renderY !== undefined ? node.renderY : node.y;
          
          const { boxWidth, boxHeight, lines, fontSz } = getNodeDimensions(node.title);
          const colCount = lines.length;

          return (
            <g
              key={node.id}
              transform={`translate(${nodeX}, ${nodeY})`}
              onClick={(e) => {
                e.stopPropagation();
                if (editable) {
                  setSelectedNodeId(node.id);
                  setSelectedEdgeId(null);
                }
              }}
              onDoubleClick={(e) => {
                if (!editable) return;
                e.stopPropagation();
                const newTitle = prompt('ボックスの縦書きテキストを入力してください:', node.title);
                if (newTitle !== null) {
                  const updated = nodes.map(n => n.id === node.id ? { ...n, title: newTitle } : n);
                  setNodes(updated);
                  if (onSave) onSave({ nodes: updated, edges });
                }
              }}
              style={{ cursor: editable ? 'pointer' : 'default' }}
            >
              <rect
                width={boxWidth}
                height={boxHeight}
                rx="12"
                fill={c.bg}
                stroke={isSelected ? '#3b82f6' : c.border}
                strokeWidth={isSelected ? 4 : 2}
                filter={isSelected ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6))' : 'none'}
              />
              <rect width={boxWidth} height="6" rx="3" fill={c.headerBg} />
              
              {lines.map((line, idx) => {
                const lineX = colCount === 1 
                  ? boxWidth / 2 
                  : (boxWidth / 2) + ((colCount - 1) * 11) - (idx * 22);

                return (
                  <text
                    key={idx}
                    x={lineX}
                    y="14"
                    textAnchor="start"
                    style={{
                      writingMode: 'vertical-rl',
                      textOrientation: 'upright',
                      letterSpacing: '1px'
                    }}
                    fill={c.text}
                    fontSize={fontSz}
                    fontWeight="800"
                  >
                    {line}
                  </text>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* 編集案内ヒント & 編集パネル */}
      {editable && (
        <div 
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ marginTop: '0.8rem', padding: '1rem', background: '#ffffff', borderRadius: '12px', border: '2px solid #cbd5e1' }}
        >
          {!selectedNode && !selectedEdge ? (
            <div style={{ fontSize: '0.9rem', color: '#000000', textAlign: 'center', fontWeight: 'bold' }}>
              💡 ボックスまたは線をクリックすると編集できます（ボックスのダブルクリックで直接タイトル変更も可能）
            </div>
          ) : selectedNode ? (
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#000000' }}>✏️ ボックス編集:</span>
              <input
                type="text"
                value={selectedNode.title}
                placeholder="ボックスのテキスト"
                onChange={(e) => {
                  const updated = nodes.map(n => n.id === selectedNode.id ? { ...n, title: e.target.value } : n);
                  setNodes(updated);
                  if (onSave) onSave({ nodes: updated, edges });
                }}
                style={{ fontSize: '0.95rem', fontWeight: '700', padding: '0.5rem 0.8rem', borderRadius: '8px', border: '2px solid #94a3b8', background: '#ffffff', color: '#000000', minWidth: '220px' }}
              />
              <select
                value={selectedNode.color || 'blue'}
                onChange={(e) => {
                  const updated = nodes.map(n => n.id === selectedNode.id ? { ...n, color: e.target.value as any } : n);
                  setNodes(updated);
                  if (onSave) onSave({ nodes: updated, edges });
                }}
                style={{ fontSize: '0.95rem', fontWeight: '700', padding: '0.5rem 0.8rem', borderRadius: '8px', border: '2px solid #94a3b8', background: '#ffffff', color: '#000000' }}
              >
                <option value="blue" style={{ color: '#000000', background: '#ffffff' }}>枠色: ブルー</option>
                <option value="amber" style={{ color: '#000000', background: '#ffffff' }}>枠色: オレンジ</option>
                <option value="purple" style={{ color: '#000000', background: '#ffffff' }}>枠色: パープル</option>
                <option value="emerald" style={{ color: '#000000', background: '#ffffff' }}>枠色: グリーン</option>
                <option value="rose" style={{ color: '#000000', background: '#ffffff' }}>枠色: レッド</option>
              </select>
              <button onClick={() => handleDeleteNode(selectedNode.id)} className="btn" style={{ background: '#ef4444', color: '#ffffff', fontWeight: 'bold', padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '8px', border: 'none' }}>
                🗑️ ボックス削除
              </button>
              <div style={{ width: '100%', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.8rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#000000' }}>🔗 接続線を追加:</span>
                {nodes.filter(n => n.id !== selectedNode.id).map(t => (
                  <button key={t.id} onClick={() => handleAddEdge(selectedNode.id, t.id)} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', fontWeight: 'bold', background: '#e2e8f0', color: '#000000', borderRadius: '8px', border: '1px solid #94a3b8' }}>
                    ➔ {t.title}
                  </button>
                ))}
              </div>
            </div>
          ) : selectedEdge ? (
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#000000' }}>🔗 線編集:</span>
              <input
                type="text"
                value={selectedEdge.label || ''}
                placeholder="線上のテキスト"
                onChange={(e) => {
                  const updated = edges.map(eg => eg.id === selectedEdge.id ? { ...eg, label: e.target.value } : eg);
                  setEdges(updated);
                  if (onSave) onSave({ nodes, edges: updated });
                }}
                style={{ fontSize: '0.95rem', fontWeight: '700', padding: '0.5rem 0.8rem', borderRadius: '8px', border: '2px solid #94a3b8', background: '#ffffff', color: '#000000' }}
              />
              <select
                value={selectedEdge.style || 'solid'}
                onChange={(e) => {
                  const updated = edges.map(eg => eg.id === selectedEdge.id ? { ...eg, style: e.target.value as any } : eg);
                  setEdges(updated);
                  if (onSave) onSave({ nodes, edges: updated });
                }}
                style={{ fontSize: '0.95rem', fontWeight: '700', padding: '0.5rem 0.8rem', borderRadius: '8px', border: '2px solid #94a3b8', background: '#ffffff', color: '#000000' }}
              >
                <option value="solid" style={{ color: '#000000', background: '#ffffff' }}>実線</option>
                <option value="dashed" style={{ color: '#000000', background: '#ffffff' }}>破線</option>
              </select>
              <button onClick={() => handleDeleteEdge(selectedEdge.id)} className="btn" style={{ background: '#ef4444', color: '#ffffff', fontWeight: 'bold', padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '8px', border: 'none' }}>
                🗑️ 線を削除
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
