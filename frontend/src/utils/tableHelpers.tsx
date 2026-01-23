import React from 'react';

/**
 * Creates a resizable table header cell
 */
export function createResizableHeader(
    id: string,
    label: string | React.ReactNode,
    colWidths: Record<string, number>,
    onResize: (id: string, newWidth: number) => void,
    bgClass = '',
    textClass = 'text-gray-500',
    sticky = false
): React.ReactElement {
    const w = colWidths[id] || 100;

    const startResize = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.pageX;
        const startW = w;

        const onMove = (mv: MouseEvent) => {
            const newW = Math.max(50, startW + (mv.pageX - startX));
            onResize(id, newW);
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    return (
        <th
            key={id}
            style={{ width: w, minWidth: w }}
            className={`px-2 py-3 text-left text-xs font-bold uppercase relative group ${textClass} ${bgClass} ${sticky ? 'sticky left-0 z-10 shadow-[1px_0_2px_rgba(0,0,0,0.05)]' : ''}`}
        >
            <div className="flex items-center justify-between w-full h-full relative">
                <span className="truncate w-full block">{label}</span>
                <div
                    className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize z-20 flex justify-center hover:bg-blue-400/20 rounded"
                    onMouseDown={startResize}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="w-[1px] h-full bg-gray-200 group-hover:bg-blue-400"></div>
                </div>
            </div>
        </th>
    );
}
