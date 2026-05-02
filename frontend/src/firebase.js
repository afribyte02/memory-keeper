/**
 * Firebase Client SDK Configuration
 * Initialize Firebase app and export auth instance
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth';

// ── Firebase project config (replace with your own values) ──────────────────
const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth instance
const auth = getAuth(app);

// Providers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const githubProvider = new GithubAuthProvider();

// ── Exported Auth Helpers ──────────────────────────────────────────────────
const registerWithEmail = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

const loginWithGithub = () => signInWithPopup(auth, githubProvider);

const logout = () => signOut(auth);

const resetPassword = (email) => sendPasswordResetEmail(auth, email);

const verifyEmail = () => sendEmailVerification(auth.currentUser);

const updateUserProfile = (displayName, photoURL) =>
  updateProfile(auth.currentUser, { displayName, photoURL });

export {
  auth,
  googleProvider,
  githubProvider,
  onAuthStateChanged,
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  loginWithGithub,
  logout,
  resetPassword,
  verifyEmail,
  updateUserProfile,
};

export default app;
