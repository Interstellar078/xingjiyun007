import React from 'react';
import { FileSpreadsheet, Loader2, Check, AlertCircle, Info } from 'lucide-react';

interface ImportSectionProps {
    title: string;
    keywords: Record<string, string>;
    isReadOnly: boolean;
    onImportClick: () => void;
    importStatus: 'idle' | 'loading' | 'success' | 'error';
    importFeedback: string;
}

export const ImportSection: React.FC<ImportSectionProps> = ({
    title,
    keywords,
    isReadOnly,
    onImportClick,
    importStatus,
    importFeedback
}) => {
    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {!isReadOnly && (
                        <button
                            onClick={onImportClick}
                            className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 flex items-center gap-2 transition-colors"
                        >
                            <FileSpreadsheet size={16} /> 导入 Excel 配置
                        </button>
                    )}
                    {/* Status Display */}
                    {importStatus !== 'idle' && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm animate-fade-in ${importStatus === 'loading' ? 'bg-blue-50 text-blue-700' :
                            importStatus === 'success' ? 'bg-green-50 text-green-700' :
                                'bg-red-50 text-red-700'
                            }`}>
                            {importStatus === 'loading' && <Loader2 size={14} className="animate-spin" />}
                            {importStatus === 'success' && <Check size={14} />}
                            {importStatus === 'error' && <AlertCircle size={14} />}
                            {importFeedback}
                        </div>
                    )}

                </div>
            </div>

            {!isReadOnly && (
                <div className="bg-blue-50 border border-blue-100 rounded p-3 mb-4 text-xs text-blue-800 flex items-start gap-2">
                    <Info size={16} className="shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold mb-1">Excel 导入格式说明 (支持智能识别)：</p>
                        <p>请确保您的 Excel 文件包含以下表头（列名），支持中/英文及模糊匹配：</p>
                        <div className="flex gap-2 mt-1 flex-wrap font-mono">
                            {Object.entries(keywords).map(([label, tooltip]) => (
                                <span key={label} className="bg-white px-1.5 py-0.5 rounded border border-blue-200" title={tooltip}>{label}</span>
                            ))}
                        </div>
                        <p className="mt-1 text-blue-600/80">提示：系统会自动根据表头关键词识别是导入{title}数据。</p>
                    </div>
                </div>
            )}
        </>
    );
};
