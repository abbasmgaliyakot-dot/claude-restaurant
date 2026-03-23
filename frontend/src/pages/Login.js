import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { username, password });
      const { token, role, name } = res.data;
      login({ username, role, name }, token);
      if (role === 'admin') navigate('/admin');
      else if (role === 'reception') navigate('/reception');
      else navigate('/staff');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{background: 'linear-gradient(135deg, #0f1923 0%, #1a2a3a 50%, #0f1923 100%)'}}>
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full opacity-20 blur-3xl" style={{background: 'radial-gradient(circle, #C9A961, transparent)'}} />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full opacity-20 blur-3xl" style={{background: 'radial-gradient(circle, #2a7a6a, transparent)'}} />

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-2xl" style={{background: 'linear-gradient(135deg, #C9A961, #8B6914)'}}>
            <span className="text-4xl">🍽️</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight" style={{fontFamily: "'Georgia', serif"}}>TableOrder</h1>
          <p className="text-sm mt-1" style={{color: '#C9A961'}}>Restaurant Management System</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 shadow-2xl border border-white/10" style={{background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)'}}>
          <h2 className="text-white text-xl font-semibold mb-6 text-center">Sign In</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-widest mb-1.5 block" style={{color: '#C9A961'}}>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none transition-all border border-white/10 focus:border-yellow-500/50"
                style={{background: 'rgba(255,255,255,0.08)'}}
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-widest mb-1.5 block" style={{color: '#C9A961'}}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-12 rounded-xl px-4 text-white text-sm outline-none transition-all border border-white/10 focus:border-yellow-500/50"
                style={{background: 'rgba(255,255,255,0.08)'}}
                placeholder="Enter password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 mt-2 disabled:opacity-60"
              style={{background: 'linear-gradient(135deg, #C9A961, #8B6914)', color: '#fff', boxShadow: '0 4px 20px rgba(201,169,97,0.4)'}}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-xs mt-4" style={{color: 'rgba(255,255,255,0.3)'}}>
            Default: admin / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
