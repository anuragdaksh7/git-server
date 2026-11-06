import { useState } from 'react'
import type { Activity } from '../api'

const level = (count: number) => (count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 9 ? 3 : 4)

export function ActivityGrid({ days }: { days: Activity }) {
  const total = days.reduce((sum, n) => sum + n, 0)
  const [today] = useState(() => Date.now())
  const start = today - (days.length - 1) * 86_400_000

  return (
    <section className="section">
      <div className="section-head">
        <div className="eyebrow">Activity</div>
        <span className="muted small">{total.toLocaleString()} contributions in the last year</span>
      </div>
      <div className="activity-grid">
        {days.map((count, i) => (
          <span
            key={i}
            className={`cell l${level(count)}`}
            title={`${count} on ${new Date(start + i * 86_400_000).toLocaleDateString()}`}
          />
        ))}
      </div>
      <div className="activity-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`cell l${l}`} />
        ))}
        <span>More</span>
      </div>
    </section>
  )
}
