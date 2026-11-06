import { Navigate, Outlet } from 'react-router-dom'
import { api } from '../api'
import { useAsync } from '../lib/useAsync'
import { MeContext } from './me'
import { TopBar } from './TopBar'
import { Alert, Spinner } from './ui'

export function AppShell() {
  const me = useAsync('me', api.me)

  if (me.unauthorized) return <Navigate to="/login" replace />

  return (
    <div className="app">
      <TopBar user={me.data ?? null} />
      {me.error ? (
        <div className="page-message">
          <Alert>{me.error}</Alert>
        </div>
      ) : !me.data ? (
        <Spinner />
      ) : (
        <MeContext.Provider value={me.data}>
          <Outlet />
        </MeContext.Provider>
      )}
    </div>
  )
}
