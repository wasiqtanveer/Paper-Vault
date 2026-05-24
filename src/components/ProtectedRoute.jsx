import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="spinner-wrap">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

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
