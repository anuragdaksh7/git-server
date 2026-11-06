import { useState } from 'react'
import { api } from '../../api'
import { Alert, Button, Field } from '../../components/ui'
import { useForm } from '../useForm'
import { useRepo } from './context'

export default function Settings() {
  const { repoName, meta } = useRepo()
  const [saved, setSaved] = useState(false)

  const general = useForm({ name: repoName, description: meta.description, visibility: meta.visibility as string }, async (v) => {
    setSaved(false)
    await api.updateRepo(repoName, { name: v.name, description: v.description, visibility: v.visibility === 'public' ? 'public' : 'private' })
    setSaved(true)
  })

  const danger = useForm({ confirm: '' }, async () => {
    await api.deleteRepo(repoName)
  })

  return (
    <main className="page repo-body settings">
      <section className="settings-section">
        <div className="settings-label">
          <h2>General</h2>
          <p className="muted small">Name, description and who can see this repository.</p>
        </div>
        <form className="stack" onSubmit={general.handleSubmit}>
          <Field label="Repository name" name="name" value={general.values.name} onChange={general.onChange} required pattern="[A-Za-z0-9_.\-]{1,100}" />
          <Field label="Description" name="description" value={general.values.description} onChange={general.onChange} />
          <fieldset className="field">
            <legend className="eyebrow">Visibility</legend>
            {(['private', 'public'] as const).map((option) => (
              <label key={option} className="radio">
                <input type="radio" name="visibility" value={option} checked={general.values.visibility === option} onChange={general.onChange} />
                <span>
                  <strong>{option === 'public' ? 'Public' : 'Private'}</strong>
                  <span className="muted small">
                    {option === 'public' ? 'Anyone can see and clone this repository.' : 'Only you can see and clone this repository.'}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          {general.error && <Alert>{general.error}</Alert>}
          {saved && <p className="small">Saved.</p>}
          <div>
            <Button className="btn-primary" loading={general.submitting}>
              Save changes
            </Button>
          </div>
        </form>
      </section>

      <section className="settings-section danger">
        <div className="settings-label">
          <h2>Danger zone</h2>
          <p className="muted small">Deleting removes the repository and its history from the server. This cannot be undone.</p>
        </div>
        <form className="stack" onSubmit={danger.handleSubmit}>
          <Field
            label={`Type ${repoName} to confirm`}
            name="confirm"
            value={danger.values.confirm}
            onChange={danger.onChange}
            autoComplete="off"
          />
          {danger.error && <Alert>{danger.error}</Alert>}
          <div>
            <Button className="btn-danger" loading={danger.submitting} disabled={danger.values.confirm !== repoName}>
              Delete this repository
            </Button>
          </div>
        </form>
      </section>
    </main>
  )
}
