
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
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onChange,
  onConfirm,
  onBlur,
  placeholder,
  suggestions: staticSuggestions,
  fetchSuggestions,
  className
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

    let matches: string[] = [];

    // Filter static suggestions (history + cities)
    if (val.length > 0) {
        matches = staticSuggestions.filter(s => s.toLowerCase().includes(val.toLowerCase())).slice(0, 10);
    } else {
        matches = staticSuggestions.slice(0, 10); // Show recent/top on focus empty
    }

    // If we have an async fetcher and typed something (Used for hotels if enabled)
    if (fetchSuggestions && val.length > 1) {
       try {
           const remoteMatches = await fetchSuggestions(val);
           // Merge unique
           matches = Array.from(new Set([...matches, ...remoteMatches]));
       } catch (err) {
           // ignore
       }
    }

    setActiveSuggestions(matches);
    setIsOpen(matches.length > 0);
  };

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
    if (onConfirm) onConfirm(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          setIsOpen(false);
          // Confirm with CURRENT value if no suggestion selected, or just always confirm current value
          if (onConfirm) onConfirm(value);
          // e.currentTarget.blur(); // Optional: remove focus after enter? Maybe not for rapid entry.
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
             const defaults = staticSuggestions.slice(0, 10);
             if(defaults.length > 0) {
                 setActiveSuggestions(defaults);
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
              onClick={() => handleSelect(suggestion)}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm flex items-center gap-2 text-gray-700"
            >
               {/* Simple icon logic: if likely history (in static list) use History, else Search */}
               <History size={14} className="text-gray-400"/> 
               {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
