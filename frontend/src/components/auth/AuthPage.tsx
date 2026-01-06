import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { LoginModal } from './LoginModal';
import { RegisterModal } from './RegisterModal';

export const AuthPage: React.FC = () => {
  const { initializeAuth, isAuthenticated } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initializeAuth();
      setIsInitialized(true);
    };
    init();
  }, [initializeAuth]);

  if (!isInitialized) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect to main app - this will be handled by App.tsx
    return null;
  }

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome</h1>
          <p className="text-gray-600">Sign in to access all features</p>
        </div>

        {mode === 'login' ? (
          <LoginModal
            isOpen={true}
            onClose={() => {}}
            onSwitchToRegister={() => setMode('register')}
          />
        ) : (
          <RegisterModal
            isOpen={true}
            onClose={() => {}}
            onSwitchToLogin={() => setMode('login')}
          />
        )}

        <div className="mt-6 text-center">
          <button
            onClick={async () => {
              await initializeAuth();
            }}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
};

