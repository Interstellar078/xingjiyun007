import { useState, useEffect, useCallback } from 'react';

// Generic hook for paginated resources
export function usePaginatedResource<T>(
    fetcher: (params: any) => Promise<T[]>,
    baseParams: Record<string, any> = {},
    initialSize: number = 20
) {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [size] = useState(initialSize); // Fixed size for now
    const [hasMore, setHasMore] = useState(true); // Simple hasMore check (if return < size)
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (p: number) => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetcher({ ...baseParams, page: p, size });
            if (p === 1) {
                setItems(data);
            } else {
                setItems(prev => [...prev, ...data]); // Append for infinite scroll style? Or replace?
                // For table, usually replace. For infinite scroll, append.
                // Let's assume standard table pagination (replace) for now.
                // Or maybe the user wants "Show More"?
                // Let's do replace for standard table pagination.
                setItems(data);
            }
            setHasMore(data.length === size);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [fetcher, JSON.stringify(baseParams), size]);

    // Initial load & Param change
    useEffect(() => {
        setPage(1);
        load(1);
    }, [load]);

    // Page change
    const nextPage = () => {
        if (!hasMore || loading) return;
        setPage(p => {
            const np = p + 1;
            load(np);
            return np;
        });
    };

    const prevPage = () => {
        if (page <= 1 || loading) return;
        setPage(p => {
            const np = p - 1;
            load(np);
            return np;
        });
    };

    const refresh = () => load(page);

    return { items, loading, page, hasMore, error, nextPage, prevPage, refresh, setItems };
}
