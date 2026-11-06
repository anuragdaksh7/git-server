import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import Explore from './pages/Explore'
import Login from './pages/Login'
import MyIssues from './pages/MyIssues'
import Profile from './pages/Profile'
import Commits from './pages/repo/Commits'
import FileView from './pages/repo/FileView'
import Releases from './pages/repo/Releases'
import RepoCode from './pages/repo/RepoCode'
import RepoIssues from './pages/repo/RepoIssues'
import RepoLayout from './pages/repo/RepoLayout'
import Settings from './pages/repo/Settings'
import SignUp from './pages/SignUp'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      <Route element={<AppShell />}>
        <Route index element={<Profile />} />
        <Route path="u/:username" element={<Profile />} />
        <Route path="explore" element={<Explore />} />
        <Route path="issues" element={<MyIssues kind="issue" />} />
        <Route path="pulls" element={<MyIssues kind="pull" />} />

        <Route path="repo/:repoName" element={<RepoLayout />}>
          <Route index element={<RepoCode />} />
          <Route path="blob" element={<FileView />} />
          <Route path="commits" element={<Commits />} />
          <Route path="issues" element={<RepoIssues kind="issue" />} />
          <Route path="pulls" element={<RepoIssues kind="pull" />} />
          <Route path="releases" element={<Releases />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
