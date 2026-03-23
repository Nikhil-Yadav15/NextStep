"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Shield, Users, Calendar, Plus, Check, X, RefreshCw, Trash2, Edit, ChevronDown } from "lucide-react";
import { toast } from "sonner";

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
    <form onSubmit={handleSubmit} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white">{initial ? "Edit Mentor" : "Add New Mentor"}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Email *</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email"
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Title</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior IAS Officer"
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Experience (years)</label>
          <input value={form.experience} onChange={(e) => setForm({ ...form, experience: Number(e.target.value) })} type="number" min="0"
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">Bio</label>
        <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3}
          placeholder="Short description about the mentor..."
          className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 resize-none" />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-2">Expertise</label>
        <div className="flex flex-wrap gap-2">
          {EXPERTISE_OPTIONS.map((tag) => (
            <button key={tag} type="button" onClick={() => toggleExpertise(tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                form.expertise.includes(tag)
                  ? "bg-blue-600/20 text-blue-400 border-blue-500/40"
                  : "bg-slate-900/40 text-slate-500 border-slate-800/50 hover:text-white"
              }`}>
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
            className="rounded border-slate-600" />
          Free sessions
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving}
          className="px-5 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-600 text-white disabled:opacity-50 transition-all">
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  // Role check disabled — open access for now
  // if (role !== "admin") { ... }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Admin Panel
            </h1>
            <p className="text-slate-400 text-sm">Manage mentors and booking requests</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab("bookings")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              activeTab === "bookings" ? "bg-purple-600/20 text-purple-400 border-purple-500/40" : "bg-slate-900/40 text-slate-400 border-slate-800/50 hover:text-white"
            }`}>
            <Calendar className="w-4 h-4" /> Bookings
          </button>
          <button onClick={() => setActiveTab("mentors")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              activeTab === "mentors" ? "bg-purple-600/20 text-purple-400 border-purple-500/40" : "bg-slate-900/40 text-slate-400 border-slate-800/50 hover:text-white"
            }`}>
            <Users className="w-4 h-4" /> Mentors
          </button>
        </div>

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              {["pending", "approved", "rejected", "completed", ""].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    statusFilter === s ? "bg-purple-600/20 text-purple-400 border-purple-500/40" : "bg-slate-900/40 text-slate-500 border-slate-800/50 hover:text-white"
                  }`}>
                  {s || "All"}
                </button>
              ))}
            </div>

            {bookings.length > 0 ? bookings.map((b) => (
              <div key={b._id} className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-5 flex items-center justify-between flex-wrap gap-4">
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
          <div className="space-y-4">
            <button onClick={() => { setShowMentorForm(true); setEditingMentor(null); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg">
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
                <div key={m._id} className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-5 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-white font-medium">{m.name}</p>
                    <p className="text-sm text-slate-400">{m.email} | {m.title}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {m.expertise?.map((t) => (
                        <span key={t} className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">{t}</span>
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
