"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from 'next/navigation';

const supabase = typeof window !== "undefined"
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        auth: {
          storage: {
            getItem: (key) => {
              return document.cookie
                .split('; ')
                .find(row => row.startsWith(key + '='))
                ?.split('=')[1];
            },
            setItem: (key, value) => {
              document.cookie = `${key}=${value}; path=/; max-age=31536000; SameSite=Lax`;
            },
            removeItem: (key) => {
              document.cookie = `${key}=; path=/; max-age=0`;
            },
          },
        },
      }
    )
  : null;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    if (!supabase) return;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) {
      setMsg(error.message);
    } else if (data.session) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('uniquePresence')
        .eq('id', data.user.id)
        .single();
      
      if (userData) {
        document.cookie = `uniquePresence=${userData.uniquePresence}; path=/; max-age=31536000; SameSite=Lax`;
      }
      setMsg("Login successful!");
      router.push('/dashboard');
    } else {
      setMsg("Please check your email to confirm your account.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background blobs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div 
        className="absolute bottom-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: "2s" }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Card with glass effect */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl shadow-2xl p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="text-center space-y-2 mb-8">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Login
              </h3>
              <p className="text-slate-400 text-sm">Welcome back! Please login to your account.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Email</label>
              <input
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Password</label>
              <input
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                placeholder="••••••••"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-white font-semibold shadow-lg hover:shadow-primary/25 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Sign In
            </button>

            {msg && (
              <div className={`text-sm p-3 rounded-lg ${
                msg.includes("successful") 
                  ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                  : msg.includes("check your email")
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}>
                {msg}
              </div>
            )}

            <div className="text-center">
              <a href="#" className="text-sm text-primary hover:text-primary/80 transition-colors">
                Forgot password?
              </a>
            </div>
            <p className="text-sm text-slate-400">
                Don't have an account?{" "}
                <a href="/auth/signup" className="text-primary hover:text-primary/80 transition-colors font-medium">
                  Sign up
                </a>
              </p>

          </form>
        </div>
      </div>
    </div>
  );
}