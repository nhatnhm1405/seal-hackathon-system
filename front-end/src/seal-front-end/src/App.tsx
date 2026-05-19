import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/public/HomePage'
import EventsPage from './pages/public/EventsPage'
import EventDetailsPage from './pages/public/EventDetailsPage'
import ProfilePage from './pages/public/ProfilePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import RecoveryPage from './pages/auth/RecoveryPage'
import PendingPage from './pages/auth/PendingPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/event-details" element={<EventDetailsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/recovery" element={<RecoveryPage />} />
      <Route path="/pending" element={<PendingPage />} />
    </Routes>
  )
}

export default App