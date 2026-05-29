import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { Suspense, lazy, useDeferredValue, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { SoundProvider } from './context/SoundContext';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Preloader from './components/Preloader';
import WelcomeModal from './components/WelcomeModal';
import { EASE_OUT } from './lib/motion';
import { routeLoaders, prefetchAllRoutes } from './lib/routes';

const Home         = lazy(routeLoaders['/']);
const Browse       = lazy(routeLoaders['/browse']);
const PaperViewer  = lazy(routeLoaders['/paper']);
const Login        = lazy(routeLoaders['/login']);
const Register     = lazy(routeLoaders['/register']);
const Upload       = lazy(routeLoaders['/upload']);
const Profile      = lazy(routeLoaders['/profile']);
const ModDashboard = lazy(routeLoaders['/mod']);
const AdminPanel   = lazy(routeLoaders['/admin']);
const About        = lazy(routeLoaders['/about']);
const HallOfFame   = lazy(routeLoaders['/hall-of-fame']);

function PageFallback() {
  return <div className="spinner-wrap"><div className="spinner" /></div>;
}

const AUTH_ROUTES = ['/login', '/register'];

/**
 * Navigation dissolves in place. No travel and, deliberately, no scale: the
 * content region is a grid of photographed papers, and scaling that subtree
 * forces the compositor to re-rasterise every image and glyph mid-flight, which
 * reads as softness rather than as motion. Opacity alone re-composes the same
 * surface, which is what "morph" actually means on a tool like this.
 *
 * The exit is near-instant so the empty beat between pages never registers as a
 * stall, and the entrance is short enough to stay out of the way of the content
 * animation that follows it.
 */
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18, ease: EASE_OUT } },
  exit:    { opacity: 0, transition: { duration: 0.09, ease: 'linear' } },
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

  /**
   * Render the routes from a deferred copy of the location. If the incoming
   * route's chunk isn't resolved yet, React keeps painting the previous page
   * instead of falling back to the spinner — so the outgoing page survives long
   * enough to actually animate out. Redirects and branch selection above still
   * read the live location, so navigation itself is never delayed.
   */
  const deferredLocation = useDeferredValue(location);

  // ...but never across the auth/shell boundary. Each branch below declares only
  // its own routes, so a deferred pathname belonging to the other branch matches
  // nothing and paints a blank frame — most visibly on the hop into the app right
  // after sign-in. When the branch disagrees, drop the deferral for that render.
  const renderLocation =
    AUTH_ROUTES.includes(deferredLocation.pathname) === isAuthPage
      ? deferredLocation
      : location;

  // Warm the remaining route chunks once the first page is on screen, so the
  // spinner path is reserved for the genuine cold start it was written for.
  useEffect(() => {
    const idle = window.requestIdleCallback;
    if (idle) {
      const handle = idle(prefetchAllRoutes, { timeout: 3000 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const t = setTimeout(prefetchAllRoutes, 1500);
    return () => clearTimeout(t);
  }, []);

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
          <Routes location={renderLocation} key={renderLocation.pathname}>
            <Route path="/login"    element={<PageWrap><Login /></PageWrap>} />
            <Route path="/register" element={<PageWrap><Register /></PageWrap>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    );
  }

  return (
    <div className="app-shell">
      <a href="#main-scroll" className="skip-link">Skip to content</a>
      <WelcomeModal />
      <Sidebar />
      <main className="main-content" id="main-scroll">
        <Suspense fallback={<PageFallback />}>
          <AnimatePresence mode="wait">
            <Routes location={renderLocation} key={renderLocation.pathname}>
              <Route path="/"          element={<PageWrap><Home /></PageWrap>} />
              <Route path="/browse"    element={<PageWrap><Browse /></PageWrap>} />
              <Route path="/paper/:id" element={<PageWrap><PaperViewer /></PageWrap>} />
              <Route path="/upload"    element={<ProtectedRoute><PageWrap><Upload /></PageWrap></ProtectedRoute>} />
              <Route path="/profile"   element={<ProtectedRoute><PageWrap><Profile /></PageWrap></ProtectedRoute>} />
              <Route path="/mod"       element={<ProtectedRoute roles={['moderator','admin']}><PageWrap><ModDashboard /></PageWrap></ProtectedRoute>} />
              <Route path="/admin"     element={<ProtectedRoute roles={['admin']}><PageWrap><AdminPanel /></PageWrap></ProtectedRoute>} />
              <Route path="/about"         element={<PageWrap><About /></PageWrap>} />
              <Route path="/hall-of-fame" element={<PageWrap><HallOfFame /></PageWrap>} />
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
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <SoundProvider>
            <AuthProvider>
              <ToastProvider>
                <Shell />
              </ToastProvider>
            </AuthProvider>
          </SoundProvider>
        </ThemeProvider>
      </MotionConfig>
    </BrowserRouter>
  );
}
