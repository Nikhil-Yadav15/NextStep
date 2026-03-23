"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MentorLoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const res = await fetch("/api/auth/mentor-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const payload = await res.json();

      if (!res.ok) {
        setMsg(payload?.message || "Login failed");
        return;
      }

      if (payload?.uniquePresence) {
        document.cookie = `uniquePresence=${payload.uniquePresence}; path=/; max-age=31536000; SameSite=Lax`;
      }
      setMsg("Login successful! Redirecting...");
      router.push("/dashboard/mentor");
    } catch (err) {
      if (err instanceof TypeError) {
        setMsg("Could not reach auth API. Check that the server is running.");
      } else {
        setMsg(err?.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background effects */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />

      <div className="w-full max-w-md relative z-10">
        {/* Back to user login */}
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to User Login
        </Link>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl shadow-2xl p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-3 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Mentor Login
              </h3>
              <p className="text-slate-400 text-sm">
                Sign in with your registered email to access your dashboard
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Email</label>
              <input
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
                placeholder="mentor@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password (dummy — not used for authentication) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Password</label>
              <input
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
                placeholder="••••••••"
                type="password"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-lg hover:shadow-emerald-500/25 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? "Signing In..." : "Sign In as Mentor"}
            </button>

            {/* Message */}
            {msg && (
              <div
                className={`text-sm p-3 rounded-lg ${
                  msg.includes("successful") || msg.includes("Redirecting")
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : msg.includes("check your email")
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {msg}
              </div>
            )}

            {/* Info */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                💡 Only registered mentors can login here. If you&apos;re a mentor and don&apos;t have an account yet, 
                please contact the admin to get registered.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
