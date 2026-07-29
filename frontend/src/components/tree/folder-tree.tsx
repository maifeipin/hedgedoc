'use me';
import React, { useState, useEffect } from 'react';

export interface FolderNode {
  id: number;
  name: string;
  isSystem?: boolean;
  parentId?: number;
  children?: FolderNode[];
}

interface FolderTreeProps {
  activeNoteId?: number;
  onSelectNote?: (noteId: number) => void;
  onSelectTable?: (tableId: number) => void;
  onImportMD?: () => void;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  activeNoteId,
  onSelectNote,
  onSelectTable,
  onImportMD,
}) => {
  const [treeData, setTreeData] = useState<FolderNode[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchTree();
  }, []);

  const fetchTree = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v2/folders/tree');
      if (res.ok) {
        const data = await res.json();
        setTreeData(data);
        // 默认展开首层
        const initialExpand: Record<number, boolean> = {};
        data.forEach((item: FolderNode) => {
          initialExpand[item.id] = true;
        });
        setExpanded(initialExpand);
      }
    } catch (e) {
      console.error('Failed to load folder tree', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (node: FolderNode, level: number = 0) => {
    const isExpanded = !!expanded[node.id];
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none text-sm">
        <div
          onClick={() => toggleExpand(node.id)}
          className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800 ${
            level > 0 ? 'ml-4' : ''
          }`}
        >
          <span className="w-4 text-center text-xs text-neutral-400">
            {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
          </span>
          <span className="text-base">{node.isSystem ? '📥' : '📁'}</span>
          <span className="font-medium truncate flex-1">{node.name}</span>
        </div>

        {isExpanded && hasChildren && (
          <div className="pl-2 border-l border-neutral-200 dark:border-neutral-700 ml-3">
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 p-3">
      {/* 头部操作条 */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="font-bold text-neutral-700 dark:text-neutral-200 text-sm tracking-wide">
          📖 个人工作台
        </h2>
        <button
          onClick={onImportMD}
          className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all shadow-sm active:scale-95"
          title="导入 Markdown 文件"
        >
          📥 导入 MD
        </button>
      </div>

      {/* 树状目录结构 */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {loading ? (
          <div className="text-xs text-neutral-400 p-2">加载目录中...</div>
        ) : treeData.length === 0 ? (
          <div className="text-xs text-neutral-400 p-2">暂无目录</div>
        ) : (
          treeData.map((node) => renderNode(node))
        )}
      </div>
    </div>
  );
};
