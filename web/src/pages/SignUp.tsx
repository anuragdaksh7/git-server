import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Alert, AuthLayout, Button, Field } from '../components/ui'
import { useForm } from './useForm'

export default function SignUp() {
  const navigate = useNavigate()
  const { values, error, submitting, onChange, handleSubmit } = useForm(
    { name: '', username: '', email: '', password: '' },
    async (v) => {
      await api.signUp(v)
      navigate('/login')
    },
  )

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Host your own Git repositories in seconds."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form className="stack" onSubmit={handleSubmit}>
        <div className="row">
          <Field label="Name" name="name" autoComplete="name" value={values.name} onChange={onChange} required autoFocus />
          <Field label="Username" name="username" autoComplete="username" value={values.username} onChange={onChange} required />
        </div>
        <Field label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={onChange} required />
        <Field label="Password" name="password" type="password" autoComplete="new-password" value={values.password} onChange={onChange} required />
        {error && <Alert>{error}</Alert>}
        <Button className="btn-primary btn-block" loading={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
