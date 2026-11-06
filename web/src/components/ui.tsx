import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { NavLink } from 'react-router-dom'
import type { Label } from '../api'
import { initials } from '../lib/format'

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" />
      gitark
    </span>
  )
}

export function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="field">
      <span className="eyebrow">{label}</span>
      <input {...props} />
      {hint && <span className="muted small">{hint}</span>}
    </label>
  )
}

export function TextArea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="field">
      <span className="eyebrow">{label}</span>
      <textarea {...props} />
    </label>
  )
}

export function Button({
  loading,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button className={`btn ${className}`} disabled={loading || props.disabled} {...props}>
      {children}
      {loading && <span className="spinner" />}
    </button>
  )
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="alert" role="alert">
      {children}
    </div>
  )
}

export function Spinner() {
  return (
    <div className="page-message">
      <span className="spinner spinner-lg" />
    </div>
  )
}

/** Loading / error / content switch for a section backed by `useAsync`. */
export function Loadable<T>({
  state,
  children,
}: {
  state: { data?: T; loading: boolean; error: string }
  children: (data: T) => ReactNode
}) {
  if (state.error) return <Alert>{state.error}</Alert>
  if (state.loading || state.data === undefined) return <Spinner />
  return children(state.data)
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p>{title}</p>
      {children && <p className="muted small">{children}</p>}
    </div>
  )
}

export function Avatar({ name, size = 'sm' }: { name: string; size?: 'xs' | 'sm' }) {
  return (
    <span className={`avatar avatar-${size}`} aria-hidden>
      {initials(name) || '?'}
    </span>
  )
}

type TabItem = { to: string; label: string; count?: number; end?: boolean; active?: boolean }

/** Route tabs. Pass `active` when the tab is selected by query string rather than path. */
export function Tabs({ items }: { items: TabItem[] }) {
  return (
    <nav className="tabs">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => ((item.active ?? isActive) ? 'tab active' : 'tab')}
        >
          {item.label}
          {item.count !== undefined && <span className="mono">{item.count}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? 'active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function LabelChip({ label }: { label: Label }) {
  return <span className={`chip chip-${label.color}`}>{label.name}</span>
}

/** A button that toggles a panel and closes it on outside click or Escape. */
export function Dropdown({
  trigger,
  className = '',
  align = 'left',
  children,
}: {
  trigger: ReactNode
  className?: string
  align?: 'left' | 'right'
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="dropdown" ref={ref}>
      <button type="button" className={className} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {trigger}
      </button>
      {open && <div className={`dropdown-panel ${align}`}>{children(() => setOpen(false))}</div>}
    </div>
  )
}

export function AuthLayout({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string
  subtitle: string
  footer: ReactNode
  children: ReactNode
}) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Brand />
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
      </div>
      <p className="auth-footer">{footer}</p>
    </div>
  )
}
