import { useCallback, useEffect, useState } from "react";

import { ApiError } from "./api";

export interface LoadState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

interface InternalState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Carica dati asincroni gestendo stato di caricamento ed errore.
 * Passare un `loader` memoizzato con `useCallback` per controllarne le dipendenze.
 * `reload()` forza un nuovo caricamento.
 */
export function useLoad<T>(loader: () => Promise<T>): LoadState<T> {
  const [state, setState] = useState<InternalState<T>>({
    data: null,
    error: null,
    loading: true,
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    loader()
      .then((data) => {
        if (active) setState({ data, error: null, loading: false });
      })
      .catch((e: unknown) => {
        if (active) {
          setState({
            data: null,
            error: e instanceof ApiError ? e.message : "Errore imprevisto",
            loading: false,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [loader, reloadKey]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    setReloadKey((k) => k + 1);
  }, []);

  return { ...state, reload };
}
