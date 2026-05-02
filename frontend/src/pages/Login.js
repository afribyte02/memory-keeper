/**
 * Login Page
 * Email/password + Google + GitHub sign-in with Firebase
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { BsGithub } from 'react-icons/bs';
import { MdOutlineMemory } from 'react-icons/md';
import { loginWithEmail, loginWithGoogle, loginWithGithub, resetPassword } from '../firebase';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [oauthLoad,   setOauthLoad]   = useState('');
  const [resetMode,   setResetMode]   = useState(false);
  const [resetEmail,  setResetEmail]  = useState('');
  const [resetLoading,setResetLoading]= useState(false);

  // ── Email/Password Login ────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      toast.success('Welcome back! 🎉');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential'
        ? 'Invalid email or password'
        : err.code === 'auth/user-not-found'
        ? 'No account found with this email'
        : err.code === 'auth/wrong-password'
        ? 'Incorrect password'
        : err.message;
      toast.error(msg);
    } finally { setLoading(false); }
  };

  // ── Google OAuth ────────────────────────────────────────────
  const handleGoogle = async () => {
    setOauthLoad('google');
    try {
      await loginWithGoogle();
      toast.success('Signed in with Google! 🚀');
      navigate('/dashboard');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') toast.error(err.message);
    } finally { setOauthLoad(''); }
  };

  // ── GitHub OAuth ────────────────────────────────────────────
  const handleGithub = async () => {
    setOauthLoad('github');
    try {
      await loginWithGithub();
      toast.success('Signed in with GitHub! 🚀');
      navigate('/dashboard');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') toast.error(err.message);
    } finally { setOauthLoad(''); }
  };

  // ── Password Reset ──────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) { toast.error('Enter your email address'); return; }
    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      toast.success('Password reset email sent! Check your inbox.');
      setResetMode(false);
    } catch (err) { toast.error(err.message); }
    finally { setResetLoading(false); }
  };

  return (
    <div className="auth-page">
      {/* Decorative orbs */}
      <div className="auth-orb auth-orb--1" />
      <div className="auth-orb auth-orb--2" />

      <div className="auth-card glass-card animate-scale-in">
        {/* Header */}
        <div className="auth-header">
          <MdOutlineMemory className="auth-logo-icon" />
          <h1 className="auth-title">
            {resetMode ? 'Reset Password' : 'Welcome Back'}
          </h1>
          <p className="auth-subtitle text-muted">
            {resetMode
              ? "Enter your email and we'll send a reset link"
              : 'Sign in to your Memory Keeper vault'}
          </p>
        </div>

        {/* ── Reset Mode ─────────────────────────────────────── */}
        {resetMode ? (
          <form className="auth-form" onSubmit={handleReset}>
            <div className="form-group">
              <label htmlFor="reset-email" className="form-label">Email Address</label>
              <div className="auth-input-wrap">
                <FiMail className="auth-input-icon" />
                <input
                  id="reset-email"
                  type="email"
                  className="form-control auth-input"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary auth-submit" disabled={resetLoading}>
              {resetLoading ? <span className="spinner spinner-sm" /> : 'Send Reset Link'}
            </button>
            <button type="button" className="auth-toggle-link" onClick={() => setResetMode(false)}>
              ← Back to Sign In
            </button>
          </form>

        ) : (
          /* ── Login Mode ───────────────────────────────────── */
          <>
            {/* OAuth Buttons */}
            <div className="auth-oauth">
              <button
                id="btn-google-login"
                className="auth-oauth-btn"
                onClick={handleGoogle}
                disabled={!!oauthLoad}
                type="button"
              >
                {oauthLoad === 'google'
                  ? <span className="spinner spinner-sm" />
                  : <><FcGoogle size={20} /> Continue with Google</>}
              </button>
              <button
                id="btn-github-login"
                className="auth-oauth-btn"
                onClick={handleGithub}
                disabled={!!oauthLoad}
                type="button"
              >
                {oauthLoad === 'github'
                  ? <span className="spinner spinner-sm" />
                  : <><BsGithub size={18} /> Continue with GitHub</>}
              </button>
            </div>

            <div className="divider-text"><span>or sign in with email</span></div>

            {/* Email/Password form */}
            <form className="auth-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="login-email" className="form-label">Email Address</label>
                <div className="auth-input-wrap">
                  <FiMail className="auth-input-icon" />
                  <input
                    id="login-email"
                    type="email"
                    className="form-control auth-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="auth-label-row">
                  <label htmlFor="login-password" className="form-label">Password</label>
                  <button type="button" className="auth-forgot" onClick={() => setResetMode(true)}>
                    Forgot password?
                  </button>
                </div>
                <div className="auth-input-wrap">
                  <FiLock className="auth-input-icon" />
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    className="form-control auth-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-toggle-pass"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              <button id="btn-login" type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                {loading
                  ? <span className="spinner spinner-sm" />
                  : <><span>Sign In</span> <FiArrowRight /></>}
              </button>
            </form>

            <p className="auth-footer-text">
              Don't have an account?{' '}
              <Link to="/register" className="auth-link">Create one free</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
