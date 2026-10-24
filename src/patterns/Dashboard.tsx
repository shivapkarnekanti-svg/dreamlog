import { useMemo } from 'react'
import { computePatterns } from './compute'
import { MonthlyChart, WeekdayChart } from './charts'
import type { Count, PatternInput, Trend } from './types'
import './dashboard.css'

const MIN_DREAMS = 5

const pct = (n: number) => `${Math.round(n * 100)}%`
const fmt = (n: number | null) => (n === null ? 'no data' : n.toFixed(1))

function BarList({ title, items }: { title: string; items: Count[] }) {
  if (items.length === 0) return null
  return (
    <section className="pat__section">
      <h2>{title}</h2>
      <ul className="pat__bars">
        {items.map((c) => (
          <li key={c.value} className="pat__bar-row">
            <div className="pat__bar-label">
              <span>{c.value}</span>
              <span>
                {pct(c.share)} of dreams ({c.count})
              </span>
            </div>
            <div className="pat__bar-track" aria-hidden="true">
              <div className="pat__bar-fill" style={{ width: `${Math.round(c.share * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function TrendList({ title, items }: { title: string; items: Trend[] }) {
  if (items.length === 0) return null
  return (
    <section className="pat__section">
      <h2>{title}</h2>
      <ul className="pat__list">
        {items.map((t) => (
          <li key={t.facet + t.value}>
            {t.value} ({t.facet}): {t.before} before, {t.recent} in the last 30 days
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Dashboard(props: { dreams: PatternInput[]; onOpenDream: (id: string) => void }) {
  const { dreams, onOpenDream } = props
  const p = useMemo(() => computePatterns(dreams), [dreams])
  const dateOf = useMemo(() => new Map(dreams.map((d) => [d.id, d.date])), [dreams])

  if (p.total === 0) {
    return (
      <div className="pat">
        <p className="pat__low">Log a few more dreams to see patterns</p>
        <p className="pat__note">Worked out on this device. Nothing was sent anywhere.</p>
      </div>
    )
  }

  const low = p.total < MIN_DREAMS
  const range =
    p.firstDate && p.lastDate
      ? p.firstDate === p.lastDate
        ? p.firstDate
        : `${p.firstDate} to ${p.lastDate}`
      : ''

  return (
    <div className="pat">
      {low && <p className="pat__low">Log a few more dreams to see patterns</p>}
      <section className="pat__section">
        <h2>Summary</h2>
        <p className="pat__summary">
          {p.total} {p.total === 1 ? 'dream' : 'dreams'}
          {range && `, ${range}`}. Nightmares {pct(p.rates.nightmare)}, lucid {pct(p.rates.lucid)},
          recurring {pct(p.rates.recurring)}.
        </p>
      </section>

      <BarList title="People" items={p.top.people} />
      <BarList title="Places" items={p.top.places} />
      <BarList title="Tags" items={p.top.tags} />
      <BarList title="Emotions" items={p.top.emotions} />

      {!low && p.months.length > 0 && (
        <section className="pat__section">
          <h2>Dreams per month</h2>
          <MonthlyChart months={p.months} />
        </section>
      )}
      {!low && (
        <section className="pat__section">
          <h2>Dreams by weekday</h2>
          <WeekdayChart counts={p.weekday} />
        </section>
      )}

      {p.pairs.length > 0 && (
        <section className="pat__section">
          <h2>Together often</h2>
          <ul className="pat__list">
            {p.pairs.map((x) => (
              <li key={x.a + '\u0000' + x.b}>
                {x.a} + {x.b}: {x.lift.toFixed(1)}× more often together ({x.together} dreams)
              </li>
            ))}
          </ul>
        </section>
      )}

      <TrendList title="Rising" items={p.rising} />
      <TrendList title="Fading" items={p.fading} />

      {(p.sleep.nightmare !== null || p.mood.nightmare !== null) && (
        <section className="pat__section">
          <h2>Sleep and mood</h2>
          <dl className="pat__compare">
            <dt>Average</dt>
            <dd>Nightmare nights</dd>
            <dd>Other nights</dd>
            <dt>Sleep quality</dt>
            <dd>{fmt(p.sleep.nightmare)}</dd>
            <dd>{fmt(p.sleep.other)}</dd>
            <dt>Waking mood</dt>
            <dd>{fmt(p.mood.nightmare)}</dd>
            <dd>{fmt(p.mood.other)}</dd>
          </dl>
        </section>
      )}

      {p.keywords.length > 0 && (
        <section className="pat__section">
          <h2>Keywords</h2>
          <ul className="pat__chips">
            {p.keywords.map((k) => (
              <li key={k.value} className="pat__chip">
                {k.value} ({k.count})
              </li>
            ))}
          </ul>
        </section>
      )}
      {p.phrases.length > 0 && (
        <section className="pat__section">
          <h2>Phrases</h2>
          <ul className="pat__chips">
            {p.phrases.map((k) => (
              <li key={k.value} className="pat__chip">
                {k.value} ({k.count})
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.recurring.length > 0 && (
        <section className="pat__section">
          <h2>Possibly recurring</h2>
          <ul className="pat__list">
            {p.recurring.map((g) => (
              <li key={g.ids.join(',')} className="pat__group">
                <span>{g.keywords.join(', ')}</span>
                <div className="pat__dates">
                  {g.ids.map((id) => (
                    <button key={id} type="button" onClick={() => onOpenDream(id)}>
                      {dateOf.get(id) ?? id}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="pat__note">Worked out on this device. Nothing was sent anywhere.</p>
    </div>
  )
}
