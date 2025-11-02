'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { login, logout as authLogout, getCurrentUser, storeSession, User } from '@/lib/auth';
import { initiateSSOLogin, initiateSSOLogout } from '@/lib/sso-auth';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  environment: 'Production' | 'Development' | 'Staging' | 'Testing';
  status: 'Active' | 'Inactive' | 'Revoked' | 'Expired';
  permissions: string[];
}

export default function Dashboard() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    environment: '' as '' | 'Production' | 'Development' | 'Staging' | 'Testing',
    status: '' as '' | 'Active' | 'Inactive' | 'Revoked' | 'Expired',
    permissions: [] as string[],
  });
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [environmentFilter, setEnvironmentFilter] = useState('All');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    rememberMe: true, // Default to persistent session (matches SSO behavior)
  });
  const [loginError, setLoginError] = useState('');

  // Fetch API keys from Supabase
  const fetchApiKeys = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database format to component format
      const transformedData: ApiKey[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        key: item.key,
        createdAt: item.created_at,
        lastUsed: item.last_used,
        environment: item.environment,
        status: item.status,
        permissions: item.permissions || [],
      }));

      setApiKeys(transformedData);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      alert('Failed to load API keys. Please check your Supabase configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication on mount
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      fetchApiKeys();
    } else {
      setShowLoginModal(true);
      setIsLoading(false);
    }
  }, []);

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
      setUser(loggedInUser);
      setShowLoginModal(false);
      setLoginForm({ email: '', password: '', rememberMe: true });
      
      // Fetch API keys after successful login
      fetchApiKeys();
    } catch (error) {
      setLoginError('An error occurred during login');
      console.error('Login error:', error);
    }
  };

  // Handle logout
  const handleLogout = () => {
    // Clear local session first
    authLogout();
    setUser(null);
    setApiKeys([]);
    setIsUserMenuOpen(false);
    
    // Check if user logged in via SSO
    if (user?.authProvider === 'sso') {
      // Redirect to Keycloak logout (will redirect back to home page after)
      initiateSSOLogout(user.idToken);
    } else {
      // For password-based login, redirect to home page
      window.location.href = '/';
    }
  };

  // Generate a random API key
  const generateApiKey = () => {
    const prefix = 'sk_';
    const randomString = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);
    return prefix + randomString;
  };

  // Create new API key
  const handleCreate = async () => {
    if (!formData.name) {
      alert('Please enter a name for the API key');
      return;
    }
    
    if (!formData.environment) {
      alert('Please select an environment');
      return;
    }
    
    if (!formData.status) {
      alert('Please select a status');
      return;
    }

    try {
      const newKeyData = {
        name: formData.name,
        key: formData.key || generateApiKey(),
        created_at: new Date().toISOString(),
        environment: formData.environment,
        status: formData.status,
        permissions: formData.permissions,
      };

      const { data, error } = await supabase
        .from('api_keys')
        .insert([newKeyData])
        .select();

      if (error) throw error;

      // Refresh the list
      await fetchApiKeys();

      setFormData({
        name: '',
        key: '',
        environment: '',
        status: '',
        permissions: [],
      });
      setIsCreating(false);
      alert('API key created successfully!');
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Failed to create API key. Please try again.');
    }
  };

  // Update existing API key
  const handleUpdate = async () => {
    if (!editingId) return;

    if (!formData.name) {
      alert('Please enter a name for the API key');
      return;
    }
    
    if (!formData.environment) {
      alert('Please select an environment');
      return;
    }
    
    if (!formData.status) {
      alert('Please select a status');
      return;
    }

    try {
      const updateData = {
        name: formData.name,
        key: formData.key,
        environment: formData.environment,
        status: formData.status,
        permissions: formData.permissions,
      };

      const { error } = await supabase
        .from('api_keys')
        .update(updateData)
        .eq('id', editingId);

      if (error) throw error;

      // Refresh the list
      await fetchApiKeys();

      setEditingId(null);
      setFormData({
        name: '',
        key: '',
        environment: '',
        status: '',
        permissions: [],
      });
      alert('API key updated successfully!');
    } catch (error) {
      console.error('Error updating API key:', error);
      alert('Failed to update API key. Please try again.');
    }
  };

  // Delete API key
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh the list
      await fetchApiKeys();
      alert('API key deleted successfully!');
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('Failed to delete API key. Please try again.');
    }
  };

  // Start editing
  const startEdit = (key: ApiKey) => {
    setEditingId(key.id);
    setFormData({
      name: key.name,
      key: key.key,
      environment: key.environment,
      status: key.status,
      permissions: key.permissions,
    });
    setIsCreating(false);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({
      name: '',
      key: '',
      environment: '',
      status: '',
      permissions: [],
    });
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (
      selectedKeys.length === 0 ||
      !confirm(`Are you sure you want to delete ${selectedKeys.length} API key(s)?`)
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .in('id', selectedKeys);

      if (error) throw error;

      // Refresh the list
      await fetchApiKeys();
      setSelectedKeys([]);
      alert(`${selectedKeys.length} API key(s) deleted successfully!`);
    } catch (error) {
      console.error('Error deleting API keys:', error);
      alert('Failed to delete API keys. Please try again.');
    }
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedKeys((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  };

  // Toggle all
  const toggleAll = () => {
    if (selectedKeys.length === filteredKeys.length) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(filteredKeys.map((k) => k.id));
    }
  };

  // Filter keys
  const filteredKeys = apiKeys.filter((key) => {
    const matchesSearch =
      key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      key.id.includes(searchQuery);
    const matchesStatus =
      statusFilter === 'All' || key.status === statusFilter;
    const matchesEnvironment =
      environmentFilter === 'All' || key.environment === environmentFilter;
    return matchesSearch && matchesStatus && matchesEnvironment;
  });

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('API key copied to clipboard!');
  };

  // Toggle API key visibility
  const toggleKeyVisibility = (keyId: string) => {
    setRevealedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'Revoked':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Expired':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Get environment badge color
  const getEnvironmentColor = (environment: string) => {
    switch (environment) {
      case 'Production':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Staging':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Development':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Testing':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <>
      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-brand-navy/30 dark:bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-brand-navy rounded-lg shadow-2xl w-full max-w-md">
            <div className="relative p-8 pb-6">
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

      <div className="flex min-h-screen bg-white dark:bg-brand-navy">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-navy text-white flex flex-col">
        <div className="p-6 border-b border-text-tertiary/30">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-peach rounded flex items-center justify-center">
              <span className="text-brand-red font-bold text-xl">🔑</span>
            </div>
            <div>
              <h2 className="font-bold text-base">API Key</h2>
              <p className="text-xs text-text-lighter">Management</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-text-light uppercase tracking-wider mb-3">
              Management
            </div>
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-2.5 rounded-md text-text-lighter hover:bg-brand-medium/50 font-medium"
            >
              <span className="text-lg">🏠</span>
              <span className="text-base">Home</span>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-2.5 rounded-md bg-brand-medium text-white font-medium"
            >
              <span className="text-lg">📋</span>
              <span className="text-base">API Keys</span>
            </Link>
          </div>

          <div className="mt-8">
            <div className="text-xs font-semibold text-text-light uppercase tracking-wider mb-3">
              Settings
            </div>
            <button className="flex items-center gap-3 px-4 py-2.5 rounded-md text-text-lighter hover:bg-brand-medium/50 w-full font-medium">
              <span className="text-lg">⚙️</span>
              <span className="text-base">Settings</span>
            </button>
            <button className="flex items-center gap-3 px-4 py-2.5 rounded-md text-text-lighter hover:bg-brand-medium/50 w-full font-medium">
              <span className="text-lg">📊</span>
              <span className="text-base">Analytics</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-brand-dark border-b border-text-lighter dark:border-text-tertiary px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-display text-brand-dark dark:text-white">
              API Key List
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 bg-brand-blue text-white text-base font-bold rounded-md hover:bg-brand-dark transition-colors"
              >
                + New API Key
              </button>
              
              {/* User Avatar Dropdown */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-10 h-10 bg-brand-peach rounded-full flex items-center justify-center text-brand-red text-sm font-bold">
                      {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </div>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-brand-medium rounded-lg shadow-lg border border-text-lighter dark:border-text-tertiary py-2 z-20">
                        <div className="px-4 py-3 border-b border-text-lighter dark:border-text-tertiary">
                          <p className="text-sm font-bold text-brand-dark dark:text-white">
                            {user.name || 'User'}
                          </p>
                          <p className="text-xs text-text-secondary dark:text-text-lighter truncate font-medium">
                            {user.email}
                          </p>
                        </div>
                        <a
                          href={`${process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER}/account/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full px-4 py-2 text-left text-base text-text-secondary dark:text-text-lighter hover:bg-gray-100 dark:hover:bg-brand-dark flex items-center gap-2 cursor-pointer font-medium"
                        >
                          <span>👤</span>
                          <span>View my profile</span>
                        </a>
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-left text-base text-accent-red hover:bg-gray-100 dark:hover:bg-brand-dark flex items-center gap-2 cursor-pointer font-medium"
                        >
                          <span>🚪</span>
                          <span>Logout</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-brand-dark border-b border-text-lighter dark:border-text-tertiary px-8 py-4">
          <div className="flex items-center gap-4 flex-wrap" suppressHydrationWarning>
            {/* Bulk Actions */}
            {selectedKeys.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 text-base font-bold text-accent-red bg-red-50 dark:bg-accent-red/10 border border-accent-red/30 rounded-md hover:bg-accent-red/20 transition-colors"
              >
                Delete Selected ({selectedKeys.length})
              </button>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-base border border-text-lighter dark:border-text-tertiary rounded-md bg-white dark:bg-brand-medium text-brand-dark dark:text-white focus:ring-2 focus:ring-brand-blue font-medium"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Revoked">Revoked</option>
              <option value="Expired">Expired</option>
            </select>

            {/* Environment Filter */}
            <select
              value={environmentFilter}
              onChange={(e) => setEnvironmentFilter(e.target.value)}
              className="px-3 py-2 text-base border border-text-lighter dark:border-text-tertiary rounded-md bg-white dark:bg-brand-medium text-brand-dark dark:text-white focus:ring-2 focus:ring-brand-blue font-medium"
            >
              <option value="All">All Environments</option>
              <option value="Production">Production</option>
              <option value="Staging">Staging</option>
              <option value="Development">Development</option>
              <option value="Testing">Testing</option>
            </select>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, key, or ID..."
                className="w-full px-4 py-2 text-base border border-text-lighter dark:border-text-tertiary rounded-md bg-white dark:bg-brand-medium text-brand-dark dark:text-white focus:ring-2 focus:ring-brand-blue font-medium"
              />
            </div>

            <span className="text-base text-text-secondary dark:text-text-lighter font-medium">
              {filteredKeys.length} keys
            </span>
          </div>
        </div>

        {/* Create/Edit Form Modal */}
        {(isCreating || editingId) && (
          <div className="fixed inset-0 bg-brand-navy/30 dark:bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-brand-navy rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="relative p-8 pb-6">
                <button
                  onClick={cancelEdit}
                  className="absolute top-6 right-6 text-text-light hover:text-text-tertiary dark:hover:text-text-lighter text-2xl cursor-pointer"
                >
                  ×
                </button>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-16 h-16 bg-brand-peach rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl">🔑</span>
                  </div>
                  <h2 className="text-3xl font-display text-brand-dark dark:text-white uppercase tracking-wide">
                    {editingId ? 'Edit API Key' : 'Create New API Key'}
                  </h2>
                </div>
              </div>
              <div className="px-8 pb-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter API key name"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                    API Key {!editingId && '(optional)'}
                  </label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) =>
                      setFormData({ ...formData, key: e.target.value })
                    }
                    placeholder={!editingId ? 'Leave blank to auto-generate' : 'Enter API key'}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                      Environment
                    </label>
                    <select
                      value={formData.environment}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          environment: e.target.value as any,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm appearance-none bg-no-repeat bg-right pr-10"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                        backgroundPosition: 'right 1rem center',
                      }}
                    >
                      <option value="">Select environment</option>
                      <option value="Development">Development</option>
                      <option value="Staging">Staging</option>
                      <option value="Testing">Testing</option>
                      <option value="Production">Production</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as any })
                      }
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm appearance-none bg-no-repeat bg-right pr-10"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                        backgroundPosition: 'right 1rem center',
                      }}
                    >
                      <option value="">Select status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Revoked">Revoked</option>
                      <option value="Expired">Expired</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="enable-permissions"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="enable-permissions"
                      className="text-sm text-gray-600 dark:text-gray-300"
                    >
                      Also assign specific permissions
                    </label>
                  </div>
                  <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
                    Permissions
                  </label>
                  <div className="flex gap-4">
                    {['read', 'write', 'delete'].map((perm) => (
                      <label key={perm} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                permissions: [...formData.permissions, perm],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                permissions: formData.permissions.filter(
                                  (p) => p !== perm
                                ),
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {perm}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-8 pb-8 flex gap-4">
                <button
                  onClick={cancelEdit}
                  className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingId ? handleUpdate : handleCreate}
                  className="flex-1 px-6 py-3 bg-[#2c3e68] text-white font-semibold rounded-md hover:bg-[#1f2d4d] transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto bg-white dark:bg-gray-800">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading API keys...</p>
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0">
                <tr>
                  <th className="w-12 px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        filteredKeys.length > 0 &&
                        selectedKeys.length === filteredKeys.length
                      }
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  API Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Environment
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Last Used
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                      No API keys found
                    </p>
                  </td>
                </tr>
              ) : (
                filteredKeys.map((apiKey) => (
                  <tr
                    key={apiKey.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedKeys.includes(apiKey.id)}
                        onChange={() => toggleSelection(apiKey.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-mono">
                      {apiKey.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {apiKey.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                          {revealedKeys.has(apiKey.id)
                            ? apiKey.key
                            : `${apiKey.key.substring(0, 7)}${'*'.repeat(Math.max(0, apiKey.key.length - 7))}`}
                        </code>
                        <button
                          onClick={() => copyToClipboard(apiKey.key)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs"
                          title="Copy"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                          title={revealedKeys.has(apiKey.id) ? 'Hide' : 'Show'}
                        >
                          {revealedKeys.has(apiKey.id) ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getEnvironmentColor(
                          apiKey.environment
                        )}`}
                      >
                        {apiKey.environment}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getStatusColor(
                          apiKey.status
                        )}`}
                      >
                        {apiKey.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {apiKey.permissions.map((perm) => (
                          <span
                            key={perm}
                            className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300"
                          >
                            {perm}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {apiKey.createdAt}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {apiKey.lastUsed || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => startEdit(apiKey)}
                          className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(apiKey.id)}
                          className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>

        {/* Footer Stats */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-8 py-4">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Total Keys
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {apiKeys.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Active
              </p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                {apiKeys.filter((k) => k.status === 'Active').length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Inactive
              </p>
              <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                {apiKeys.filter((k) => k.status === 'Inactive').length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Expired
              </p>
              <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                {apiKeys.filter((k) => k.status === 'Expired').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

