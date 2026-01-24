import React, { useState, useRef } from 'react';
import { Paperclip, Upload, FileSpreadsheet, FileText, File as FileIcon, Eye, Download, Trash2, X } from 'lucide-react';
import { CountryFile } from '../../types';
import { generateUUID } from '../../utils/dateUtils';

interface ResourceFileListProps {
    files: CountryFile[];
    onAddFiles: (newFiles: CountryFile[]) => void;
    onDeleteFile: (id: string) => void;
    selectedCountry: string;
    isReadOnly: boolean;
}

export const ResourceFileList: React.FC<ResourceFileListProps> = ({
    files,
    onAddFiles,
    onDeleteFile,
    selectedCountry,
    isReadOnly
}) => {
    const docUploadRef = useRef<HTMLInputElement>(null);
    const [previewFile, setPreviewFile] = useState<CountryFile | null>(null);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isReadOnly || !selectedCountry) return;
        const targetFiles = e.target.files;
        if (!targetFiles || targetFiles.length === 0) return;

        const newFiles: CountryFile[] = [];
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit

        for (let i = 0; i < targetFiles.length; i++) {
            const file = targetFiles[i];
            if (file.size > MAX_SIZE) {
                alert(`文件 ${file.name} 过大 (超过5MB)，无法上传到本地存储。`);
                continue;
            }

            try {
                const base64 = await fileToBase64(file);
                newFiles.push({
                    id: generateUUID(),
                    country: selectedCountry,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: base64,
                    uploadDate: Date.now()
                });
            } catch (err) {
                console.error("Failed to read file", file.name, err);
            }
        }

        if (newFiles.length > 0) {
            onAddFiles(newFiles);
        }

        if (docUploadRef.current) docUploadRef.current.value = '';
    };

    const downloadFile = (file: CountryFile) => {
        const link = document.createElement('a');
        link.href = file.data;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const openPreview = (file: CountryFile) => {
        if (file.type.startsWith('image/') || file.type === 'text/plain') {
            setPreviewFile(file);
        } else {
            downloadFile(file);
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm("确定删除此文件吗？")) {
            onDeleteFile(id);
        }
    };

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <input
                type="file"
                ref={docUploadRef}
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*"
                onChange={handleDocUpload}
            />

            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Paperclip size={16} /> 交通参考文档 (文件/图片)
                </h3>
                {!isReadOnly && (
                    <button onClick={() => docUploadRef.current?.click()} className="text-sm px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm flex items-center gap-2 transition-all font-medium">
                        <Upload size={14} /> 上传文件
                    </button>
                )}
            </div>

            {files.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded">
                    暂无参考文件
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {files.map(file => (
                        <div key={file.id} className="bg-white border border-gray-100 rounded-xl p-3 relative group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                            <div className="flex flex-col items-center gap-2 mb-2">
                                {file.type.startsWith('image/') ? (
                                    <div className="h-16 w-full flex items-center justify-center bg-gray-100 rounded overflow-hidden">
                                        <img src={file.data} alt={file.name} className="h-full w-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="h-16 w-16 flex items-center justify-center bg-blue-50 text-blue-500 rounded-full">
                                        {file.type.includes('sheet') || file.type.includes('excel') ? <FileSpreadsheet size={24} /> :
                                            file.type.includes('text') ? <FileText size={24} /> : <FileIcon size={24} />}
                                    </div>
                                )}
                                <span className="text-xs font-medium text-gray-700 text-center line-clamp-2 w-full break-all" title={file.name}>{file.name}</span>
                            </div>

                            <div className="flex items-center justify-center gap-2 pt-2 border-t mt-1">
                                <button onClick={() => openPreview(file)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title={file.type.startsWith('image/') ? "预览" : "下载"}>
                                    {file.type.startsWith('image/') || file.type === 'text/plain' ? <Eye size={14} /> : <Download size={14} />}
                                </button>
                                {!isReadOnly && (
                                    <button onClick={() => handleDelete(file.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="删除">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-[70] flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
                    <div className="bg-white rounded-lg overflow-hidden max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-3 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-700">{previewFile.name}</h3>
                            <button onClick={() => setPreviewFile(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center">
                            {previewFile.type.startsWith('image/') ? (
                                <img src={previewFile.data} alt={previewFile.name} className="max-w-full max-h-[75vh] object-contain shadow-sm" />
                            ) : (
                                <pre className="whitespace-pre-wrap font-mono text-xs bg-white p-4 rounded shadow border overflow-auto w-full h-full max-h-[70vh]">
                                    {/* Attempt to decode base64 for text */}
                                    {atob(previewFile.data.split(',')[1])}
                                </pre>
                            )}
                        </div>
                        <div className="p-3 border-t bg-gray-50 flex justify-end">
                            <button onClick={() => downloadFile(previewFile)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2">
                                <Download size={16} /> 下载原文件
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
