import { FlowNode, FlowEdge } from '@/components/FlowchartStudio';

export type SavedFlowchartItem = {
  id: string;
  title: string;
  category: string; // '国土利用計画法' | '貨物自動車運送事業法' | '権利関係' | '法令上の制限' | '税・その他'
  nodes: FlowNode[];
  edges: FlowEdge[];
  updatedAt: string;
};

const STORAGE_KEY = 'takken_flowchart_library_v1';

// デフォルトの共通分野別ライブラリ
export const DEFAULT_LIBRARY_ITEMS: SavedFlowchartItem[] = [
  {
    id: 'lib_kokudo_3branch',
    title: '国土利用計画法：3分岐判定 (事前・事後・除外)',
    category: '法令上の制限',
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
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'lib_tezukakin_2branch',
    title: '貨物自動車運送事業法：手付金等保全措置 上下2分岐フロー',
    category: '貨物自動車運送事業法',
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
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'lib_kokudo_1',
    title: '国土利用計画法：事後届出の標準手続き',
    category: '法令上の制限',
    nodes: [
      { id: 'n1', x: 50, y: 160, width: 75, height: 170, title: '当事者間の契約締結', color: 'blue' },
      { id: 'n2', x: 260, y: 160, width: 75, height: 170, title: '事後届出の提出', color: 'amber' },
      { id: 'n3', x: 470, y: 160, width: 75, height: 170, title: '市町村長を経由', color: 'purple' },
      { id: 'n4', x: 680, y: 160, width: 75, height: 170, title: '知事の審査・不勧告', color: 'emerald' }
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', label: '2週間以内', style: 'solid' },
      { id: 'e2', from: 'n2', to: 'n3', label: '窓口送付', style: 'solid' },
      { id: 'e3', from: 'n3', to: 'n4', label: '3週間審査', style: 'solid' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'lib_takken_35',
    title: '貨物自動車運送事業法：肢1用・35条重要事項説明フロー',
    category: '貨物自動車運送事業法',
    nodes: [
      { id: 'n1', x: 60, y: 150, width: 170, height: 75, title: '契約成立前の説明', subtitle: '運行管理者が相手方に説明', color: 'blue' },
      { id: 'n2', x: 310, y: 150, width: 170, height: 75, title: '35条書面の交付', subtitle: '記名された書面交付', color: 'amber' },
      { id: 'n3', x: 560, y: 150, width: 160, height: 75, title: '売買・賃貸 契約成立', subtitle: '合意完了', color: 'emerald' }
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', label: '運行管理者証提示', style: 'solid' },
      { id: 'e2', from: 'n2', to: 'n3', label: '契約へ移行', style: 'solid' }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 'lib_takken_37',
    title: '貨物自動車運送事業法：肢2用・37条書面遅滞なく交付フロー',
    category: '貨物自動車運送事業法',
    nodes: [
      { id: 'n1', x: 60, y: 150, width: 160, height: 75, title: '契約成立', subtitle: '売買・賃貸の合意', color: 'blue' },
      { id: 'n2', x: 300, y: 150, width: 180, height: 75, title: '37条書面の交付', subtitle: '遅滞なく当事者に交付', color: 'purple' },
      { id: 'n3', x: 550, y: 150, width: 160, height: 75, title: '代金の支払・引渡し', subtitle: '契約履行', color: 'emerald' }
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', label: '遅滞なく(記名必須)', style: 'solid' },
      { id: 'e2', from: 'n2', to: 'n3', label: '履行手続き', style: 'solid' }
    ],
    updatedAt: new Date().toISOString()
  }
];

export function getFlowchartLibrary(): SavedFlowchartItem[] {
  if (typeof window === 'undefined') return DEFAULT_LIBRARY_ITEMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LIBRARY_ITEMS));
      return DEFAULT_LIBRARY_ITEMS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_LIBRARY_ITEMS;
  }
}

export function saveFlowchartToLibrary(item: Omit<SavedFlowchartItem, 'updatedAt'>): SavedFlowchartItem {
  const current = getFlowchartLibrary();
  const newItem: SavedFlowchartItem = {
    ...item,
    updatedAt: new Date().toISOString()
  };

  const existingIdx = current.findIndex(i => i.id === item.id);
  let updated: SavedFlowchartItem[];
  if (existingIdx !== -1) {
    updated = [...current];
    updated[existingIdx] = newItem;
  } else {
    updated = [newItem, ...current];
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return newItem;
}

export function deleteFlowchartFromLibrary(id: string): SavedFlowchartItem[] {
  const current = getFlowchartLibrary();
  const updated = current.filter(i => i.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}
