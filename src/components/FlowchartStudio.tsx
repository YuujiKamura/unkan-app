"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export type FlowNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle?: string;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'emerald';
};

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  style?: 'solid' | 'dashed';
  routing?: 'straight' | 'step';
};

export type FlowPreset = {
  id: string;
  title: string;
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export const INITIAL_PRESETS: FlowPreset[] = [
  {
    id: 'kokudo-jigo',
    title: '国土利用計画法：事後届出フロー',
    description: '売買等の契約締結から、2週間以内の事後届出・勧告までの標準手続き',
    nodes: [
      { id: 'n1', x: 50, y: 160, width: 75, height: 170, title: '当事者間の契約締結', color: 'blue' },
      { id: 'n2', x: 260, y: 160, width: 75, height: 170, title: '事後届出の提出', color: 'amber' },
      { id: 'n3', x: 470, y: 160, width: 75, height: 170, title: '市町村長を経由', color: 'purple' },
      { id: 'n4', x: 680, y: 160, width: 75, height: 170, title: '都道府県知事の審査', color: 'emerald' },
      { id: 'n5', x: 890, y: 160, width: 75, height: 170, title: '助言・勧告の実施', color: 'rose' }
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', label: '2週間以内', style: 'solid' },
      { id: 'e2', from: 'n2', to: 'n3', label: '市町村窓口へ', style: 'solid' },
      { id: 'e3', from: 'n3', to: 'n4', label: '送付・審査', style: 'solid' },
      { id: 'e4', from: 'n4', to: 'n5', label: '目的不適当時', style: 'dashed' }
    ]
  },
  {
    id: 'kokudo-3branch',
    title: '国土利用計画法：届出分類 3分岐判定フロー',
    description: '土地取引の区域と規模による事前届出・事後届出・適用除外の3分岐判定手続き',
    nodes: [
      { id: 'n1', x: 40, y: 200, width: 70, height: 115, title: '土地取引の契約締結', color: 'blue' },
      { id: 'n2', x: 170, y: 40, width: 70, height: 115, title: '事前届出 (注視・監視)', color: 'emerald' },
      { id: 'n3', x: 170, y: 200, width: 70, height: 115, title: '事後届出 (一定規模以上)', color: 'amber' },
      { id: 'n4', x: 170, y: 360, width: 70, height: 115, title: '適用除外 (届出不要)', color: 'purple' }
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', label: '注視・監視区域', style: 'solid' },
      { id: 'e2', from: 'n1', to: 'n3', label: '一定面積以上', style: 'solid' },
      { id: 'e3', from: 'n1', to: 'n4', label: '基準未満・農地', style: 'dashed' }
    ]
  },
  {
    id: 'tezukakin-2branch',
    title: '貨物自動車運送事業法：手付金等保全措置 上下2分岐判定フロー',
    description: '未完成物件・完成物件ごとの保全措置が必要となる代金基準の上下2分岐判定',
    nodes: [
      { id: 'n1', x: 50, y: 170, width: 75, height: 170, title: '自ら売主 運行管理者業者', color: 'blue' },
      { id: 'n2', x: 270, y: 60, width: 75, height: 170, title: '未完成物件 (工事前)', color: 'rose' },
      { id: 'n3', x: 270, y: 280, width: 75, height: 170, title: '完成物件 (工事後)', color: 'amber' },
      { id: 'n4', x: 520, y: 170, width: 75, height: 170, title: '保全措置が必要', color: 'emerald' }
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', label: '未完成物件', style: 'solid' },
      { id: 'e2', from: 'n1', to: 'n3', label: '完成物件', style: 'solid' },
      { id: 'e3', from: 'n2', to: 'n4', label: '5%超 or 1千万円', style: 'solid' },
      { id: 'e4', from: 'n3', to: 'n4', label: '10%超 or 1千万円', style: 'solid' }
    ]
  },
  {
    id: 'takken-35-37',
    title: '貨物自動車運送事業法：35条書面と37条書面の交付フロー',
    description: '契約前の35条重要事項説明から、契約成立後の37条書面交付までのながれ',
    nodes: [
      { id: 'n1', x: 50, y: 160, width: 75, height: 170, title: '35条 重要事項説明', color: 'blue' },
      { id: 'n2', x: 260, y: 160, width: 75, height: 170, title: '売買・賃貸 契約成立', color: 'emerald' },
      { id: 'n3', x: 470, y: 160, width: 75, height: 170, title: '37条 書面の交付', color: 'purple' },
      { id: 'n4', x: 680, y: 160, width: 75, height: 170, title: '代金の支払・引渡し', color: 'amber' }
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', label: '契約前説明', style: 'solid' },
      { id: 'e2', from: 'n2', to: 'n3', label: '遅滞なく交付', style: 'solid' },
      { id: 'e3', from: 'n3', to: 'n4', label: '契約履行へ', style: 'solid' }
    ]
  },
  {
    id: 'morito-kyoka',
    title: '宅地造成及び特定盛土等規制法：許可フロー',
    description: '盛土等の工事計画から許可・着手・完了検査までのながれ',
    nodes: [
      { id: 'n1', x: 50, y: 160, width: 75, height: 170, title: '工事計画の立案', color: 'blue' },
      { id: 'n2', x: 260, y: 160, width: 75, height: 170, title: '知事への許可申請', color: 'amber' },
      { id: 'n3', x: 470, y: 160, width: 75, height: 170, title: '工事の着手・施工', color: 'purple' },
      { id: 'n4', x: 680, y: 160, width: 75, height: 170, title: '完了検査・済証', color: 'emerald' }
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', label: '一定規模以上', style: 'solid' },
      { id: 'e2', from: 'n2', to: 'n3', label: '許可取得後', style: 'solid' },
      { id: 'e3', from: 'n3', to: 'n4', label: '工事完了時', style: 'solid' }
    ]
  }
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; headerBg: string }> = {
  blue: { bg: 'rgba(37, 99, 235, 0.08)', border: '#2563eb', text: '#1d4ed8', headerBg: '#2563eb' },
  green: { bg: 'rgba(16, 185, 129, 0.08)', border: '#10b981', text: '#047857', headerBg: '#10b981' },
  amber: { bg: 'rgba(245, 158, 11, 0.08)', border: '#f59e0b', text: '#b45309', headerBg: '#f59e0b' },
  purple: { bg: 'rgba(139, 92, 246, 0.08)', border: '#8b5cf6', text: '#6d28d9', headerBg: '#8b5cf6' },
  rose: { bg: 'rgba(244, 63, 94, 0.08)', border: '#f43f5e', text: '#be123c', headerBg: '#f43f5e' },
  emerald: { bg: 'rgba(5, 150, 105, 0.08)', border: '#059669', text: '#047857', headerBg: '#059669' }
};

export default function FlowchartStudio() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('kokudo-jigo');
  const [nodes, setNodes] = useState<FlowNode[]>(INITIAL_PRESETS[0].nodes);
  const [edges, setEdges] = useState<FlowEdge[]>(INITIAL_PRESETS[0].edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  
  // ドラッグ操作の状態
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // ノードサイズ動的計算
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

  // 自動レイアウト計算
  const applyAutoLayout = (nodesToLayout: FlowNode[], edgesToLayout: FlowEdge[]) => {
    const calculateNodeXOffset = (label: string = '') => {
      const labelLen = label.length;
      const fontWidth = 13;
      const textPadding = 30;
      return Math.max(150, labelLen * fontWidth + textPadding + 68);
    };

    const maxIncomingLabelMap = new Map<string, string>();
    edgesToLayout.forEach(e => {
      const currentLabel = maxIncomingLabelMap.get(e.to) || '';
      if ((e.label || '').length >= currentLabel.length) {
        maxIncomingLabelMap.set(e.to, e.label || '');
      }
    });

    const nodeXMap = new Map<string, number>();
    const getX = (nodeId: string, visited = new Set<string>()): number => {
      if (nodeXMap.has(nodeId)) return nodeXMap.get(nodeId)!;
      if (visited.has(nodeId)) return 40;
      visited.add(nodeId);

      const incoming = edgesToLayout.filter(e => e.to === nodeId);
      if (incoming.length === 0) {
        nodeXMap.set(nodeId, 40);
        return 40;
      }
      let maxX = 40;
      incoming.forEach(e => {
        const parentX = getX(e.from, new Set(visited));
        const incomingLabel = maxIncomingLabelMap.get(nodeId) || '接続';
        const offset = calculateNodeXOffset(incomingLabel);
        if (parentX + offset > maxX) maxX = parentX + offset;
      });
      nodeXMap.set(nodeId, maxX);
      return maxX;
    };

    nodesToLayout.forEach(n => getX(n.id));

    const resolvedNodes = nodesToLayout.map(n => ({ ...n, x: nodeXMap.get(n.id) || 40 }));
    resolvedNodes.sort((a, b) => a.x - b.x || a.y - b.y);
    for (let i = 0; i < resolvedNodes.length; i++) {
      for (let j = 0; j < i; j++) {
        const nA = resolvedNodes[j];
        const nB = resolvedNodes[i];
        if (Math.abs(nA.x - nB.x) < 40) {
           const hA = getNodeDimensions(nA.title).boxHeight;
           if (Math.abs(nA.y - nB.y) < hA + 20) nB.y = nA.y + hA + 20;
        }
      }
    }
    return resolvedNodes;
  };

  // プリセット切替
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = INITIAL_PRESETS.find(p => p.id === presetId);
    if (preset) {
      const newNodes = JSON.parse(JSON.stringify(preset.nodes));
      const newEdges = JSON.parse(JSON.stringify(preset.edges));
      setNodes(applyAutoLayout(newNodes, newEdges));
      setEdges(newEdges);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  };

  // 初期ロード時にも自動レイアウトを適用
  useEffect(() => {
    setNodes(prev => applyAutoLayout(prev, edges));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ

  // ドラッグ開始
  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    setDraggingNodeId(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - node.x,
        y: e.clientY - rect.top - node.y
      });
    }
  };

  // ドラッグ中
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const newX = Math.max(10, Math.min(1000, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(10, Math.min(600, e.clientY - rect.top - dragOffset.y));

    setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n));
  };

  // ドラッグ終了
  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  // ノード追加
  const handleAddNode = () => {
    const newId = `n_${Date.now()}`;
    const newNode: FlowNode = {
      id: newId,
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      width: 170,
      height: 80,
      title: '新規フロー項目',
      subtitle: '説明テキスト',
      color: 'blue'
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newId);
  };

  // ノード削除
  const handleDeleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
    setEdges(prev => prev.filter(e => e.from !== selectedNodeId && e.to !== selectedNodeId));
    setSelectedNodeId(null);
  };

  // エッジ追加
  const handleAddEdge = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const newEdgeId = `e_${Date.now()}`;
    const newEdge: FlowEdge = {
      id: newEdgeId,
      from: fromId,
      to: toId,
      label: '接続条件テキスト',
      style: 'solid'
    };
    setEdges(prev => [...prev, newEdge]);
  };

  // エッジ削除
  const handleDeleteSelectedEdge = () => {
    if (!selectedEdgeId) return;
    setEdges(prev => prev.filter(e => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  };

  // 幾何計算: ノード境界と線の交点算出（接続線の外枠接続）
  const getAnchorPoint = (fromNode: FlowNode, toNode: FlowNode) => {
    const fDim = getNodeDimensions(fromNode.title);
    const tDim = getNodeDimensions(toNode.title);
    const fW = fDim.boxWidth;
    const fH = fDim.boxHeight;
    const tW = tDim.boxWidth;
    const tH = tDim.boxHeight;

    const fCenter = { x: fromNode.x + fW / 2, y: fromNode.y + fH / 2 };
    const tCenter = { x: toNode.x + tW / 2, y: toNode.y + tH / 2 };

    const dx = tCenter.x - fCenter.x;
    const dy = tCenter.y - fCenter.y;

    // 簡易境界接続計算
    let sx = fCenter.x;
    let sy = fCenter.y;
    if (Math.abs(dx) >= Math.abs(dy) * 0.5) {
      sx = dx > 0 ? fromNode.x + fW : fromNode.x;
      sy = fCenter.y;
    } else {
      sx = fCenter.x;
      sy = dy > 0 ? fromNode.y + fH : fromNode.y;
    }

    let ex = tCenter.x;
    let ey = tCenter.y;
    if (Math.abs(dx) >= Math.abs(dy) * 0.5) {
      ex = dx > 0 ? toNode.x : toNode.x + tW;
      ey = tCenter.y;
    } else {
      ex = tCenter.x;
      ey = dy > 0 ? toNode.y : toNode.y + tH;
    }

    return { sx, sy, ex, ey };
  };

  // 幾何計算: 線上の自動オフセットラベルの位置計算
  const getEdgeLabelPosition = (sx: number, sy: number, ex: number, ey: number, offsetDistance = 18) => {
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;

    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    // 法線ベクトル（線に対して垂直な方向）
    const nx = -dy / len;
    const ny = dx / len;

    // オフセット位置
    const lx = mx + nx * offsetDistance;
    const ly = my + ny * offsetDistance;

    return { lx, ly };
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);

  return (
    <div className="container animate-fade-in-up" style={{ maxWidth: '1200px', padding: '2rem 1rem' }}>
      {/* ヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>
            📐 運行管理者ビジュアル・法務フローチャート
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.4rem' }}>
            法律手続き（届出・交付・許可）をテキスト入り角丸ボックスと自動オフセット接続線で可視化・インタラクティブ編集
          </p>
        </div>
        <Link href="/questions" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '20px' }}>
          ↩ 問題演習に戻る
        </Link>
      </div>

      {/* プリセット選択タブ */}
      <div style={{ display: 'flex', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.8rem', marginBottom: '1.5rem' }}>
        {INITIAL_PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => handleSelectPreset(preset.id)}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '12px',
              border: `1px solid ${selectedPresetId === preset.id ? 'var(--accent-primary)' : 'var(--surface-border)'}`,
              background: selectedPresetId === preset.id ? 'var(--accent-primary)' : 'var(--surface-color)',
              color: selectedPresetId === preset.id ? '#fff' : 'var(--text-primary)',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              boxShadow: selectedPresetId === preset.id ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none'
            }}
          >
            {preset.title}
          </button>
        ))}
      </div>

      {/* メイン編集エリア（SVGキャンバス ＋ 編集パネル） */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start', minHeight: '600px' }}>
        
        {/* SVGフローチャートキャンバス */}
        <div 
          className="glass-panel" 
          style={{ 
            position: 'relative', 
            background: 'var(--surface-color)', 
            borderRadius: '16px', 
            padding: '1rem', 
            overflow: 'hidden',
            border: '1px solid var(--surface-border)',
            minHeight: '600px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', padding: '0 0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
              💡 ボックスをドラッグして位置調整 | 線上のラベルテキストは線から自動浮揚オフセット配置されます
            </span>
            <button onClick={handleAddNode} className="btn btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.82rem' }}>
              ＋ ノード追加
            </button>
          </div>

          <svg
            ref={svgRef}
            width="100%"
            height="550"
            viewBox="0 0 1050 550"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
            style={{ background: 'rgba(248, 250, 252, 0.6)', borderRadius: '12px', border: '1px solid rgba(203, 213, 225, 0.4)', cursor: draggingNodeId ? 'grabbing' : 'default' }}
          >
            <defs>
              {/* 矢印マーカー */}
              <marker id="arrow-solid" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
              </marker>
              <marker id="arrow-dashed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
              </marker>
            </defs>

            {/* 1. 接続線 (Edges) と 自動オフセット線ラベル */}
            {edges.map(edge => {
              const fNode = nodes.find(n => n.id === edge.from);
              const tNode = nodes.find(n => n.id === edge.to);
              if (!fNode || !tNode) return null;

              const { sx, sy, ex, ey } = getAnchorPoint(fNode, tNode);
              const { lx, ly } = getEdgeLabelPosition(sx, sy, ex, ey, 18);
              const isSelected = selectedEdgeId === edge.id;
              const isDashed = edge.style === 'dashed';

              return (
                <g key={edge.id} onClick={(e) => { e.stopPropagation(); setSelectedEdgeId(edge.id); setSelectedNodeId(null); }} style={{ cursor: 'pointer' }}>
                  {edge.routing === 'step' ? (
                    <>
                      <path d={`M ${sx} ${sy} L ${(sx+ex)/2} ${sy} L ${(sx+ex)/2} ${ey} L ${ex} ${ey}`} fill="none" stroke="transparent" strokeWidth="16" />
                      <path
                        d={`M ${sx} ${sy} L ${(sx+ex)/2} ${sy} L ${(sx+ex)/2} ${ey} L ${ex} ${ey}`}
                        fill="none"
                        stroke={isSelected ? '#2563eb' : isDashed ? '#f43f5e' : '#475569'}
                        strokeWidth={isSelected ? 3 : 2}
                        strokeDasharray={isDashed ? '6 4' : 'none'}
                        markerEnd={`url(#${isDashed ? 'arrow-dashed' : 'arrow-solid'})`}
                        style={{ transition: 'stroke 0.2s' }}
                      />
                    </>
                  ) : (
                    <>
                      {/* 判定補助太透明線 */}
                      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="transparent" strokeWidth="16" />
                      
                      {/* 接続線本体 */}
                      <line
                        x1={sx}
                        y1={sy}
                        x2={ex}
                        y2={ey}
                        stroke={isSelected ? '#2563eb' : isDashed ? '#f43f5e' : '#475569'}
                        strokeWidth={isSelected ? 3 : 2}
                        strokeDasharray={isDashed ? '6 4' : 'none'}
                        markerEnd={`url(#${isDashed ? 'arrow-dashed' : 'arrow-solid'})`}
                        style={{ transition: 'stroke 0.2s' }}
                      />
                    </>
                  )}

                  {/* 自動オフセット線ラベルテキストバッジ */}
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
                            rx="12"
                            fill="#ffffff"
                            stroke={isSelected ? '#2563eb' : isDashed ? '#f43f5e' : '#cbd5e1'}
                            strokeWidth="1.5"
                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))' }}
                          />
                        );
                      })()}
                      <text
                        x="0"
                        y="4"
                        textAnchor="middle"
                        fill={isDashed ? '#be123c' : '#1e293b'}
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="Outfit, sans-serif"
                      >
                        {edge.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* 2. 角丸ボックスノード (Nodes) */}
            {nodes.map(node => {
              const c = COLOR_MAP[node.color || 'blue'];
              const isSelected = selectedNodeId === node.id;
              
              const { boxWidth, boxHeight, lines, fontSz } = getNodeDimensions(node.title);

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                  style={{ cursor: draggingNodeId === node.id ? 'grabbing' : 'grab' }}
                >
                  {/* ボックス本体 (角丸長方形) */}
                  <rect
                    width={boxWidth}
                    height={boxHeight}
                    rx="14"
                    fill={c.bg}
                    stroke={isSelected ? '#2563eb' : c.border}
                    strokeWidth={isSelected ? 3 : 2}
                    style={{
                      filter: isSelected ? 'drop-shadow(0 6px 16px rgba(37,99,235,0.3))' : 'drop-shadow(0 4px 10px rgba(0,0,0,0.05))',
                      transition: 'stroke 0.2s, filter 0.2s'
                    }}
                  />

                  {/* 上部カラーヘッダーバー */}
                  <rect
                    width={boxWidth}
                    height="6"
                    rx="3"
                    fill={c.headerBg}
                  />

                  {/* ノード内テキスト */}
                  {lines.map((line, i) => (
                    <text
                      key={i}
                      x={boxWidth / 2}
                      y={25 + i * (fontSz + 6)}
                      textAnchor="middle"
                      fill={c.text}
                      fontSize={fontSz}
                      fontWeight="bold"
                      fontFamily="Outfit, sans-serif"
                    >
                      {line}
                    </text>
                  ))}

                  {node.subtitle && (
                    <text
                      x={boxWidth / 2}
                      y={boxHeight - 15}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="11"
                      fontFamily="Outfit, sans-serif"
                    >
                      {node.subtitle}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* 3. サイドパネル：編集・プロパティコントロール */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--surface-border)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.6rem' }}>
            ⚙️ パラメータ編集
          </h3>

          {selectedNode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                📌 選択中のボックス要素
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>タイトル</label>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, title: e.target.value } : n))}
                  onKeyDown={(e) => e.stopPropagation()}
                  style={{ width: '100%', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>補足説明</label>
                <input
                  type="text"
                  value={selectedNode.subtitle || ''}
                  onChange={(e) => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, subtitle: e.target.value } : n))}
                  onKeyDown={(e) => e.stopPropagation()}
                  style={{ width: '100%', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>カラーテーマ</label>
                <select
                  value={selectedNode.color || 'blue'}
                  onChange={(e) => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, color: e.target.value as any } : n))}
                  style={{ width: '100%', fontSize: '0.9rem' }}
                >
                  <option value="blue">ブルー（手続き・標準）</option>
                  <option value="amber">アンバー（届出・注意）</option>
                  <option value="purple">パープル（役所・申請）</option>
                  <option value="emerald">エメラルド（完了・許可）</option>
                  <option value="rose">ローズ（制限・不適当）</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={handleDeleteSelectedNode} className="btn" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444', width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}>
                  🗑️ ボックスを削除
                </button>
              </div>

              <hr style={{ border: 0, borderTop: '1px solid var(--surface-border)', margin: '0.5rem 0' }} />

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                🔗 他のノードへ線を接続
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {nodes.filter(n => n.id !== selectedNode.id).map(targetNode => (
                  <button
                    key={targetNode.id}
                    onClick={() => handleAddEdge(selectedNode.id, targetNode.id)}
                    className="btn btn-secondary"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', textAlign: 'left', whiteSpace: 'normal', wordBreak: 'break-word' }}
                  >
                    ➔ {targetNode.title} に接続
                  </button>
                ))}
              </div>
            </div>
          ) : selectedEdge ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                🔗 選択中の接続線
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>線上の条件テキスト (自動浮揚オフセット)</label>
                <input
                  type="text"
                  value={selectedEdge.label || ''}
                  onChange={(e) => setEdges(edges.map(eg => eg.id === selectedEdge.id ? { ...eg, label: e.target.value } : eg))}
                  onKeyDown={(e) => e.stopPropagation()}
                  style={{ width: '100%', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>線の種類</label>
                <select
                  value={selectedEdge.style || 'solid'}
                  onChange={(e) => setEdges(edges.map(eg => eg.id === selectedEdge.id ? { ...eg, style: e.target.value as any } : eg))}
                  style={{ width: '100%', fontSize: '0.9rem' }}
                >
                  <option value="solid">実線（標準フロー）</option>
                  <option value="dashed">破線（条件分岐・勧告）</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>線の接続方式</label>
                <select
                  value={selectedEdge.routing || 'straight'}
                  onChange={(e) => setEdges(edges.map(eg => eg.id === selectedEdge.id ? { ...eg, routing: e.target.value as any } : eg))}
                  style={{ width: '100%', fontSize: '0.9rem' }}
                >
                  <option value="straight">放射 (直線)</option>
                  <option value="step">鍵ノード (直角カギ型)</option>
                </select>
              </div>

              <button onClick={handleDeleteSelectedEdge} className="btn" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444', width: '100%', padding: '0.5rem', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                🗑️ 接続線を削除
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              キャンバス上の角丸ボックスまたは接続線をクリックすると、タイトルやオフセットテキストを自由に編集できます。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
