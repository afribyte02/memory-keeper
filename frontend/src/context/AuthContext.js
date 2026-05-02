/**
 * Auth Context — Global Firebase authentication state
 * Provides currentUser, loading, token, and auth helpers to all components
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, onAuthStateChanged, logout as firebaseLogout } from '../firebase';

// ── Create Context ─────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ── Custom Hook ───────────────────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

// ── Provider Component ────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [idToken, setIdToken]         = useState(null);

  // Fetch and cache the Firebase ID token (refreshes automatically)
  const refreshToken = useCallback(async (user) => {
    if (user) {
      try {
        const token = await user.getIdToken(/* forceRefresh= */ false);
        setIdToken(token);
        return token;
      } catch {
        setIdToken(null);
        return null;
      }
    }
    setIdToken(null);
    return null;
  }, []);

  useEffect(() => {
    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await refreshToken(user);
      setLoading(false);
    });

    // Auto-refresh ID token every 50 minutes (tokens expire after 60 min)
    const tokenRefreshInterval = setInterval(async () => {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken(true); // force refresh
        setIdToken(token);
      }
    }, 50 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(tokenRefreshInterval);
    };
  }, [refreshToken]);

  // Get a fresh token (for API calls)
  const getToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    try {
      const token = await auth.currentUser.getIdToken(false);
      setIdToken(token);
      return token;
    } catch {
      return null;
    }
  }, []);

  // Logout helper
  const logout = useCallback(async () => {
    await firebaseLogout();
    setCurrentUser(null);
    setIdToken(null);
  }, []);

  const value = {
    currentUser,
    idToken,
    loading,
    isAuthenticated: !!currentUser,
    getToken,
    logout,
    refreshToken,
    // Shorthand user info
    userName:  currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User',
    userEmail: currentUser?.email || '',
    userPhoto: currentUser?.photoURL || null,
    userUID:   currentUser?.uid || null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
