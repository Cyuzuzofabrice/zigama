
import { useEffect, useState } from 'react'
import { loadAll, insert, setVoid, deleteGroup } from './lib/data'
import {
  cycleOf,
  dueOf,
  cashHeld,
  normPhone,
  checkAmount,
  checkLoan,
  rwf,
} from './lib/money'
import type { G, M, L, Data } from './lib/types'

type Tab = 'members' | 'loans' | 'report' | 'history'

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

export default function Dashboard({
  g,
  onSignOut,
  onDeleted,
}: {
  g: G
  onSignOut: () => void
  onDeleted: () => void
}) {
  const [d, setD] = useState<Data>({
    members: [],
    pays: [],
    loans: [],
    reps: [],
  })
  const [tab, setTab] = useState<Tab>('members')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const [nm, setNm] = useState('')
  const [ph, setPh] = useState('')
  const [sel, setSel] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [amt, setAmt] = useState('')
  const [meth, setMeth] = useState('MoMo')

  const [lm, setLm] = useState('')
  const [lp, setLp] = useState('')
  const [lr, setLr] = useState('5')
  const [lmo, setLmo] = useState('3')
  const [rp, setRp] = useState<Record<string, string>>({})

  const load = async () => setD(await loadAll(g.id))

  useEffect(() => {
    load().catch((e) => setErr((e as Error).message))
  }, [g.id])

  const run = async (f: () => Promise<void>) => {
    setBusy(true)
    setErr('')
    try {
      await f()
      await load()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const cy = cycleOf(g.freq, g.start_date)
  const pays = d.pays.filter((p) => !p.voided_at)
  const reps = d.reps.filter((r) => !r.voided_at)

  const paid = (m: M) =>
    sum(
      pays
        .filter((p) => p.member_id === m.id && p.cycle === cy)
        .map((p) => p.amount),
    )

  const totalPaid = (m: M) =>
    sum(pays.filter((p) => p.member_id === m.id).map((p) => p.amount))

  const target = g.amount * d.members.length
  const got = sum(d.members.map((m) => Math.min(paid(m), g.amount)))
  const pct = target ? Math.round((got / target) * 100) : 0

  const saved = sum(pays.map((p) => p.amount))
  const lent = sum(d.loans.map((l) => l.principal))
  const back = sum(reps.map((r) => r.amount))
  const cash = cashHeld(saved, lent, back)

  const repaidOf = (l: L) =>
    sum(reps.filter((r) => r.loan_id === l.id).map((r) => r.amount))

  const left = (l: L) =>
    dueOf(l.principal, l.rate, l.months) - repaidOf(l)

  const name = (id: string) =>
    d.members.find((m) => m.id === id)?.name ?? 'Removed member'

  const late = d.members.filter((m) => paid(m) < g.amount)

  const wa = (m: M) =>
    `https://wa.me/${m.phone}?text=${encodeURIComponent(
      `Hello ${m.name}, your ${g.name} contribution for round ${cy + 1} is still ${g.amount - paid(m)} RWF. Thank you.`,
    )}`

  const link = `${location.origin}${location.pathname}#/share/${g.share_token}`

  const addMember = (e: React.FormEvent) => {
    e.preventDefault()

    const p = normPhone(ph)

    if (p === null) {
      setErr('Phone number looks wrong. Use 07XXXXXXXX or 2507XXXXXXXX.')
      return
    }

    if (
      d.members.some(
        (m) => m.name.toLowerCase() === nm.trim().toLowerCase(),
      )
    ) {
      setErr('A member with this name already exists.')
      return
    }

    run(async () => {
      await insert('members', {
        group_id: g.id,
        name: nm.trim(),
        phone: p || null,
      })
      setNm('')
      setPh('')
    })
  }

  const pay = (e: React.FormEvent) => {
    e.preventDefault()

    const n = Number(amt)
    const bad = checkAmount(n)

    if (bad) {
      setErr(bad)
      return
    }

    if (!sel) return

    run(async () => {
      await insert('payments', {
        group_id: g.id,
        member_id: sel,
        cycle: cy,
        amount: n,
        method: meth,
      })
      setSel(null)
      setAmt('')
    })
  }

  const giveLoan = (e: React.FormEvent) => {
    e.preventDefault()

    const bad = checkLoan(Number(lp), Number(lr), Number(lmo), cash)

    if (bad) {
      setErr(bad)
      return
    }

    if (!lm) {
      setErr('Choose a member first.')
      return
    }

    run(async () => {
      await insert('loans', {
        group_id: g.id,
        member_id: lm,
        principal: Number(lp),
        rate: Number(lr),
        months: Number(lmo),
      })
      setLp('')
    })
  }

  const repay = (l: L) => {
    const n = Number(rp[l.id] || 0)
    const bad = checkAmount(n)

    if (bad) {
      setErr(bad)
      return
    }

    if (n > left(l)) {
      setErr(`This loan only has ${rwf(left(l))} left to repay.`)
      return
    }

    run(async () => {
      await insert('repayments', {
        group_id: g.id,
        loan_id: l.id,
        amount: n,
      })
      setRp({ ...rp, [l.id]: '' })
    })
  }

  const profile = d.members.find((m) => m.id === profileId)

  const memberPayments = profile
    ? pays
        .filter((p) => p.member_id === profile.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    : []

  const memberLoans = profile
    ? d.loans.filter((l) => l.member_id === profile.id)
    : []

  const memberRepaid = memberLoans.reduce(
    (total, loan) => total + repaidOf(loan),
    0,
  )

  const memberBorrowed = memberLoans.reduce(
    (total, loan) => total + loan.principal,
    0,
  )

  const memberOutstanding = memberLoans.reduce(
    (total, loan) => total + Math.max(0, left(loan)),
    0,
  )

  return (
    <div className="app">
      <header>
        <b className="logo">Zigama</b>
        <span>{g.name}</span>
      </header>

      <section className="hero">
        <div className="ring big" style={{ ['--p' as string]: pct }}>
          <div>
            <strong>{pct}%</strong>
            <small>collected</small>
          </div>
        </div>

        <div>
          <h1>Round {cy + 1}</h1>
          <p>
            {rwf(got)} of {rwf(target)}
          </p>
          <p className="soft">
            {g.freq === 'weekly' ? 'Weekly' : 'Monthly'}: {rwf(g.amount)} each
          </p>
        </div>
      </section>

      <nav>
        {(['members', 'loans', 'report', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            className={tab === t ? 'on' : ''}
            onClick={() => setTab(t)}
          >
            {{ members: 'Members', loans: 'Loans', report: 'Report', history: 'History' }[t]}
          </button>
        ))}
      </nav>

      {err && (
        <div className="err" role="alert">
          {err}
        </div>
      )}

      {tab === 'members' && (
        <>
          <form className="row add" onSubmit={addMember}>
            <input
              value={nm}
              onChange={(e) => setNm(e.target.value)}
              placeholder="Member name"
              maxLength={80}
              required
            />
            <input
              value={ph}
              onChange={(e) => setPh(e.target.value)}
              placeholder="Phone (07…)"
              inputMode="tel"
            />
            <button className="btn" disabled={busy}>
              Add
            </button>
          </form>

          {!d.members.length && (
            <p className="empty">No members yet. Add the first member above.</p>
          )}

          <div className="tiles">
            {d.members.map((m) => {
              const p = paid(m)
              const full = p >= g.amount

              return (
                <button
                  key={m.id}
                  type="button"
                  className={'tile' + (sel === m.id ? ' sel' : '')}
                  onClick={() => {
                    setSel(m.id)
                    setAmt(String(Math.max(0, g.amount - p) || g.amount))
                  }}
                >
                  <div
                    className="ring"
                    style={{
                      ['--p' as string]: Math.min(
                        100,
                        g.amount > 0 ? (p / g.amount) * 100 : 0,
                      ),
                    }}
                  >
                    <div>{m.name.slice(0, 1).toUpperCase()}</div>
                  </div>

                  <b
                    className="member-name"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      setProfileId(m.id)
                      setSel(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        setProfileId(m.id)
                        setSel(null)
                      }
                    }}
                  >
                    {m.name}
                  </b>

                  <small className={full ? 'ok' : 'warn'}>
                    {full ? 'Paid' : `${rwf(g.amount - p)} left`}
                  </small>
                </button>
              )
            })}
          </div>

          {profile && (
            <section className="card member-profile">
              <div className="line">
                <div>
                  <small className="soft">MEMBER PROFILE</small>
                  <h2>{profile.name}</h2>
                </div>

                <button
                  type="button"
                  className="btn small ghost"
                  onClick={() => setProfileId(null)}
                >
                  Close
                </button>
              </div>

              <div className="profile-avatar">
                {profile.name.slice(0, 1).toUpperCase()}
              </div>

              <div className="line">
                <span>Phone number</span>
                <b>{profile.phone || 'Not provided'}</b>
              </div>

              {profile.phone && (
                <div className="line">
                  <span>Contact</span>
                  <a
                    className="btn small"
                    href={`https://wa.me/${profile.phone}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </div>
              )}

              <h3>Contribution summary</h3>

              <div className="line">
                <span>Total contributions</span>
                <b>{rwf(totalPaid(profile))}</b>
              </div>

              <div className="line">
                <span>Paid this round</span>
                <b>{rwf(paid(profile))}</b>
              </div>

              <div className="line">
                <span>Remaining this round</span>
                <b className={paid(profile) >= g.amount ? 'ok' : 'warn'}>
                  {rwf(Math.max(0, g.amount - paid(profile)))}
                </b>
              </div>

              <div className="line">
                <span>Contribution frequency</span>
                <b>{g.freq === 'weekly' ? 'Weekly' : 'Monthly'}</b>
              </div>

              <h3>Contribution history</h3>

              {memberPayments.length ? (
                memberPayments.map((p) => (
                  <div className="line" key={p.id}>
                    <span>
                      Round {p.cycle + 1}
                      <small>
                        {' '}
                        · {p.method} ·{' '}
                        {new Date(p.created_at).toLocaleDateString()}
                      </small>
                    </span>
                    <b>{rwf(p.amount)}</b>
                  </div>
                ))
              ) : (
                <p className="empty">No contributions recorded yet.</p>
              )}

              <h3>Loans and repayments</h3>

              <div className="line">
                <span>Total borrowed</span>
                <b>{rwf(memberBorrowed)}</b>
              </div>

              <div className="line">
                <span>Total repaid</span>
                <b>{rwf(memberRepaid)}</b>
              </div>

              <div className="line">
                <span>Outstanding balance</span>
                <b className={memberOutstanding > 0 ? 'warn' : 'ok'}>
                  {rwf(memberOutstanding)}
                </b>
              </div>

              {memberLoans.length ? (
                memberLoans.map((loan) => (
                  <div className="profile-loan" key={loan.id}>
                    <div className="line">
                      <b>Loan details</b>
                      <b className={left(loan) > 0 ? 'warn' : 'ok'}>
                        {left(loan) > 0 ? 'Outstanding' : 'Cleared'}
                      </b>
                    </div>
                    <div className="line">
                      <span>Principal</span>
                      <span>{rwf(loan.principal)}</span>
                    </div>
                    <div className="line">
                      <span>Interest rate per month</span>
                      <span>{loan.rate}%</span>
                    </div>
                    <div className="line">
                      <span>Term</span>
                      <span>
                        {loan.months} {loan.months === 1 ? 'month' : 'months'}
                      </span>
                    </div>
                    <div className="line">
                      <span>Total due</span>
                      <b>{rwf(dueOf(loan.principal, loan.rate, loan.months))}</b>
                    </div>
                    <div className="line">
                      <span>Repaid</span>
                      <span>{rwf(repaidOf(loan))}</span>
                    </div>
                    <div className="line">
                      <span>Balance remaining</span>
                      <b>{rwf(Math.max(0, left(loan)))}</b>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty">This member has no loans.</p>
              )}
            </section>
          )}

          {sel && (
            <form className="panel" onSubmit={pay}>
              <b>Record payment: {name(sel)}</b>

              <div className="row">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amt}
                  onChange={(e) => setAmt(e.target.value)}
                  required
                />

                <select
                  value={meth}
                  onChange={(e) => setMeth(e.target.value)}
                >
                  <option>MoMo</option>
                  <option>Cash</option>
                  <option>Bank</option>
                </select>
              </div>

              <div className="row">
                <button className="btn" disabled={busy}>
                  Save payment
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setSel(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {!!late.length && (
            <div className="card">
              <h2>Still to pay this round</h2>

              {late.map((m) => (
                <div className="line" key={m.id}>
                  <span>
                    {m.name}
                    <small> {rwf(g.amount - paid(m))}</small>
                  </span>

                  {m.phone && (
                    <a
                      className="btn small"
                      href={wa(m)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Send reminder
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'loans' && (
        <>
          {d.members.length ? (
            <form className="card" onSubmit={giveLoan}>
              <h2>Give a loan</h2>
              <small className="soft">
                The group holds {rwf(cash)}.
              </small>

              <select
                value={lm}
                onChange={(e) => setLm(e.target.value)}
                required
              >
                <option value="">Choose member</option>
                {d.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                step="1"
                value={lp}
                onChange={(e) => setLp(e.target.value)}
                placeholder="Amount (RWF)"
                required
              />

              <div className="row">
                <label>
                  Interest % per month
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={lr}
                    onChange={(e) => setLr(e.target.value)}
                  />
                </label>

                <label>
                  Months
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={lmo}
                    onChange={(e) => setLmo(e.target.value)}
                  />
                </label>
              </div>

              <small className="soft">
                Flat interest: amount × rate × months, rounded to whole francs.
                Use your group's own rule.
              </small>

              <button className="btn" disabled={busy}>
                Save loan
              </button>
            </form>
          ) : (
            <p className="empty">Add members first.</p>
          )}

          {d.loans.map((l) => (
            <div className="card" key={l.id}>
              <div className="line">
                <b>{name(l.member_id)}</b>
                <b className={left(l) <= 0 ? 'ok' : 'warn'}>
                  {left(l) <= 0 ? 'Cleared' : `${rwf(left(l))} left`}
                </b>
              </div>

              <small className="soft">
                Borrowed {rwf(l.principal)} · must repay{' '}
                {rwf(dueOf(l.principal, l.rate, l.months))}
              </small>

              {left(l) > 0 && (
                <div className="row">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Repayment (RWF)"
                    value={rp[l.id] || ''}
                    onChange={(e) =>
                      setRp({ ...rp, [l.id]: e.target.value })
                    }
                  />

                  <button
                    type="button"
                    className="btn small"
                    disabled={busy}
                    onClick={() => repay(l)}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {tab === 'report' && (
        <div className="card">
          <h2>{g.name}: report</h2>

          {(
            [
              ['Total saved by members', saved],
              ['Money lent out', lent],
              ['Repaid so far', back],
              ['Cash the group should hold', cash],
            ] as [string, number][]
          ).map(([k, v]) => (
            <div className="line" key={k}>
              <span>{k}</span>
              <b>{rwf(v)}</b>
            </div>
          ))}

          <div className="line">
            <span>Still owed by borrowers</span>
            <b>{rwf(sum(d.loans.map((l) => Math.max(0, left(l)))))}</b>
          </div>

          <h2 style={{ marginTop: 16 }}>Per member</h2>

          {d.members.map((m) => (
            <div className="line" key={m.id}>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setTab('members')
                  setProfileId(m.id)
                  setSel(null)
                }}
              >
                {m.name}
              </button>
              <b>{rwf(totalPaid(m))}</b>
            </div>
          ))}

          <h2 style={{ marginTop: 16 }}>Member link</h2>

          <div className="info">
            Members open this link to see progress. It shows names and
            contributions only, never phone numbers or loans.
            <br />
            <small>{link}</small>
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => {
              navigator.clipboard
                ?.writeText(link)
                .then(() => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                })
                .catch(() => setErr('Could not copy the link. Please copy it manually.'))
            }}
          >
            {copied ? 'Copied' : 'Copy member link'}
          </button>

          <button
            type="button"
            className="btn ghost"
            onClick={() => window.print()}
          >
            Print or save as PDF
          </button>

          <button
            type="button"
            className="btn ghost"
            onClick={onSignOut}
          >
            Sign out
          </button>

          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              if (
                confirm(
                  'This permanently deletes the group, all members, payments and loans. Continue?',
                )
              ) {
                run(async () => {
                  await deleteGroup(g.id)
                  onDeleted()
                })
              }
            }}
          >
            Delete group and all data
          </button>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <h2>Payments and repayments</h2>

          <small className="soft">
            Made a mistake? Undo it here. Nothing is erased; every change is
            kept in the audit log.
          </small>

          {[
            ...d.pays.map((p) => ({
              id: p.id,
              t: 'payments' as const,
              at: p.created_at,
              v: p.voided_at,
              label: `${name(p.member_id)} paid ${rwf(p.amount)} (${p.method}, round ${p.cycle + 1})`,
            })),
            ...d.reps.map((r) => ({
              id: r.id,
              t: 'repayments' as const,
              at: r.created_at,
              v: r.voided_at,
              label: `${name(d.loans.find((l) => l.id === r.loan_id)?.member_id ?? '')} repaid ${rwf(r.amount)}`,
            })),
          ]
            .sort((a, b) => b.at.localeCompare(a.at))
            .slice(0, 60)
            .map((x) => (
              <div className="line" key={x.id}>
                <span className={x.v ? 'void' : ''}>
                  {x.label}
                  <br />
                  <small>{new Date(x.at).toLocaleDateString()}</small>
                </span>

                <button
                  type="button"
                  className="btn small ghost"
                  disabled={busy}
                  onClick={() => run(() => setVoid(x.t, x.id, !x.v))}
                >
                  {x.v ? 'Restore' : 'Undo'}
                </button>
              </div>
            ))}

          {!d.pays.length && !d.reps.length && (
            <p className="empty">Nothing recorded yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
