import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

const ProtectedRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useUser();

  // Show loading state while checking authentication
  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  // If user is not authenticated, redirect to signup page
  if (!isAuthenticated || !user) {
    return <Navigate to="/signup" replace />;
  }

  // If authenticated, render the protected content
  return children;
};

export default ProtectedRoute;

