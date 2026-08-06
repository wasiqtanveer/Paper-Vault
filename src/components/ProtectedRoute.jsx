import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { PageSkeleton } from './Skeleton';

export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading, profileReady = true } = useAuth();
  const location = useLocation();

  if (loading) return <PageSkeleton />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // The role is unknown until the profile arrives; deciding before that would
  // flash a 403 at moderators and admins.
  if (roles && roles.length > 0 && !profileReady) return <PageSkeleton />;

  if (roles && roles.length > 0 && (!profile || !roles.includes(profile.role))) {
    return (
      <div className="access-denied">
        <h1>403</h1>
        <p>You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  return children;
}
