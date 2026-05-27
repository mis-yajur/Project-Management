import React, { useState } from "react";
import { Lock, User, Kanban, Loader2 } from "lucide-react";
import { api } from "../api";

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in both fields");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(username, password);
      if (res && res.success) {
        onLoginSuccess(res);
      } else {
        setError(res ? res.message : "Invalid username or password");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please check your service is active.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-md rounded-2xl p-8 border border-slate-700/50 shadow-2xl transition-all duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-400 mb-4 border border-blue-500/20">
            <Kanban size={36} className="animate-pulse" />
          </div>
          <h2 className="text-3xl font-display font-bold text-slate-100 tracking-tight">Project Yajur</h2>
          <p className="text-slate-400 text-sm mt-2 font-sans">Automate to Innovate.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 tracking-wide block">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <User size={18} />
              </span>
              <input
                type="text"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 tracking-wide block">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Lock size={18} />
              </span>
              <input
                type="password"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/10 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-700/40 text-center">
          <p className="text-xs text-slate-500 font-mono">Professional Project Management System</p>
        </div>
      </div>
    </div>
  );
}
