import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Preloader from './components/Preloader';

const Home         = lazy(() => import('./pages/Home'));
const Browse       = lazy(() => import('./pages/Browse'));
const PaperViewer  = lazy(() => import('./pages/PaperViewer'));
const Login        = lazy(() => import('./pages/Login'));
const Register     = lazy(() => import('./pages/Register'));
const Upload       = lazy(() => import('./pages/Upload'));
const Profile      = lazy(() => import('./pages/Profile'));
const ModDashboard = lazy(() => import('./pages/ModDashboard'));
const AdminPanel   = lazy(() => import('./pages/AdminPanel'));
const About        = lazy(() => import('./pages/About'));

function PageFallback() {
  return <div className="spinner-wrap"><div className="spinner" /></div>;
}

const AUTH_ROUTES = ['/login', '/register'];

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.15, ease: 'easeIn' } },
};

function PageWrap({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ height: '100%' }}>
      {children}
    </motion.div>
  );
}

function Shell() {
  const location = useLocation();
  const { loading, signingOut, user } = useAuth();
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);

  // Initial auth loading preloader
  if (loading) return <Preloader show message="Loading PaperVault…" />;

  // Sign-out preloader
  if (signingOut) return <Preloader show message="Signing out…" />;

  // Force auth wall — redirect to login if not authenticated and not on auth page
  if (!user && !isAuthPage) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isAuthPage) {
    return (
      <Suspense fallback={<PageFallback />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login"    element={<PageWrap><Login /></PageWrap>} />
            <Route path="/register" element={<PageWrap><Register /></PageWrap>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" id="main-scroll">
        <Suspense fallback={<PageFallback />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/"          element={<PageWrap><Home /></PageWrap>} />
              <Route path="/browse"    element={<PageWrap><Browse /></PageWrap>} />
              <Route path="/paper/:id" element={<PageWrap><PaperViewer /></PageWrap>} />
              <Route path="/upload"    element={<ProtectedRoute><PageWrap><Upload /></PageWrap></ProtectedRoute>} />
              <Route path="/profile"   element={<ProtectedRoute><PageWrap><Profile /></PageWrap></ProtectedRoute>} />
              <Route path="/mod"       element={<ProtectedRoute roles={['moderator','admin']}><PageWrap><ModDashboard /></PageWrap></ProtectedRoute>} />
              <Route path="/admin"     element={<ProtectedRoute roles={['admin']}><PageWrap><AdminPanel /></PageWrap></ProtectedRoute>} />
              <Route path="/about"     element={<PageWrap><About /></PageWrap>} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Shell />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
