import { useState, type ChangeEvent, type FormEvent } from 'react'

export function useForm<T extends Record<string, string>>(initial: T, onSubmit: (values: T, reset: () => void) => Promise<void>) {
  const [values, setValues] = useState(initial)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await onSubmit(values, () => setValues(initial))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return { values, error, submitting, onChange, handleSubmit }
}
