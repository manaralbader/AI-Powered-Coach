import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';


const ForgotPassword = () => {
  const navigate = useNavigate();
  const { resetPassword } = useUser();
  const { showSuccess, showError } = useToast();
  
  // Form state management
  const [email, setEmail] = useState('');
  
  // Error state for validation feedback
  const [error, setError] = useState('');
  
  // Loading state for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Success state to show confirmation message
  const [emailSent, setEmailSent] = useState(false);

  // Validation helper: checks if email format is valid
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const value = e.target.value;
    setEmail(value);

    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      console.log('📧 Sending password reset email...');
      
      const { success, error: resetError } = await resetPassword(email);
      
      if (!success && resetError) {
        console.error('❌ Password reset error:', resetError);
        
        // Handle specific Firebase errors
        switch (resetError.code) {
          case 'auth/user-not-found':
            setError('No account found with this email address.');
            showError('No account found with this email address.');
            break;
          case 'auth/invalid-email':
            setError('Invalid email address.');
            showError('Invalid email address.');
            break;
          case 'auth/too-many-requests':
            setError('Too many requests. Please try again later.');
            showError('Too many requests. Please try again later.');
            break;
          case 'auth/network-request-failed':
            setError('Network error. Please check your internet connection.');
            showError('Network error. Please check your internet connection.');
            break;
          default:
            setError('An error occurred. Please try again.');
            showError('An error occurred. Please try again.');
        }
        setIsSubmitting(false);
        return;
      }

      if (success) {
        console.log('✅ Password reset email sent successfully');
        setEmailSent(true);
        showSuccess('Password reset email sent! Check your inbox.');
      }
      
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
      showError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="goals-container">
      <h2>Reset Password</h2>
      <p>Enter your email address and we'll send you a link to reset your password.</p>
      
      {emailSent ? (
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div style={{
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid #c3e6cb'
          }}>
            <p style={{ margin: 0, fontWeight: '600' }}>✓ Email Sent!</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
              We've sent a password reset link to <strong>{email}</strong>. 
              Please check your inbox and follow the instructions to reset your password.
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => navigate('/signin')}
              style={{
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: '600',
                borderRadius: '8px',
                backgroundColor: '#2A7337',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '1rem'
              }}
            >
              Back to Sign In
            </button>
            <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>
              Didn't receive the email? Check your spam folder or{' '}
              <button
                onClick={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2A7337',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.9rem'
                }}
              >
                try again
              </button>
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '0 auto' }}>
          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '0.75rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid #f5c6cb'
            }}>
              {error}
            </div>
          )}

          {/* Email Input */}
          <div style={{ marginBottom: '2rem' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: `2px solid ${error ? '#dc3545' : '#e0e0e0'}`,
                borderRadius: '8px',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your email address"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '0.75rem 2rem',
              fontSize: '1.1rem',
              fontWeight: '600',
              borderRadius: '8px',
              backgroundColor: '#2A7337',
              color: 'white',
              border: 'none',
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      )}

      {/* Back to Sign In Link */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <p style={{ color: '#666', margin: 0 }}>
          Remember your password?{' '}
          <Link 
            to="/signin" 
            style={{ 
              color: '#2A7337', 
              textDecoration: 'none', 
              fontWeight: '600' 
            }}
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;

