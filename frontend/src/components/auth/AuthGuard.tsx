import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = false,
  fallback,
}) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (!isAuthenticated && requireAuth) {
      checkAuth().then(() => {
        if (!isAuthenticated) {
          setShowAuthModal(true);
        }
      });
    }
  }, [isAuthenticated, requireAuth, checkAuth]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return (
      <>
        {fallback || (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
              <p className="text-gray-600 mb-4">Please sign in to access this feature</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Sign In
              </button>
            </div>
          </div>
        )}

        {showAuthModal && (
          <>
            {authMode === 'login' ? (
              <LoginModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onSwitchToRegister={() => setAuthMode('register')}
                onSuccess={() => setShowAuthModal(false)}
              />
            ) : (
              <RegisterModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onSwitchToLogin={() => setAuthMode('login')}
                onSuccess={() => setShowAuthModal(false)}
              />
            )}
          </>
        )}
      </>
    );
  }

  return <>{children}</>;
};

