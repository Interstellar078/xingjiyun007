import React, { useState, useEffect } from 'react';

interface TableInputProps {
    value: string | number;
    onChange: (val: string | number) => void;
    type?: "text" | "number";
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    min?: string;
    autoWidth?: boolean;
}

// Optimized Input Component to prevent global re-renders on every keystroke
// Updates parent state only onBlur or Enter
export const TableInput: React.FC<TableInputProps> = ({
    value,
    onChange,
    type = "text",
    className = "",
    placeholder = "",
    disabled = false,
    min,
    autoWidth = false
}) => {
    const [localValue, setLocalValue] = useState(value);
    const [isEditing, setIsEditing] = useState(false);

    // Sync local value if prop changes externally
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleBlur = () => {
        setIsEditing(false);
        if (localValue != value) {
            onChange(type === 'number' ? (parseFloat(localValue.toString()) || 0) : localValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    const commonProps = {
        type,
        className: `${className} ${!isEditing ? 'cursor-pointer' : ''}`,
        disabled,
        readOnly: !isEditing,
        placeholder,
        min,
        value: localValue,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setLocalValue(e.target.value),
        onBlur: handleBlur,
        onKeyDown: handleKeyDown,
        onDoubleClick: () => !disabled && setIsEditing(true)
    };

    if (autoWidth) {
        return (
            <div className="inline-grid [grid-template-areas:'stack'] items-center min-w-[40px] max-w-full">
                <span className={`[grid-area:stack] invisible whitespace-pre overflow-hidden ${className.replace(/border|bg-|rounded/g, '')} border-transparent`} aria-hidden="true">
                    {localValue || placeholder || 'Placeholder'}
                </span>
                <input {...commonProps} className={`${commonProps.className} [grid-area:stack] w-full`} />
            </div>
        );
    }

    return <input {...commonProps} />;

    return (
        <input
            type={type}
            className={className}
            disabled={disabled}
            placeholder={placeholder}
            min={min}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
        />
    );
};
