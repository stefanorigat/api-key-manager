'use client';

import { useState } from 'react';
import Link from "next/link";
import { login, storeSession } from '@/lib/auth';
import { initiateSSOLogin } from '@/lib/sso-auth';

export default function Home() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    rememberMe: true,
  });
  const [loginError, setLoginError] = useState('');

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginForm.email || !loginForm.password) {
      setLoginError('Please enter both email and password');
      return;
    }

    try {
      const loggedInUser = await login(loginForm.email, loginForm.password);
      if (!loggedInUser) {
        setLoginError('Invalid email or password');
        return;
      }

      storeSession(loggedInUser, loginForm.rememberMe);
      setShowLoginModal(false);
      setLoginForm({ email: '', password: '', rememberMe: true });
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      setLoginError('An error occurred during login');
      console.error('Login error:', error);
    }
  };

  return (
    <>
      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-brand-navy/30 dark:bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-brand-navy rounded-lg shadow-2xl w-full max-w-md">
            <div className="relative p-8 pb-6">
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-6 right-6 text-text-light hover:text-text-tertiary dark:hover:text-text-lighter text-2xl cursor-pointer"
              >
                ×
              </button>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-brand-peach rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">🔐</span>
                </div>
                <h2 className="text-3xl font-display text-brand-dark dark:text-white uppercase tracking-wide">
                  Login
                </h2>
                <p className="text-sm text-text-secondary dark:text-text-lighter mt-2 font-medium">
                  Enter your credentials to access the dashboard
                </p>
              </div>
            </div>
            
            <form onSubmit={handleLogin}>
              <div className="px-8 pb-6 space-y-5">
                {loginError && (
                  <div className="px-4 py-3 bg-red-50 dark:bg-accent-red/10 border border-accent-red/30 dark:border-accent-red/50 rounded-md">
                    <p className="text-sm font-medium text-accent-red">{loginError}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-semibold text-text-secondary dark:text-text-lighter mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 border border-text-lighter dark:border-text-tertiary rounded-md focus:ring-2 focus:ring-brand-blue focus:border-brand-blue dark:bg-brand-medium dark:text-white text-base font-medium"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-text-secondary dark:text-text-lighter mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 border border-text-lighter dark:border-text-tertiary rounded-md focus:ring-2 focus:ring-brand-blue focus:border-brand-blue dark:bg-brand-medium dark:text-white text-base font-medium"
                    required
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={loginForm.rememberMe}
                    onChange={(e) => setLoginForm({ ...loginForm, rememberMe: e.target.checked })}
                    className="rounded border-text-lighter text-brand-blue focus:ring-brand-blue"
                  />
                  <label htmlFor="rememberMe" className="text-sm font-medium text-text-secondary dark:text-text-lighter">
                    Remember me
                  </label>
                </div>
              </div>
              
              <div className="px-8 pb-8 space-y-3">
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-brand-dark text-white font-bold rounded-md hover:bg-brand-navy transition-colors cursor-pointer text-base"
                >
                  Login
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-text-lighter dark:border-text-tertiary"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-brand-navy text-text-light dark:text-text-lighter font-medium">
                      OR
                    </span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    initiateSSOLogin();
                  }}
                  className="w-full px-6 py-3 bg-white dark:bg-brand-medium text-brand-dark dark:text-white font-bold rounded-md border-2 border-text-lighter dark:border-text-tertiary hover:bg-gray-50 dark:hover:bg-brand-medium/80 transition-colors flex items-center justify-center gap-2 cursor-pointer text-base"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" clipRule="evenodd" />
                    <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                  </svg>
                  Login with SSO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    <div className="min-h-screen bg-gradient-to-br from-white via-brand-peach/20 to-white dark:from-brand-navy dark:via-brand-dark dark:to-brand-navy">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10">
        <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-peach rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔑</span>
            </div>
            <span className="text-xl font-display text-brand-dark dark:text-white">API Key Manager</span>
          </div>
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-5 py-2.5 bg-brand-dark text-white rounded-lg hover:bg-brand-navy transition-colors font-bold cursor-pointer text-base"
          >
            Sign In
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-32 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Hero Content */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-peach rounded-full text-brand-red text-sm font-bold mb-6">
              <span>🔒</span>
              <span>Enterprise-Grade Security</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-display text-brand-dark dark:text-white mb-6 leading-tight">
              Secure API Key Management
              <br />
              <span className="text-brand-blue">Made Simple</span>
            </h1>
            
            <p className="text-xl text-text-secondary dark:text-text-lighter mb-10 max-w-3xl mx-auto leading-relaxed font-medium">
              Manage your API keys with confidence. Built-in SSO authentication, 
              comprehensive tracking, and enterprise security features to keep your keys safe.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-8 py-4 bg-brand-dark text-white rounded-lg hover:bg-brand-navy transition-all font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer"
              >
                Get Started →
              </button>
              <a
                href="#features"
                className="px-8 py-4 bg-white dark:bg-brand-medium text-brand-dark dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-brand-medium/80 transition-colors font-bold text-lg border-2 border-text-lighter dark:border-text-tertiary cursor-pointer"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Features Grid */}
          <div id="features" className="grid md:grid-cols-3 gap-8 mb-20">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-brand-medium p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-text-lighter dark:border-text-tertiary">
              <div className="w-14 h-14 bg-brand-peach rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">🔐</span>
              </div>
              <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-3">SSO Authentication</h3>
              <p className="text-text-secondary dark:text-text-lighter leading-relaxed font-medium">
                Seamless single sign-on with Keycloak. One login for all your applications with enterprise-grade security.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-brand-medium p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-text-lighter dark:border-text-tertiary">
              <div className="w-14 h-14 bg-accent-green/20 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-3">Real-Time Management</h3>
              <p className="text-text-secondary dark:text-text-lighter leading-relaxed font-medium">
                Create, update, and revoke API keys instantly. Track usage and monitor activity in real-time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-brand-medium p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-text-lighter dark:border-text-tertiary">
              <div className="w-14 h-14 bg-brand-blue/20 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">🛡️</span>
              </div>
              <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-3">Advanced Security</h3>
              <p className="text-text-secondary dark:text-text-lighter leading-relaxed font-medium">
                Environment-based keys, permission controls, and automatic expiration. Security by design.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white dark:bg-brand-medium p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-text-lighter dark:border-text-tertiary">
              <div className="w-14 h-14 bg-accent-yellow/20 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-3">Usage Analytics</h3>
              <p className="text-text-secondary dark:text-text-lighter leading-relaxed font-medium">
                Track when and where your keys are used. Get insights into API consumption patterns.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white dark:bg-brand-medium p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-text-lighter dark:border-text-tertiary">
              <div className="w-14 h-14 bg-accent-red/20 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">🔄</span>
              </div>
              <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-3">Multi-Environment</h3>
              <p className="text-text-secondary dark:text-text-lighter leading-relaxed font-medium">
                Separate keys for development, staging, testing, and production. Keep environments isolated.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white dark:bg-brand-medium p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-text-lighter dark:border-text-tertiary">
              <div className="w-14 h-14 bg-brand-peach rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-xl font-bold text-brand-dark dark:text-white mb-3">Team Collaboration</h3>
              <p className="text-text-secondary dark:text-text-lighter leading-relaxed font-medium">
                Share and manage keys across your team. Role-based access control for better security.
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-brand-dark to-brand-navy rounded-3xl p-12 text-center shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-display text-white mb-4">
              Ready to secure your API keys?
            </h2>
            <p className="text-text-lighter text-lg mb-8 max-w-2xl mx-auto font-medium">
              Join teams that trust our platform for their API key management. 
              Get started in minutes with SSO authentication.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-8 py-4 bg-white text-brand-dark rounded-lg hover:bg-brand-peach transition-colors font-bold text-lg shadow-lg cursor-pointer"
              >
                Start Managing Keys →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-text-lighter dark:border-text-tertiary bg-white/50 dark:bg-brand-navy/50 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔑</span>
              <span className="font-display text-brand-dark dark:text-white">API Key Manager</span>
            </div>
            <p className="text-text-secondary dark:text-text-lighter text-sm font-medium">
              © 2024 API Key Manager. Built with Next.js & Keycloak SSO.
            </p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
