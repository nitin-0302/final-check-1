import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FlaskConical, LayoutDashboard, LogOut, Shield, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const { user, isAdmin, login, logout, isAuthenticating, authError, clearError } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Events', path: '/events' },
    { name: 'Live Games', path: '/games' },
    { name: 'Community', path: '/community' },
    { name: 'Register', path: '/register' },
  ];

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      {authError && (
        <div className="bg-red-50 text-red-600 px-4 py-2 text-xs flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3" />
            <span>{authError}</span>
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline font-bold ml-2 hover:text-red-700"
            >
              Open in new tab
            </a>
          </div>
          <button onClick={clearError} className="p-1 hover:bg-red-100 rounded">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" onClick={closeMobileMenu}>
          <div className="bg-brand-primary p-2 rounded-lg group-hover:rotate-12 transition-transform">
            <FlaskConical className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-brand-dark leading-none">Rasayan</h1>
            <p className="text-[10px] uppercase tracking-widest text-brand-primary font-bold">Panchtatva 2026</p>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium transition-colors ${
                location.pathname === link.path ? 'text-brand-primary' : 'text-text-muted hover:text-brand-primary'
              }`}
            >
              {link.name}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
            >
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-1 bg-brand-soft text-brand-primary px-3 py-1.5 rounded-full text-sm font-medium hover:bg-brand-primary hover:text-white transition-all"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="p-2 text-text-muted hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                disabled={isAuthenticating}
                className="btn-primary py-2 px-6 disabled:bg-gray-400 flex items-center gap-2"
              >
                {isAuthenticating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-brand-dark hover:bg-brand-soft rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={closeMobileMenu}
                  className={`block text-lg font-medium ${
                    location.pathname === link.path ? 'text-brand-primary' : 'text-brand-dark'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-2 text-lg font-medium text-amber-600"
                >
                  <Shield className="w-5 h-5" />
                  Admin Dashboard
                </Link>
              )}
              <div className="pt-4 border-t border-gray-100">
                {user ? (
                  <div className="space-y-4">
                    <Link
                      to="/dashboard"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-2 text-brand-primary font-medium"
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      User Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        closeMobileMenu();
                      }}
                      className="flex items-center gap-2 text-red-500 font-medium"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      login();
                      closeMobileMenu();
                    }}
                    disabled={isAuthenticating}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    {isAuthenticating ? 'Signing In...' : 'Sign In with Google'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
