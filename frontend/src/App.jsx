import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CourseDetail from './pages/CourseDetail';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import PublicProfile from './pages/PublicProfile';
import { setupAuthListener } from './utils/setupAuthListener';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('access');
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function AuthGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    // This runs once when the app loads and "hooks" into all fetch calls
    setupAuthListener(navigate);
  }, [navigate]);

  return null; // This component doesn't render anything
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGuard />
      <Routes>

        {/* Public Routes */}
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="course/:id" element={<CourseDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:userId" element={<Messages />} />
          <Route path="/profile/:userId" element={<PublicProfile />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}