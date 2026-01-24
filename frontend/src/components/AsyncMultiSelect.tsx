import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Loader2 } from 'lucide-react';

interface AsyncMultiSelectProps {
    value: string[];
    onChange: (value: string[]) => void;
    fetchOptions: (query: string) => Promise<string[]>;
    placeholder?: string;
    className?: string;
    displaySeparator?: string; // e.g. "-" for routes
    dependencies?: any[];
}

export const AsyncMultiSelect: React.FC<AsyncMultiSelectProps> = ({
    value = [], onChange, fetchOptions, placeholder, className, displaySeparator, dependencies = []
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Fetching Logic
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetchOptions(query);
                setOptions(res);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query, isOpen, ...dependencies]);

    // Outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (option: string) => {
        if (value.includes(option)) {
            onChange(value.filter(v => v !== option));
        } else {
            onChange([...value, option]);
        }
    };

    const removeItem = (e: React.MouseEvent, item: string) => {
        e.stopPropagation();
        onChange(value.filter(v => v !== item));
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div
                className={`flex flex-wrap items-center gap-1 border border-gray-300 rounded px-1 min-h-[28px] bg-white cursor-text ${className}`}
                onClick={() => setIsOpen(true)}
            >
                {/* Display Value */}
                {displaySeparator ? (
                    // Route Mode: A-B-C
                    <span className="text-xs px-1 text-gray-700">
                        {value.length > 0 ? value.join(` ${displaySeparator} `) : <span className="text-gray-400">{placeholder}</span>}
                    </span>
                ) : (
                    // Tag Mode
                    value.length > 0 ? value.map((v, i) => (
                        <span key={i} className="bg-blue-100 text-blue-800 text-xs px-1 rounded flex items-center gap-0.5">
                            {v}
                            <X size={10} className="hover:text-red-500 cursor-pointer" onClick={(e) => removeItem(e, v)} />
                        </span>
                    )) : <span className="text-xs text-gray-400 px-1">{placeholder}</span>
                )}

                {/* Input for filter inside the box? Or distinct dropdown? */}
                {/* Simplified: The box opens dropdown which has filter input */}
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full bg-white border border-gray-200 mt-1 shadow-lg rounded p-2">
                    <input
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs mb-2 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="搜索..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        autoFocus
                    />

                    {loading ? (
                        <div className="flex justify-center py-2"><Loader2 size={16} className="animate-spin text-gray-400" /></div>
                    ) : (
                        <ul className="max-h-40 overflow-y-auto text-xs">
                            {options.map((opt, i) => (
                                <li
                                    key={i}
                                    className={`flex items-center justify-between px-2 py-1.5 hover:bg-gray-100 cursor-pointer rounded ${value.includes(opt) ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                                    onClick={() => toggleOption(opt)}
                                >
                                    <span>{opt}</span>
                                    {value.includes(opt) && <Check size={12} />}
                                </li>
                            ))}
                            {options.length === 0 && <li className="text-gray-400 text-center py-2">无结果</li>}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};
