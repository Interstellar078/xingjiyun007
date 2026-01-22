
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
  className?: string;
  displaySeparator?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '选择...',
  className,
  displaySeparator = '、'
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
    // If the option is already selected, remove it
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      // If not selected, add it to the end
      onChange([...value, option]);
    }
  };

  const removeOption = (e: React.MouseEvent, option: string) => {
      e.stopPropagation(); // Prevent opening/closing dropdown
      onChange(value.filter(v => v !== option));
  };

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        className="w-full min-h-[30px] border border-transparent bg-transparent hover:bg-gray-100 rounded px-1 py-1 cursor-pointer flex items-center justify-between group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {value.length > 0 ? (
             value.map((v, idx) => (
               <span key={idx} className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 border border-blue-200">
                  {v}
                  <X size={10} className="hover:text-red-500 cursor-pointer" onClick={(e) => removeOption(e, v)} />
               </span>
             ))
          ) : (
             <span className="text-gray-300 text-xs px-1">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 shrink-0 ml-1" />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 w-64 bg-white border border-gray-200 shadow-lg rounded-md mt-1 max-h-80 flex flex-col">
          {/* Search Header */}
          <div className="p-2 border-b border-gray-100 bg-white rounded-t-md sticky top-0 z-10">
             <div className="relative">
                <Search size={14} className="absolute left-2 top-2.5 text-gray-400"/>
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
