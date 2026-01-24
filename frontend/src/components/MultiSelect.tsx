
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
  className?: string;
  displaySeparator?: string;
  variant?: 'ghost' | 'bordered';
  isError?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '选择...',
  className,
  displaySeparator = '、',
  variant = 'ghost',
  isError = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search and focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ghostClasses = "border-transparent bg-transparent hover:bg-gray-100 px-2 py-1";
  const borderedClasses = `bg-white shadow-sm px-3 py-1.5 focus-within:ring-1 ${isError ? 'border-red-500 ring-red-200 focus-within:ring-red-500' : 'border-gray-300 hover:border-blue-400 focus-within:ring-blue-500 focus-within:border-blue-500'}`;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        className={`w-full border rounded cursor-pointer flex items-center justify-between group transition-all text-sm ${variant === 'bordered' ? borderedClasses : ghostClasses} ${isError && variant !== 'bordered' ? 'border-red-500' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={value.join(displaySeparator)}
      >
        <span className={`truncate block ${variant === 'bordered' ? 'max-w-full' : 'max-w-[150px]'}`}>
          {value.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {variant === 'bordered' ? (
                value.map(v => (
                  <span key={v} className="bg-blue-100 text-blue-700 px-1.5 rounded text-xs font-medium">{v}</span>
                ))
              ) : (
                value.join(displaySeparator)
              )}
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown size={14} className={`text-gray-400 group-hover:opacity-100 transition-opacity ${variant === 'bordered' ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 w-full min-w-[200px] bg-white border border-gray-200 shadow-xl rounded-md mt-1 max-h-80 flex flex-col animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2 border-b border-gray-100 bg-white rounded-t-md sticky top-0 z-10">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-2.5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                className="w-full pl-8 py-1.5 text-sm border border-gray-200 rounded bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-400 transition-colors"
                placeholder="搜索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option);
                // Find index to show order if needed? No, just checkbox.
                return (
                  <div
                    key={option}
                    className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 ${isSelected ? 'bg-blue-50/50' : ''}`}
                    onClick={() => toggleOption(option)}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                      {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className={`text-sm break-words leading-tight ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>{option}</span>
                    {isSelected && <span className="ml-auto text-xs text-blue-400 font-mono">{value.indexOf(option) + 1}</span>}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-gray-400">
                未找到 "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
