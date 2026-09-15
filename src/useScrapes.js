import { useCallback, useEffect, useState } from 'react';

// Written by `python -m scraper.main`. Lives in public/, so Vite serves it at
// the site root and it is re-read on refresh without a rebuild.
const FEED_URL = `${import.meta.env.BASE_URL}data/scrapes.json`;

const LOADING = { status: 'loading', feed: null, error: null };

function isFeed(value) {
  return value && typeof value === 'object' && Array.isArray(value.sources);
}

// Returns the next hook state rather than setting it, so the effect below can
// keep its setState inside a promise callback instead of its body.
async function fetchFeed(signal) {
  try {
    // cache: 'no-store' so a fresh scrape shows up on reload rather than being
    // served from the browser's disk cache.
    const res = await fetch(FEED_URL, { signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const feed = await res.json();
    if (!isFeed(feed)) throw new Error('feed JSON has no "sources" array');
    return { status: 'ready', feed, error: null };
  } catch (err) {
    if (err.name === 'AbortError') return null; // unmounted; drop the result
    return { status: 'error', feed: null, error: err.message };
  }
}

export function useScrapes() {
  const [state, setState] = useState(LOADING);
  // Bumping this re-runs the effect, which is how a manual reload refetches.
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchFeed(controller.signal).then(next => {
      if (next) setState(next);
    });
    return () => controller.abort();
  }, [nonce]);

  // Called from a click handler. A retry after an error should visibly do
  // something; a reload of healthy cards keeps them on screen meanwhile.
  const reload = useCallback(() => {
    setState(s => (s.status === 'error' ? LOADING : s));
    setNonce(n => n + 1);
  }, []);

  return { ...state, reload };
}
