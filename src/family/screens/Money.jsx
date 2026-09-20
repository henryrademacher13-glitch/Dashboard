import { useState } from 'react';
import { AlertTriangle, ChevronRight, Plus } from 'lucide-react';
import { balance, money, fmtShort } from '../model.js';
import { householdName } from '../store.js';
import Sheet from '../components/Sheet.jsx';

const CATEGORIES = ['Activities', 'School', 'Medical', 'Clothing', 'Other'];

export default function Money({ store }) {
  const { state, myHousehold } = store;
  const [adding, setAdding] = useState(false);
  const [settling, setSettling] = useState(false);
  const [open, setOpen] = useState(null);

  const bal = balance(state);
  const iOwe = bal.fromId === myHousehold;
  const pending = state.expenses.filter(
    (e) => e.state === 'pending_approval' && e.paidByHouseholdId !== myHousehold,
  );
  const lastSettled = state.settlements[0];

  return (
    <>
      <div className="card balance">
        <div className="label">
          {bal.amountCents === 0
            ? 'You are settled up'
            : iOwe
              ? `You owe ${householdName(state, bal.toId)}`
              : `${householdName(state, bal.fromId)} owes you`}
        </div>
        <div className="amount">{money(bal.amountCents)}</div>
        <div className="since">
          {lastSettled ? `since last settled ${fmtShort(lastSettled.settledOn)}` : 'no settlements yet'}
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => setSettling(true)} disabled={bal.amountCents === 0}>
            Settle up
          </button>
          <button className="btn" onClick={() => setAdding(true)}>
            <Plus size={16} /> Add expense
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <button className="banner" onClick={() => setOpen(pending[0])} style={{ width: '100%', textAlign: 'left' }}>
          <AlertTriangle size={18} style={{ color: 'var(--warn)', flexShrink: 0 }} />
          <div className="banner-text">
            <div className="banner-title">
              {pending.length} expense{pending.length === 1 ? '' : 's'} need{pending.length === 1 ? 's' : ''} your approval
            </div>
            <div className="banner-sub">Over the {money(state.family.approvalThresholdCents)} threshold</div>
          </div>
          <ChevronRight size={18} className="faint" />
        </button>
      )}

      <div className="section-label">Recent</div>
      <div className="card">
        {state.expenses.length === 0 && <div className="empty">No expenses yet.</div>}
        {state.expenses.map((e) => {
          const excluded = e.state !== 'posted';
          return (
            <button className={`row ${excluded ? 'expense-muted' : ''}`} key={e.id} onClick={() => setOpen(e)}>
              <div className="row-body">
                <div className="row-title">{e.description}</div>
                <div className="row-sub">
                  {fmtShort(e.incurredOn)} &middot; {householdName(state, e.paidByHouseholdId)} paid &middot;{' '}
                  {e.splitRule === 'even' ? 'split evenly' : e.splitRule.replace('_', ' ')}
                </div>
                {e.state === 'disputed' && <span className="pill" data-tone="warn" style={{ marginTop: 6 }}>Disputed</span>}
                {e.state === 'pending_approval' && <span className="pill" style={{ marginTop: 6 }}>Awaiting approval</span>}
              </div>
              <div className="row-meta" style={{ color: 'var(--text)', fontSize: 'var(--fs-md)' }}>
                {money(e.amountCents)}
              </div>
            </button>
          );
        })}
      </div>

      <p className="privacy-note">
        Settlements are recorded, not processed.<br />
        No bank details are stored anywhere in this app.
      </p>

      {adding && <AddExpense store={store} onClose={() => setAdding(false)} />}
      {settling && <SettleUp store={store} bal={bal} onClose={() => setSettling(false)} />}
      {open && <ExpenseDetail expense={open} store={store} onClose={() => setOpen(null)} />}
    </>
  );
}

