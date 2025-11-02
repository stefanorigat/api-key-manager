import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  name?: string;
  authProvider?: 'local' | 'sso'; // Track authentication method
  idToken?: string; // Store ID token for SSO logout
}

// Login function
export async function login(email: string, password: string): Promise<User | null> {
  try {
    // Fetch user from database
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .limit(1);

    if (error) throw error;
    if (!users || users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      authProvider: 'local',
    };
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

// Store user session
// By default, uses localStorage for persistent sessions (works for both password and SSO logins)
// Set rememberMe=false to use sessionStorage (session expires when browser closes)
export function storeSession(user: User, rememberMe: boolean = true) {
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem('user', JSON.stringify(user));
}

// Get current user from session
export function getCurrentUser(): User | null {
  try {
    // Check both storages
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// Logout function
export function logout() {
  localStorage.removeItem('user');
  sessionStorage.removeItem('user');
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

