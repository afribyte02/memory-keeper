/**
 * Register Page
 * Create account with email/password or OAuth
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { BsGithub } from 'react-icons/bs';
import { MdOutlineMemory } from 'react-icons/md';
import { registerWithEmail, loginWithGoogle, loginWithGithub, updateUserProfile } from '../firebase';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [name,       setName]      = useState('');
  const [email,      setEmail]     = useState('');
  const [password,   setPassword]  = useState('');
  const [confirm,    setConfirm]   = useState('');
  const [showPass,   setShowPass]  = useState(false);
  const [loading,    setLoading]   = useState(false);
  const [oauthLoad,  setOauthLoad] = useState('');

  const validatePassword = (p) => {
    if (p.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    const pwErr = validatePassword(password);
    if (pwErr) { toast.error(pwErr); return; }
    if (password !== confirm) { toast.error("Passwords don't match"); return; }

    setLoading(true);
    try {
      const cred = await registerWithEmail(email, password);
      await updateUserProfile(name.trim(), null);
      toast.success(`Welcome to Memory Keeper, ${name}! 🎉`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'An account already exists with this email'
        : err.code === 'auth/weak-password'
        ? 'Password is too weak'
        : err.message;
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setOauthLoad('google');
    try {
      await loginWithGoogle();
      toast.success('Account created with Google! 🚀');
      navigate('/dashboard');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') toast.error(err.message);
    } finally { setOauthLoad(''); }
  };

  const handleGithub = async () => {
    setOauthLoad('github');
    try {
      await loginWithGithub();
      toast.success('Account created with GitHub! 🚀');
      navigate('/dashboard');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') toast.error(err.message);
    } finally { setOauthLoad(''); }
  };

  const pwStrength = !password ? '' :
    password.length < 6 ? 'weak' :
    password.length < 10 ? 'fair' : 'strong';

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb--1" />
      <div className="auth-orb auth-orb--2" />

      <div className="auth-card glass-card animate-scale-in">
        <div className="auth-header">
          <MdOutlineMemory className="auth-logo-icon" />
          <h1 className="auth-title">Create Your Vault</h1>
          <p className="auth-subtitle text-muted">
            Start preserving your most precious memories
          </p>
        </div>

        {/* OAuth */}
        <div className="auth-oauth">
          <button id="btn-google-register" className="auth-oauth-btn" onClick={handleGoogle} disabled={!!oauthLoad} type="button">
            {oauthLoad === 'google' ? <span className="spinner spinner-sm" /> : <><FcGoogle size={20} /> Sign up with Google</>}
          </button>
          <button id="btn-github-register" className="auth-oauth-btn" onClick={handleGithub} disabled={!!oauthLoad} type="button">
            {oauthLoad === 'github' ? <span className="spinner spinner-sm" /> : <><BsGithub size={18} /> Sign up with GitHub</>}
          </button>
        </div>

        <div className="divider-text"><span>or create with email</span></div>

        <form className="auth-form" onSubmit={handleRegister}>
          {/* Name */}
          <div className="form-group">
            <label htmlFor="reg-name" className="form-label">Full Name</label>
            <div className="auth-input-wrap">
              <FiUser className="auth-input-icon" />
              <input
                id="reg-name"
                type="text"
                className="form-control auth-input"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="reg-email" className="form-label">Email Address</label>
            <div className="auth-input-wrap">
              <FiMail className="auth-input-icon" />
              <input
                id="reg-email"
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

          {/* Password */}
          <div className="form-group">
            <label htmlFor="reg-password" className="form-label">Password</label>
            <div className="auth-input-wrap">
              <FiLock className="auth-input-icon" />
              <input
                id="reg-password"
                type={showPass ? 'text' : 'password'}
                className="form-control auth-input"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button type="button" className="auth-toggle-pass" onClick={() => setShowPass((v) => !v)}>
                {showPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {/* Strength indicator */}
            {password && (
              <div className="auth-pw-strength">
                <div className={`auth-pw-bar auth-pw-bar--${pwStrength}`} />
                <span className={`auth-pw-label auth-pw-label--${pwStrength}`}>{pwStrength}</span>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div className="form-group">
            <label htmlFor="reg-confirm" className="form-label">Confirm Password</label>
            <div className="auth-input-wrap">
              <FiLock className="auth-input-icon" />
              <input
                id="reg-confirm"
                type={showPass ? 'text' : 'password'}
                className={`form-control auth-input ${confirm && confirm !== password ? 'auth-input--error' : ''}`}
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            {confirm && confirm !== password && (
              <span className="auth-field-error">Passwords do not match</span>
            )}
          </div>

          <button id="btn-register" type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading
              ? <span className="spinner spinner-sm" />
              : <><span>Create Account</span> <FiArrowRight /></>}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
