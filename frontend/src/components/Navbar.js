/**
 * Navbar Component
 * Fixed top navigation with links, user avatar, and logout
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import {
  FiHome, FiUpload, FiSearch, FiCalendar, FiGlobe,
  FiLogOut, FiUser, FiMenu, FiX
} from 'react-icons/fi';
import { MdOutlineMemory } from 'react-icons/md';
import './Navbar.css';

const NAV_LINKS = [
  { to: '/dashboard',   label: 'Dashboard',   icon: <FiHome /> },
  { to: '/upload',      label: 'Add Memory',  icon: <FiUpload /> },
  { to: '/search',      label: 'Search',      icon: <FiSearch /> },
  { to: '/on-this-day', label: 'On This Day', icon: <FiCalendar /> },
  { to: '/community',   label: 'Community',   icon: <FiGlobe /> },
];

export default function Navbar() {
  const { currentUser, userName, userPhoto, logout } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [dropOpen,    setDropOpen]    = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const dropRef = useRef(null);

  // Detect scroll for navbar shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [location]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__inner container">
        {/* Brand */}
        <Link to="/dashboard" className="navbar__brand">
          <MdOutlineMemory className="navbar__brand-icon" />
          <span className="navbar__brand-text">Memory<span>Keeper</span></span>
        </Link>

        {/* Desktop Nav Links */}
        <ul className="navbar__links">
          {NAV_LINKS.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `navbar__link ${isActive ? 'navbar__link--active' : ''}`
                }
              >
                {icon}
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Right side: Avatar + Dropdown */}
        <div className="navbar__right">
          <div className="navbar__avatar-wrap" ref={dropRef}>
            <button
              className="navbar__avatar-btn"
              onClick={() => setDropOpen((v) => !v)}
              aria-label="User menu"
            >
              {userPhoto ? (
                <img src={userPhoto} alt={userName} className="navbar__avatar-img" />
              ) : (
                <div className="navbar__avatar-fallback">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="navbar__username">{userName}</span>
            </button>

            {dropOpen && (
              <div className="navbar__dropdown animate-scale-in">
                <div className="navbar__dropdown-header">
                  <p className="navbar__dropdown-name">{userName}</p>
                  <p className="navbar__dropdown-email text-xs text-muted">
                    {currentUser?.email}
                  </p>
                </div>
                <div className="navbar__dropdown-divider" />
                <button className="navbar__dropdown-item" onClick={() => { setDropOpen(false); navigate('/dashboard'); }}>
                  <FiUser /> My Memories
                </button>
                <button className="navbar__dropdown-item navbar__dropdown-item--danger" onClick={handleLogout}>
                  <FiLogOut /> Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="navbar__hamburger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="navbar__mobile-menu animate-fade-in">
          {NAV_LINKS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `navbar__mobile-link ${isActive ? 'navbar__mobile-link--active' : ''}`
              }
            >
              {icon} {label}
            </NavLink>
          ))}
          <button className="navbar__mobile-logout" onClick={handleLogout}>
            <FiLogOut /> Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}
