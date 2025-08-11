export function Interval<T extends any[]>(
    fn: (...args: T) => void, 
    ms: number, 
    ...args: T
): () => void {
    let start: number = Date.now();
    let count: number = 0;
    let timeoutId: NodeJS.Timeout | null = null;
    
    function run(): void {
        fn(...args);
        count++;
        const drift: number = Date.now() - (start + count * ms);
        timeoutId = setTimeout(run, Math.max(0, ms - drift));
    }
    
    timeoutId = setTimeout(run, ms);
    
    return (): void => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };
}