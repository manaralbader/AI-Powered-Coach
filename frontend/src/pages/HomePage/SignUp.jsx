import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import stockImage from '../../assets/stock-image.jpg';
import logo from '../../assets/Logo.png';


const SignUp = () => {
  const navigate = useNavigate();
  const { signUp } = useUser();
  const { showSuccess, showError } = useToast();
  
  // Form state management
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // Error state for validation feedback
  const [errors, setErrors] = useState({});
  
  // Loading state for form submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation helper: checks if email format is valid
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validation helper: checks if password meets requirements
  const validatePassword = (password) => {
    return password.length >= 8;
  };

  // Validation helper: checks if passwords match
  const validatePasswordMatch = (password, confirmPassword) => {
    return password === confirmPassword;
  };

  // Real-time validation on input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate all form fields
  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    // Password confirmation validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (!validatePasswordMatch(formData.password, formData.confirmPassword)) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('📝 Creating account with Firebase...');
      
      const { user: newUser, error } = await signUp(formData.email, formData.password);
      
      if (error) {
        console.error('❌ Signup error:', error);
        
        // Handle specific Firebase errors
        switch (error.code) {
          case 'auth/email-already-in-use':
            showError('Email is already in use.');
            setErrors({ email: 'Email is already in use.' });
            break;
          case 'auth/invalid-email':
            showError('Invalid email address.');
            setErrors({ email: 'Invalid email address.' });
            break;
          case 'auth/operation-not-allowed':
            showError('Email/password sign up is not enabled.');
            setErrors({ email: 'Email/password sign up is not enabled.' });
            break;
          case 'auth/weak-password':
            showError('Password is too weak.');
            setErrors({ password: 'Password is too weak.' });
            break;
          default:
            showError(error.message || 'An error occurred during signup.');
            setErrors({ email: error.message || 'An error occurred during signup.' });
        }
        setIsSubmitting(false);
        return;
      }

      if (!newUser) {
        throw new Error('Failed to create account');
      }

      console.log('✅ Account created successfully:', newUser.uid);
      
      // Show success message and navigate
      showSuccess('Account created! Let\'s set up your profile.');
      
      // Wait a moment for the auth state to update, then navigate
      setTimeout(() => {
        navigate('/profile-setup');
      }, 500);
      
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      showError('An unexpected error occurred. Please try again.');
      setErrors({ email: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if form is valid for submit button state
  const isFormValid = formData.email && 
                     formData.password && 
                     formData.confirmPassword &&
                     validateEmail(formData.email) &&
                     validatePassword(formData.password) &&
                     validatePasswordMatch(formData.password, formData.confirmPassword);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `url(${stockImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingRight: '10%'
    }}>
      {/* Green transparent overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(42, 115, 55, 0.45)',
        zIndex: 1
      }}></div>
      
      {/* Form container */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '3rem',
        borderRadius: '15px',
        maxWidth: '450px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <img src={logo} alt="Logo" style={{ height: '80px', width: 'auto' }} />
        </div>
        <h2 style={{ fontSize: '2rem', color: '#2A7337' }}>Create Account</h2>
        <p style={{ marginBottom: '1rem', color: '#666', fontSize: '1rem' }}>Join us to start your fitness journey!</p>
        
        <form onSubmit={handleSubmit} style={{ maxWidth: '100%' }}>
        {/* Email Input */}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              border: `2px solid ${errors.email ? '#dc3545' : '#e0e0e0'}`,
              borderRadius: '8px',
              boxSizing: 'border-box'
            }}
            placeholder="Enter your email"
            required
          />
          {errors.email && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.email}
            </div>
          )}
        </div>

        {/* Password Input */}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                paddingRight: '3rem',
                fontSize: '1rem',
                border: `2px solid ${errors.password ? '#dc3545' : '#e0e0e0'}`,
                borderRadius: '8px',
                boxSizing: 'border-box'
              }}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: '#666' }}
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: '#666' }}
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.password}
            </div>
          )}
        </div>

        {/* Confirm Password Input */}
        <div style={{ marginBottom: '2rem' }}>
          <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            Confirm Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                paddingRight: '3rem',
                fontSize: '1rem',
                border: `2px solid ${errors.confirmPassword ? '#dc3545' : '#e0e0e0'}`,
                borderRadius: '8px',
                boxSizing: 'border-box'
              }}
              placeholder="Confirm your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: '#666' }}
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: '#666' }}
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.confirmPassword}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          style={{
            width: '100%',
            padding: '0.75rem 2rem',
            fontSize: '1.1rem',
            fontWeight: '600',
            borderRadius: '8px',
            opacity: (!isFormValid || isSubmitting) ? 0.6 : 1,
            cursor: (!isFormValid || isSubmitting) ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

        {/* Sign In Link */}
        <div style={{ textAlign: 'center'}}>
          <p style={{ color: '#666', margin: 0 }}>
            Already have an account?{' '}
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
    </div>
  );
};

export default SignUp;
