import { useCallback, useEffect, useRef, useState } from 'react';
export function useResource(key, loader) {
  const loaderRef = useRef(loader); loaderRef.current = loader;
  const generation = useRef(0);
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setState(previous => ({ ...previous, loading: true, error: null }));
    try { const data = await loaderRef.current(); if (current === generation.current) setState({ data, loading: false, error: null }); }
    catch (error) { if (current === generation.current) setState({ data: null, loading: false, error }); }
  }, [key]);
  useEffect(() => { setState({ data: null, loading: true, error: null }); reload(); return () => { generation.current += 1; }; }, [reload]);
  return { ...state, reload };
}
export function useSessionState(key, initial) {
  const [value, setValue] = useState(() => { try { return JSON.parse(sessionStorage.getItem(key)) ?? initial; } catch { return initial; } });
  useEffect(() => { sessionStorage.setItem(key, JSON.stringify(value)); }, [key, value]);
  return [value, setValue];
}
