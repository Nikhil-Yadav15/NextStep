"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Shield, Users, Calendar, Plus, Check, X, RefreshCw, Trash2, Edit, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import ChatbotButton from "@/components/dashboard/Chatbot";

function getToken() {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("uniquePresence="))
    ?.split("=")[1];
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
}

const EXPERTISE_OPTIONS = [
  "IAS / UPSC", "IT & Software", "Medical", "Law", "MBA",
  "Engineering", "Data Science", "Design", "Finance", "Teaching",
];

function MentorForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    email: initial?.email || "",
    title: initial?.title || "",
    bio: initial?.bio || "",
    experience: initial?.experience || 0,
    expertise: initial?.expertise || [],
    isFree: initial?.isFree !== false,
    pricePerSession: initial?.pricePerSession || 0,
  });
  const [saving, setSaving] = useState(false);

  const toggleExpertise = (tag) => {
    setForm((prev) => ({
      ...prev,
      expertise: prev.expertise.includes(tag)
        ? prev.expertise.filter((t) => t !== tag)
        : [...prev.expertise, tag],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800/80 bg-slate-950/55 p-6 space-y-4 shadow-lg backdrop-blur-xl">
      <h3 className="text-lg font-semibold text-white">{initial ? "Edit Mentor" : "Add New Mentor"}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Email *</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email"
            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior IAS Officer"
            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors" />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Experience (years)</label>
          <input value={form.experience} onChange={(e) => setForm({ ...form, experience: Number(e.target.value) })} type="number" min="0"
            className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors" />
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-1">Bio</label>
        <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3}
          placeholder="Short description about the mentor..."
          className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors resize-none" />
      </div>

      <div>
        <label className="block text-sm text-slate-300 mb-2">Expertise</label>
        <div className="flex flex-wrap gap-2">
          {EXPERTISE_OPTIONS.map((tag) => (
            <button key={tag} type="button" onClick={() => toggleExpertise(tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                form.expertise.includes(tag)
                  ? "bg-cyan-500/15 text-cyan-300 border-cyan-400/40"
                  : "bg-slate-900/40 text-slate-500 border-slate-800/50 hover:text-white"
              }`}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
            className="rounded border-slate-600" />
          Free sessions
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving}
          className="px-5 py-2 rounded-lg text-sm font-medium bg-cyan-600 text-white disabled:opacity-50 transition-all hover:bg-cyan-500">
          {saving ? "Saving..." : initial ? "Update Mentor" : "Add Mentor"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-400 hover:text-white transition-all">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMentorForm, setShowMentorForm] = useState(false);
  const [editingMentor, setEditingMentor] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [role, setRole] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const profileRes = await apiFetch("/api/getProfile");
      const userRole = profileRes.data?.role;
      setRole(userRole);

      // Open access — skip role check

      const [bRes, mRes] = await Promise.all([
        apiFetch(`/api/admin/bookings?status=${statusFilter}`),
        apiFetch("/api/admin/mentors"),
      ]);
      setBookings(bRes.data || []);
      setMentors(mRes.data || []);
    } catch (err) {
      console.error("Admin fetch error:", err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBookingAction = async (id, status, adminNote = "") => {
    try {
      await apiFetch(`/api/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, adminNote }),
      });
      toast.success(`Booking ${status}`);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddMentor = async (form) => {
    try {
      await apiFetch("/api/admin/mentors", {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("Mentor added!");
      setShowMentorForm(false);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdateMentor = async (form) => {
    try {
      await apiFetch(`/api/admin/mentors/${editingMentor._id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      toast.success("Mentor updated!");
      setEditingMentor(null);
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteMentor = async (id) => {
    if (!confirm("Deactivate this mentor?")) return;
    try {
      await apiFetch(`/api/admin/mentors/${id}`, { method: "DELETE" });
      toast.success("Mentor deactivated");
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a12] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // Role check disabled — open access for now
  // if (role !== "admin") { ... }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070a12] text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-slate-950/80" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-25" />
      <ChatbotButton />

      <div className="relative z-10 container mx-auto px-4 py-8 space-y-8 max-w-7xl">
        {/* Header */}
        <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-7 shadow-[0_18px_60px_-25px_rgba(2,132,199,0.45)] backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div>
              <p className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-cyan-300 mb-2">
                ADMIN CONTROL
              </p>
              <h1 className="text-3xl font-semibold leading-tight text-white">
                Admin Panel
              </h1>
              <p className="text-sm text-slate-400 mt-1">Manage mentors and booking requests</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setActiveTab("bookings")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              activeTab === "bookings" ? "bg-cyan-500/15 text-cyan-300 border-cyan-400/40" : "bg-slate-900/40 text-slate-400 border-slate-800/50 hover:text-white"
            }`}>
            <Calendar className="w-4 h-4" /> Bookings
          </button>
          <button onClick={() => setActiveTab("mentors")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              activeTab === "mentors" ? "bg-cyan-500/15 text-cyan-300 border-cyan-400/40" : "bg-slate-900/40 text-slate-400 border-slate-800/50 hover:text-white"
            }`}>
            <Users className="w-4 h-4" /> Mentors
          </button>
        </div>

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-xl space-y-4">
            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              {["pending", "approved", "rejected", "completed", ""].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    statusFilter === s ? "bg-cyan-500/15 text-cyan-300 border-cyan-400/40" : "bg-slate-900/40 text-slate-500 border-slate-800/50 hover:text-white"
                  }`}>
                  {s || "All"}
                </button>
              ))}
            </div>

            {bookings.length > 0 ? bookings.map((b) => (
              <div key={b._id} className="rounded-2xl border border-slate-800/80 bg-slate-950/55 p-5 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/40 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-white font-medium">{b.userName} <span className="text-slate-500">→</span> {b.mentorName}</p>
                  <p className="text-sm text-slate-400">{b.requestedSlot?.date} | {b.requestedSlot?.startTime} - {b.requestedSlot?.endTime}</p>
                  <p className="text-xs text-slate-500 mt-1">Status: <span className="capitalize">{b.status}</span></p>
                </div>
                {b.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleBookingAction(b._id, "approved")}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all">
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button onClick={() => {
                      const reason = prompt("Rejection reason (optional):");
                      handleBookingAction(b._id, "rejected", reason || "");
                    }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all">
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            )) : (
              <p className="text-center text-slate-500 py-12">No bookings found</p>
            )}
          </div>
        )}

        {/* Mentors Tab */}
        {activeTab === "mentors" && (
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-xl space-y-4">
            <button onClick={() => { setShowMentorForm(true); setEditingMentor(null); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-500 transition-all shadow-lg">
              <Plus className="w-4 h-4" /> Add Mentor
            </button>

            {(showMentorForm && !editingMentor) && (
              <MentorForm onSave={handleAddMentor} onCancel={() => setShowMentorForm(false)} />
            )}

            {editingMentor && (
              <MentorForm initial={editingMentor} onSave={handleUpdateMentor} onCancel={() => setEditingMentor(null)} />
            )}

            <div className="space-y-3">
              {mentors.map((m) => (
                <div key={m._id} className="rounded-2xl border border-slate-800/80 bg-slate-950/55 p-5 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/40 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-white font-medium">{m.name}</p>
                    <p className="text-sm text-slate-400">{m.email} | {m.title}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {m.expertise?.map((t) => (
                        <span key={t} className="px-2 py-0.5 text-xs bg-cyan-500/10 text-cyan-300 border border-cyan-400/20 rounded">{t}</span>
                      ))}
                    </div>
                    <p className="text-xs mt-1 text-slate-500">
                      Status: <span className={m.status === "active" ? "text-emerald-400" : "text-red-400"}>{m.status}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingMentor(m); setShowMentorForm(false); }}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteMentor(m._id)}
                      className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
