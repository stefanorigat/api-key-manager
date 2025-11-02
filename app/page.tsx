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
        <div className="fixed inset-0 bg-gray-900/30 dark:bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md">
            <div className="relative p-8 pb-6">
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl cursor-pointer"
              >
                ×
              </button>
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">🔐</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wide" style={{ fontFamily: "'Milano Cortina 2026', sans-serif" }}>
                  Login
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Enter your credentials to access the dashboard
                </p>
              </div>
            </div>
            
            <form onSubmit={handleLogin}>
              <div className="px-8 pb-6 space-y-5">
                {loginError && (
                  <div className="px-4 py-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400">{loginError}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                    required
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={loginForm.rememberMe}
                    onChange={(e) => setLoginForm({ ...loginForm, rememberMe: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="rememberMe" className="text-sm text-gray-600 dark:text-gray-300">
                    Remember me
                  </label>
                </div>
              </div>
              
              <div className="px-8 pb-8 space-y-3">
                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-[#2c3e68] text-white font-semibold rounded-md hover:bg-[#1f2d4d] transition-colors cursor-pointer"
                >
                  Login
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
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
                  className="w-full px-6 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-md border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
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

    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-gray-900 dark:via-blue-950 dark:to-gray-900">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10">
        <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#2c3e68] rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔑</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">API Key Manager</span>
          </div>
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-5 py-2.5 bg-[#2c3e68] text-white rounded-lg hover:bg-[#1f2d4d] transition-colors font-medium cursor-pointer"
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <span>🔒</span>
              <span>Enterprise-Grade Security</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Secure API Key Management
              <br />
              <span className="text-blue-600 dark:text-blue-400">Made Simple</span>
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              Manage your API keys with confidence. Built-in SSO authentication, 
              comprehensive tracking, and enterprise security features to keep your keys safe.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-8 py-4 bg-[#2c3e68] text-white rounded-lg hover:bg-[#1f2d4d] transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer"
              >
                Get Started →
              </button>
              <a
                href="#features"
                className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold text-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Features Grid */}
          <div id="features" className="grid md:grid-cols-3 gap-8 mb-20">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">🔐</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">SSO Authentication</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Seamless single sign-on with Keycloak. One login for all your applications with enterprise-grade security.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Real-Time Management</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Create, update, and revoke API keys instantly. Track usage and monitor activity in real-time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">🛡️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Advanced Security</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Environment-based keys, permission controls, and automatic expiration. Security by design.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Usage Analytics</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Track when and where your keys are used. Get insights into API consumption patterns.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">🔄</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Multi-Environment</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Separate keys for development, staging, testing, and production. Keep environments isolated.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Team Collaboration</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Share and manage keys across your team. Role-based access control for better security.
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-[#2c3e68] to-[#1f2d4d] rounded-3xl p-12 text-center shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to secure your API keys?
            </h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Join teams that trust our platform for their API key management. 
              Get started in minutes with SSO authentication.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-8 py-4 bg-white text-[#2c3e68] rounded-lg hover:bg-blue-50 transition-colors font-semibold text-lg shadow-lg cursor-pointer"
              >
                Start Managing Keys →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔑</span>
              <span className="font-semibold text-gray-900 dark:text-white">API Key Manager</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              © 2024 API Key Manager. Built with Next.js & Keycloak SSO.
            </p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
