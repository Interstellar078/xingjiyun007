import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface AsyncAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    fetchSuggestions: (query: string) => Promise<string[]>;
    placeholder?: string;
    className?: string;
    dependencies?: any[]; // Re-fetch or clear cache if these change
}

export const AsyncAutocomplete: React.FC<AsyncAutocompleteProps> = ({
    value, onChange, fetchSuggestions, placeholder, className, dependencies = []
}) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (showSuggestions && !value) {
                // Fetch defaults/popular? Or nothing?
                // Let's fetch whatever empty query returns
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [value, showSuggestions]);

    const handleFocus = async () => {
        setShowSuggestions(true);
        if (suggestions.length === 0) {
            setLoading(true);
            try {
                const res = await fetchSuggestions(''); // Load default/recent
                setSuggestions(res);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        onChange(val);
        setShowSuggestions(true);

        // Debounced content fetching usually better, but for simplicity we assume fetchSuggestions is fast or caller debounces
        // Actually we should debounce inside here.
    };

    // Effect to handle searching
    useEffect(() => {
        if (!showSuggestions) return;
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetchSuggestions(value);
                setSuggestions(res);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [value, showSuggestions, ...dependencies]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={wrapperRef} className="relative w-full">
            <input
                type="text"
                className={`w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
                value={value}
                onChange={handleInput}
                onFocus={handleFocus}
                placeholder={placeholder}
            />
            {loading && <div className="absolute right-2 top-2"><Loader2 size={12} className="animate-spin text-gray-400" /></div>}

            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white border border-gray-200 mt-1 max-h-48 overflow-y-auto shadow-lg rounded text-xs">
                    {suggestions.map((option, idx) => (
                        <li
                            key={idx}
                            className="px-2 py-1.5 hover:bg-blue-50 cursor-pointer text-gray-700"
                            onClick={() => {
                                onChange(option);
                                setShowSuggestions(false);
                            }}
                        >
                            {option}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
