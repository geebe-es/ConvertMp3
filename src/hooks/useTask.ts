import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
export function useTask() { const [busy, setBusy] = useState(false); const { run } = useApp(); return { busy, execute: async <T,>(action: () => Promise<T>) => { setBusy(true); try { return await run(action); } finally { setBusy(false); } } }; }
