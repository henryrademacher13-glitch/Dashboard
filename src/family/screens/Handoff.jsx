import { X, Check } from 'lucide-react';
import { buildChecklist, fmtDate, locationLabel } from '../model.js';

// Full-screen, large-type, one item per row. Designed to be used one-handed in
// a hallway while a child is putting shoes on. (§6.6)
export default function Handoff({ store, handoff, onClose }) {
  const { state } = store;
  const list = buildChecklist(state, handoff);
  const checked = handoff.checked || {};
  const packed = list.filter((c) => checked[c.itemId]).length;

  return (
    <div className="handoff">
      <div className="handoff-head">
        <button className="sheet-close" onClick={onClose} aria-label="Close"><X size={22} /></button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 600 }}>Packing for {locationLabel(state, handoff.toHouseholdId)}</div>
          <div className="handoff-count">{packed} of {list.length} packed</div>
        </div>
      </div>

      <div className="handoff-body">
        {list.length === 0 && (
          <div className="empty" style={{ paddingTop: 80 }}>
            Nothing needs packing for this handoff.
          </div>
        )}
        {list.map((c) => {
          const isChecked = !!checked[c.itemId];
          return (
            <button
              className="handoff-row"
              key={c.itemId}
              data-checked={isChecked}
              onClick={() => store.toggleChecklistItem(handoff.id, c.itemId, handoff.toHouseholdId)}
            >
              <span className="check" data-done={isChecked} style={{ width: 26, height: 26 }}>
                {isChecked && <Check size={15} strokeWidth={3} />}
              </span>
              <span className="row-emoji" style={{ fontSize: 24 }}>{c.emoji}</span>
              <span className="stack" style={{ flex: 1 }}>
                <span className="h-title">{c.label}</span>
                {/* Every row carries its reason. "Why is this listed" never needs a tap. */}
                <span className="h-reason">{c.reason}</span>
              </span>
            </button>
          );
        })}

        {list.length > 0 && (
          <p className="sm faint" style={{ marginTop: 24, textAlign: 'center' }}>
            Checking an item off moves it to {locationLabel(state, handoff.toHouseholdId)} in Gear.
          </p>
        )}
      </div>

      <div className="handoff-foot">
        <div className="handoff-foot-inner">
          <button className="btn btn-primary btn-full" onClick={onClose}>
            {packed === list.length && list.length > 0 ? 'All packed — done' : 'Done'}
          </button>
          <p className="sm faint" style={{ textAlign: 'center', marginBottom: 0, marginTop: 8 }}>
            Handoff {fmtDate(handoff.scheduledAt, { weekday: 'long' })}{' '}
            {new Date(handoff.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
}
