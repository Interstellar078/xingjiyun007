import React, { useState, useEffect, useRef } from 'react';
import { Search, History, X } from 'lucide-react';

interface AutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onConfirm?: (val: string) => void; // Triggered on Enter or Selection
  onBlur?: () => void;
  placeholder?: string;
  suggestions: string[]; // Combined history + static
  fetchSuggestions?: (query: string) => Promise<string[]>; // Optional async
  className?: string;
  separator?: string; // New: Support for multi-value inputs (e.g. "-")
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onChange,
  onConfirm,
  onBlur,
  placeholder,
  suggestions: staticSuggestions,
  fetchSuggestions,
  className,
  separator
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSuggestions, setActiveSuggestions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (onBlur) onBlur();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    // Logic for separator (Multi-value)
    let query = val;
    if (separator && val.lastIndexOf(separator) > -1) {
        query = val.substring(val.lastIndexOf(separator) + 1);
    }
    query = query.trim();

    let matches: string[] = [];

    // Filter static suggestions
    if (query.length > 0) {
        matches = staticSuggestions.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
    } else {
        // If empty query (or empty after separator), show top suggestions
        matches = staticSuggestions.slice(0, 10); 
    }

    // Async fetcher support
    if (fetchSuggestions && query.length > 1) {
       try {
           const remoteMatches = await fetchSuggestions(query);
           matches = Array.from(new Set([...matches, ...remoteMatches]));
       } catch (err) {
           // ignore
       }
    }

    setActiveSuggestions(matches);
    setIsOpen(matches.length > 0);
  };

  const handleSelect = (suggestion: string) => {
    let finalValue = suggestion;
    
    // If using separator, append to the existing prefix
    if (separator) {
        if (value.lastIndexOf(separator) > -1) {
            const prefix = value.substring(0, value.lastIndexOf(separator) + 1);
            finalValue = prefix + suggestion;
        }
        // Auto-add separator to allow immediate next input
        finalValue += separator;
    }

    onChange(finalValue);
    setIsOpen(false);
    if (onConfirm) onConfirm(finalValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          setIsOpen(false);
          if (onConfirm) onConfirm(value);
      }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        type="text"
        className="w-full border-none bg-transparent focus:ring-0 p-1 text-inherit font-inherit"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
             // Show default suggestions on focus
             // If separator, check last segment
             let query = value;
             if (separator && value.lastIndexOf(separator) > -1) {
                 query = value.substring(value.lastIndexOf(separator) + 1);
             }
             
             let matches = [];
             if (query.trim().length > 0) {
                 matches = staticSuggestions.filter(s => s.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
             } else {
                 matches = staticSuggestions.slice(0, 10);
             }
             
             if(matches.length > 0) {
                 setActiveSuggestions(matches);
                 setIsOpen(true);
             }
        }}
        placeholder={placeholder}
      />
      {isOpen && activeSuggestions.length > 0 && (
        <ul className="absolute z-50 left-0 w-full bg-white border border-gray-200 shadow-lg max-h-60 overflow-auto rounded-md mt-1 text-left">
          {activeSuggestions.map((suggestion, index) => (
            <li
              key={index}
              onMouseDown={(e) => e.preventDefault()} // Prevent input blur on selection
              onClick={() => handleSelect(suggestion)}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm flex items-center gap-2 text-gray-700"
            >
               <History size={14} className="text-gray-400"/> 
               {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};