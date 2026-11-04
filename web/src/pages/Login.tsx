import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Alert, AuthLayout, Button, Field } from '../components/ui'
import { useForm } from './useForm'

export default function Login() {
  const navigate = useNavigate()
  const { values, error, submitting, onChange, handleSubmit } = useForm(
    { email: '', password: '' },
    async (v) => {
      await api.login(v)
      navigate('/')
    },
  )

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your repositories."
      footer={
        <>
          New to gitark? <Link to="/signup">Create an account</Link>
        </>
      }
    >
      <form className="stack" onSubmit={handleSubmit}>
        <Field label="Email" name="email" type="email" autoComplete="email" value={values.email} onChange={onChange} required autoFocus />
        <Field label="Password" name="password" type="password" autoComplete="current-password" value={values.password} onChange={onChange} required />
        {error && <Alert>{error}</Alert>}
        <Button className="btn-primary btn-block" loading={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
