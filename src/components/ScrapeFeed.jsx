import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';

function relativeTime(iso) {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function isChip(value) {
  return (
    (typeof value === 'string' || typeof value === 'number') &&
    String(value).length <= 32 &&
    !/^https?:\/\//.test(String(value))
  );
}

// The prompt is the schema, so the shape of `data` is whatever the model
// returned. Render generically rather than assuming fields.
function Value({ value }) {
  if (value === null || value === undefined) return <span className="scrape-null">—</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="scrape-null">empty</span>;

    // A flat array of short strings (tags, categories, names) reads as chips.
    // Numbering them like a list of records is noise.
    if (value.every(v => isChip(v))) {
      return (
        <ul className="scrape-chips">
          {value.map((item, i) => <li key={i}>{String(item)}</li>)}
        </ul>
      );
    }

    return (
      <ol className="scrape-list">
        {value.map((item, i) => (
          <li key={i}><Value value={item} /></li>
        ))}
      </ol>
    );
  }

  if (typeof value === 'object') {
    return (
      <dl className="scrape-fields">
        {Object.entries(value).map(([key, v]) => (
          <div className="scrape-field" key={key}>
            <dt>{key}</dt>
            <dd><Value value={v} /></dd>
          </div>
        ))}
      </dl>
    );
  }

  const text = String(value);
  if (/^https?:\/\//.test(text)) {
    return (
      <a className="scrape-link" href={text} target="_blank" rel="noreferrer noopener">
        {text} <ExternalLink size={11} />
      </a>
    );
  }
  return <span>{text}</span>;
}

function SourceCard({ source }) {
  return (
    <article
      className={`scrape-card${source.status === 'error' ? ' is-error' : ''}`}
      style={{ '--accent': source.color || '#6366f1' }}
    >
      <header className="scrape-card-header">
        <span className="scrape-emoji">{source.emoji || '🌐'}</span>
        <div className="scrape-title">
          <span className="scrape-label">{source.label}</span>
          <a
            className="scrape-source-url"
            href={source.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            {source.url}
          </a>
        </div>
        {typeof source.durationMs === 'number' && source.status === 'ok' && (
          <span className="scrape-duration">{(source.durationMs / 1000).toFixed(1)}s</span>
        )}
      </header>

      {source.status === 'error' ? (
        <p className="scrape-error">
          <AlertTriangle size={13} /> {source.error || 'Scrape failed.'}
        </p>
      ) : (
        <div className="scrape-body"><Value value={source.data} /></div>
      )}

      {source.note && <footer className="scrape-note">{source.note}</footer>}
    </article>
  );
}

export default function ScrapeFeed({ status, feed, error, onReload }) {
  if (status === 'loading') {
    return <div className="empty-state"><span>Loading feed…</span></div>;
  }

  if (status === 'error') {
    return (
      <div className="empty-state">
        <span>Could not read the scrape feed: {error}</span>
        <button className="primary-btn" onClick={onReload}>Retry</button>
      </div>
    );
  }

  const sources = feed?.sources ?? [];
  const failed = sources.filter(s => s.status === 'error').length;

  if (sources.length === 0) {
    return (
      <div className="empty-state">
        <span>No scrapes yet.</span>
        <code className="empty-hint">python -m scraper.main</code>
      </div>
    );
  }

  return (
    <div className="scrape-feed">
      <div className="scrape-meta">
        <span>
          {sources.length - failed}/{sources.length} sources
          {failed > 0 && <span className="scrape-failed-count"> · {failed} failed</span>}
        </span>
        <span className="scrape-generated">
          {relativeTime(feed.generatedAt) ?? 'never run'}
          {feed.model && ` · ${feed.model}`}
          <button className="icon-btn scrape-reload" onClick={onReload} title="Reload feed">
            <RefreshCw size={13} />
          </button>
        </span>
      </div>
      {sources.map(s => <SourceCard key={s.id} source={s} />)}
    </div>
  );
}
