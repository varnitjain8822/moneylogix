import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      setAuth(data.user, data.token);
      toast.success('Account created!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-grid bg-glow noise-overlay">
      <div className="fixed top-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-10 animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-2xl">M</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">MoneyLogix</span>
          </h1>
          <p className="text-slate-400 text-sm">AI-Powered Trading Platform</p>
        </div>
        <div className="glass-card p-8 animate-fade-up stagger-2">
          <h2 className="text-xl font-semibold text-white mb-1">Create account</h2>
          <p className="text-sm text-slate-400 mb-6">Start your trading journey</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-glass" placeholder="John Doe" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-glass" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input-glass pr-12" placeholder="••••••••" minLength={6} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-glow w-full flex items-center justify-center gap-2 mt-6">
              {loading ? <div className="spinner" /> : <><span>Create Account</span><ArrowRight size={16} /></>}
            </button>
          </form>
          <p className="text-center mt-6 text-sm text-slate-400">
            Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