function AddExpense({ store, onClose }) {
  const { state, myHousehold } = store;
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Activities');
  const [childIds, setChildIds] = useState([]);
  const [splitRule, setSplitRule] = useState(state.family.defaultSplitRule);
  const kids = state.people.filter((p) => p.role === 'child');

  const cents = Math.round(parseFloat(amount || '0') * 100);
  const overThreshold = cents > state.family.approvalThresholdCents;

  const submit = () => {
    if (!cents || !description.trim()) return;
    store.addExpense({
      amountCents: cents,
      description: description.trim(),
      category,
      childIds: childIds.length ? childIds : kids.map((k) => k.id),
      splitRule,
      paidByHouseholdId: myHousehold,
    });
    onClose();
  };

  return (
    <Sheet title="Add expense" onClose={onClose}>
      <div className="field">
        <label htmlFor="amt">Amount</label>
        <input
          id="amt" className="amount-input" type="number" inputMode="decimal" step="0.01"
          placeholder="0.00" value={amount} autoFocus
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="desc">What was it for?</label>
        <input id="desc" value={description} placeholder="Soccer registration"
          onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="field">
        <label>Category</label>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button key={c} className="chip" data-active={category === c} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Which child?</label>
        <div className="chips">
          <button className="chip" data-active={childIds.length === 0} onClick={() => setChildIds([])}>All</button>
          {kids.map((k) => (
            <button key={k.id} className="chip" data-active={childIds.includes(k.id)}
              onClick={() => setChildIds(childIds.includes(k.id) ? childIds.filter((x) => x !== k.id) : [...childIds, k.id])}>
              {k.displayName}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="split">Split</label>
        <select id="split" value={splitRule} onChange={(e) => setSplitRule(e.target.value)}>
          <option value="even">Split evenly</option>
          <option value="custody_proportional">By custody time</option>
          <option value="percentage">70 / 30</option>
        </select>
      </div>
      {overThreshold && (
        <p className="sm muted" style={{ marginTop: -4, marginBottom: 16 }}>
          Over {money(state.family.approvalThresholdCents)} &mdash; this will wait for approval before it affects the balance.
        </p>
      )}
      <button className="btn btn-primary btn-full" onClick={submit} disabled={!cents || !description.trim()}>
        Save expense
      </button>
    </Sheet>
  );
}

function SettleUp({ store, bal, onClose }) {
  const [amount, setAmount] = useState((bal.amountCents / 100).toFixed(2));
  const [method, setMethod] = useState('');

  return (
    <Sheet title="Record a settlement" onClose={onClose}>
      <p className="sm muted" style={{ marginTop: -8 }}>
        This records that money changed hands. The app does not move it.
      </p>
      <div className="field">
        <label htmlFor="samt">Amount</label>
        <input id="samt" className="amount-input" type="number" step="0.01" value={amount}
          onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="meth">How was it paid?</label>
        <input id="meth" value={method} placeholder="Venmo, cash, bank transfer&hellip;"
          onChange={(e) => setMethod(e.target.value)} />
      </div>
      <button
        className="btn btn-primary btn-full"
        onClick={() => {
          store.settleUp(Math.round(parseFloat(amount || '0') * 100), method || 'Not specified', bal.fromId, bal.toId);
          onClose();
        }}
      >
        Record settlement
      </button>
    </Sheet>
  );
}

function ExpenseDetail({ expense, store, onClose }) {
  const { state, myHousehold } = store;
  const [note, setNote] = useState('');
  const [disputing, setDisputing] = useState(false);

  return (
    <Sheet title={expense.description} onClose={onClose}>
      <div className="balance" style={{ padding: '0 0 16px' }}>
        <div className="amount" style={{ fontSize: 'var(--fs-xl)' }}>{money(expense.amountCents)}</div>
        <div className="since">
          {fmtShort(expense.incurredOn)} &middot; {expense.category} &middot; paid by {householdName(state, expense.paidByHouseholdId)}
        </div>
      </div>

      <div className="section-label" style={{ marginTop: 0 }}>Split</div>
      <div className="card">
        {expense.shares.map((s) => (
          <div className="row" key={s.householdId}>
            <div className="row-body"><div className="row-title">{householdName(state, s.householdId)}</div></div>
            <div className="row-meta" style={{ color: 'var(--text)' }}>{money(s.owedCents)}</div>
          </div>
        ))}
      </div>
      <p className="sm faint" style={{ marginTop: 8 }}>
        Shares were calculated when this posted and stay fixed, so later schedule
        changes cannot rewrite it.
      </p>

      {expense.state === 'disputed' && (
        <>
          <div className="section-label">Dispute</div>
          <div className="card">
            <p className="sm" style={{ margin: 0 }}>{expense.disputeNote}</p>
          </div>
          <button className="btn btn-full" style={{ marginTop: 12 }} onClick={() => { store.resolveDispute(expense.id); onClose(); }}>
            Resolve &mdash; put back in the balance
          </button>
        </>
      )}

      {expense.state === 'pending_approval' && expense.paidByHouseholdId !== myHousehold && (
        <div className="btn-row" style={{ marginTop: 20 }}>
          <button className="btn btn-primary" onClick={() => { store.approveExpense(expense.id); onClose(); }}>Approve</button>
          <button className="btn" onClick={() => setDisputing(true)}>Dispute</button>
        </div>
      )}

      {disputing && (
        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="dn">Your position</label>
          <textarea id="dn" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Why you disagree with this expense" />
          <button className="btn btn-full" style={{ marginTop: 8 }}
            onClick={() => { store.disputeExpense(expense.id, note); onClose(); }}>
            Flag as disputed
          </button>
        </div>
      )}
    </Sheet>
  );
}
