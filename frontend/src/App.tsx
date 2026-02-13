import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Board from './pages/Board';
import CategoriesList from './pages/CategoriesList';
import Category from './pages/Category';
import Topic from './pages/Topic';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import About from './pages/About';
import OAuthCallback from './pages/OAuthCallback';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden transition-colors">
          <Navbar />
          <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl text-gray-900 dark:text-gray-100">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/board" element={<Board />} />
              <Route path="/categories" element={<CategoriesList />} />
              <Route path="/category/:id" element={<Category />} />
              <Route path="/topic/:id" element={<Topic />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/auth/callback" element={<OAuthCallback />} />
              <Route path="/about" element={<About />} />
              <Route path="/users/:id" element={<UserProfile />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        </Router>
      </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
