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

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    if (!supabase) return;
    
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password: pass
    });
    
    if (error) {
      setMsg(error.message);
      return;
    }
    if (data.user) {
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert([
          { 
            id: data.user.id,
            name: name,
            email: email,
            phone: phone,
            password: pass
          }
        ])
        .select('uniquePresence')
        .single();
      
      if (insertError) {
        setMsg("Account created but failed to save profile: " + insertError.message);
        return;
      }
      
      if (insertData && insertData.uniquePresence) {
        document.cookie = `uniquePresence=${insertData.uniquePresence}; path=/; max-age=31536000; SameSite=Lax`;
      }
      if (data.user.created_at) {
        setMsg("Account created successfully!");
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        setMsg("Check email for verification link");
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-4">
      <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
        Sign up
      </h3>
      <input 
        className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-purple-500 focus:outline-none transition-colors" 
        placeholder="Full Name" 
        value={name} 
        onChange={e=>setName(e.target.value)}
        required
      />
      <input 
        className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-purple-500 focus:outline-none transition-colors" 
        placeholder="Email" 
        type="email"
        value={email} 
        onChange={e=>setEmail(e.target.value)}
        required
      />
      <input 
        className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-purple-500 focus:outline-none transition-colors" 
        placeholder="Phone Number" 
        type="tel"
        value={phone} 
        onChange={e=>setPhone(e.target.value)}
        required
      />
      <input 
        className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-purple-500 focus:outline-none transition-colors" 
        placeholder="Password" 
        type="password" 
        value={pass} 
        onChange={e=>setPass(e.target.value)}
        required
      />
      <button className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
        Create account
      </button>
      {msg && <p className="text-sm text-gray-600 bg-gray-100 p-3 rounded-lg">{msg}</p>}
    </form>
  );
}
