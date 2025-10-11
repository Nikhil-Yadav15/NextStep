"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from 'next/navigation';

// Supabase client (browser-safe)
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

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    if (!supabase) {
        console.error("Supabase client is not initialized.");
        return;
    }

    console.log("🚀 Form submitted. Creating account...");
    setMsg("Creating account...");

    try {
      // 1️⃣ Sign up user in Supabase Auth
      console.log("1️⃣ Attempting Supabase Auth signup for:", { email });
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass
      });

      console.log("   Supabase Auth response:", { data, error });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("User not created in Supabase Auth");
      console.log("   ✅ Supabase Auth signup successful. User ID:", data.user.id);

      // 2️⃣ Insert user info into Supabase 'users' table
      const userPayload = {
        id: data.user.id,
        name,
        email,
        phone,
        password: pass // Note: Storing plain text passwords is not recommended.
      };
      console.log("2️⃣ Inserting user into 'users' table:", userPayload);
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert([userPayload])
        .select('uniquePresence')
        .single();

      console.log("   Supabase insert response:", { insertData, insertError });
      if (insertError) throw new Error(insertError.message);
      
      const uniquePresence = insertData?.uniquePresence;
      if (!uniquePresence) throw new Error("Failed to get uniquePresence token from insert response");
      console.log("   ✅ User insert successful. uniquePresence token:", uniquePresence);
      
      // Store token in cookie
      document.cookie = `uniquePresence=${uniquePresence}; path=/; max-age=31536000; SameSite=Lax`;
      console.log("   🍪 Cookie 'uniquePresence' set.");

      // 3️⃣ Call MongoDB API to create profile
      const profilePayload = {
        name,
        email,
        phone,
        location: "",
        title: "",
        bio: "",
        linkedin: "",
        github: "",
        website: "",
        joinDate: new Date().toLocaleString("default", { month: "long", year: "numeric" })
      };
      console.log("3️⃣ Calling MongoDB API '/api/saveProfile' with payload:", profilePayload);
      const profileResponse = await fetch("/api/saveProfile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${uniquePresence}`,
        },
        body: JSON.stringify(profilePayload),
      });

      const profileResult = await profileResponse.json();
      console.log("   MongoDB API response:", { status: profileResponse.status, body: profileResult });
      if (profileResult.status !== "success") {
        console.warn("MongoDB profile creation may have failed:", profileResult.message);
      } else {
        console.log("   ✅ MongoDB profile creation successful.");
      }

      // 4️⃣ Success message and redirect
      console.log("✅ All steps completed successfully! Redirecting...");
      setMsg("Account created successfully!");
      setTimeout(() => router.push('/dashboard'), 2000);

    } catch (err) {
      console.error("❌ Signup error caught:", err);
      setMsg(err.message || "Failed to create account");
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
                Sign up
              </h3>
              <p className="text-slate-400 text-sm">Create your account to get started.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Full Name</label>
              <input
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                placeholder="John Doe"
                value={name}
                onChange={e=>setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Email</label>
              <input
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Phone Number</label>
              <input
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                placeholder="+91 9876543210"
                type="tel"
                value={phone}
                onChange={e=>setPhone(e.target.value)}
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
                onChange={e=>setPass(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-white font-semibold shadow-lg hover:shadow-primary/25 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Create Account
            </button>

            {msg && (
              <div className={`text-sm p-3 rounded-lg ${
                msg.includes("successfully") 
                  ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                  : msg.includes("Creating")
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}>
                {msg}
              </div>
            )}

            <p className="text-xs text-slate-500 text-center pt-2">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
            <p className="text-sm text-slate-400">
                Already have an account?{" "}
                <a href="/auth/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
                  Login
                </a>
              </p>
            
          </form>
        </div>
      </div>
    </div>
  );
}