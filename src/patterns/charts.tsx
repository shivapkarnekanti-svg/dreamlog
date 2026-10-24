import type { MonthPoint } from './types'

const W = 320
const H = 160
const PAD = { l: 28, r: 8, t: 10, b: 24 }

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function monthLabel(m: string): string {
  const [y, mo] = m.split('-')
  const name = MONTH_NAMES[Number(mo) - 1] ?? m
  return `${name} ${y ?? ''}`.trim()
}

export function MonthlyChart({ months }: { months: MonthPoint[] }) {
  if (months.length === 0) return null
  const max = Math.max(1, ...months.map((m) => m.dreams))
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const slot = iw / months.length
  const barW = Math.max(2, slot * 0.7)
  const y = (v: number) => PAD.t + ih - (v / max) * ih
  const cx = (i: number) => PAD.l + slot * i + slot / 2
  const line = (pick: (m: MonthPoint) => number) =>
    months.map((m, i) => `${cx(i).toFixed(1)},${y(pick(m)).toFixed(1)}`).join(' ')
  const labelEvery = Math.max(1, Math.ceil(months.length / 6))
  const summary = `Dreams per month, from ${monthLabel(months[0]!.month)} to ${monthLabel(
    months[months.length - 1]!.month,
  )}. Busiest month had ${max} dreams.`

  return (
    <figure className="pat__figure">
      <svg
        className="pat__svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={summary}
        preserveAspectRatio="xMidYMid meet"
      >
        <line className="pat__axis" x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} />
        <text className="pat__tick" x={PAD.l - 4} y={y(0) + 3} textAnchor="end">
          0
        </text>
        <text className="pat__tick" x={PAD.l - 4} y={y(max) + 3} textAnchor="end">
          {max}
        </text>
        {months.map((m, i) => (
          <rect
            key={m.month}
            className="pat__bar-dreams"
            x={cx(i) - barW / 2}
            y={y(m.dreams)}
            width={barW}
            height={y(0) - y(m.dreams)}
          />
        ))}
        <polyline className="pat__line-nightmare" fill="none" points={line((m) => m.nightmares)} />
        <polyline className="pat__line-lucid" fill="none" points={line((m) => m.lucid)} />
        {months.map((m, i) =>
          i % labelEvery === 0 ? (
            <text key={m.month} className="pat__tick" x={cx(i)} y={H - 8} textAnchor="middle">
              {m.month.slice(5)}/{m.month.slice(2, 4)}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="pat__legend">
        <span className="pat__key pat__key--dreams">Dreams</span>
        <span className="pat__key pat__key--nightmare">Nightmares</span>
        <span className="pat__key pat__key--lucid">Lucid</span>
      </figcaption>
      <table className="pat__sr">
        <caption>Dreams per month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Dreams</th>
            <th scope="col">Nightmares</th>
            <th scope="col">Lucid</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.month}>
              <th scope="row">{monthLabel(m.month)}</th>
              <td>{m.dreams}</td>
              <td>{m.nightmares}</td>
              <td>{m.lucid}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export function WeekdayChart({ counts }: { counts: number[] }) {
  const max = Math.max(1, ...counts)
  const h = 120
  const slot = W / 7
  const barW = slot * 0.6
  const base = h - 20
  const top = 14
  const best = counts.indexOf(Math.max(...counts))
  const summary = `Dreams by weekday. ${WEEKDAYS[best] ?? ''} has the most, with ${counts[best] ?? 0}.`
  return (
    <figure className="pat__figure">
      <svg className="pat__svg" viewBox={`0 0 ${W} ${h}`} role="img" aria-label={summary}>
        <line className="pat__axis" x1={0} x2={W} y1={base} y2={base} />
        {counts.map((c, i) => {
          const bh = (c / max) * (base - top)
          return (
            <g key={WEEKDAYS[i]}>
              <rect
                className="pat__bar-dreams"
                x={slot * i + (slot - barW) / 2}
                y={base - bh}
                width={barW}
                height={bh}
              />
              <text
                className="pat__tick"
                x={slot * i + slot / 2}
                y={base - bh - 3}
                textAnchor="middle"
              >
                {c}
              </text>
              <text className="pat__tick" x={slot * i + slot / 2} y={h - 6} textAnchor="middle">
                {WEEKDAYS[i]}
              </text>
            </g>
          )
        })}
      </svg>
      <table className="pat__sr">
        <caption>Dreams by weekday</caption>
        <thead>
          <tr>
            <th scope="col">Weekday</th>
            <th scope="col">Dreams</th>
          </tr>
        </thead>
        <tbody>
          {counts.map((c, i) => (
            <tr key={WEEKDAYS[i]}>
              <th scope="row">{WEEKDAYS[i]}</th>
              <td>{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
