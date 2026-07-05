import { useReducer, useEffect } from 'react';
import { StoreContext, reducer, loadState, STORAGE_KEY } from './store';

export default function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* storage full or unavailable — app still works in memory */ }
  }, [state]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}
