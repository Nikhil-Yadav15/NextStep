"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Calendar, Video, Clock, Users, Star, RefreshCw, Shield } from "lucide-react";
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

function isWithinSessionWindow(booking) {
  if (booking.status !== "approved") return false;
  const now = new Date();
  const sessionDate = new Date(`${booking.requestedSlot.date}T${booking.requestedSlot.startTime}`);
  const sessionEnd = new Date(`${booking.requestedSlot.date}T${booking.requestedSlot.endTime}`);
  const windowStart = new Date(sessionDate.getTime() - 10 * 60000);
  return now >= windowStart && now <= sessionEnd;
}

export default function MentorDashboard() {
  const router = useRouter();
  const [mentor, setMentor] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const profileRes = await apiFetch("/api/getProfile");
      const userRole = profileRes.data?.role;
      setRole(userRole);

      // Open access — fetch sessions regardless of role
      try {
        const res = await apiFetch("/api/mentor/sessions");
        setMentor(res.data.mentor);
        setSessions(res.data.sessions || []);
      } catch {
        // No mentor profile linked — that's okay for non-mentor users
      }
    } catch (err) {
      console.error("Mentor dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleJoin = (booking) => {
    router.push(`/dashboard/session/${booking._id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-xl shadow-cyan-500/30">
          <RefreshCw className="w-7 h-7 text-white animate-spin" />
        </div>
      </div>
    );
  }

  // Role check disabled — open access for now
  // if (role !== "mentor") { ... }

  const upcomingSessions = sessions.filter((s) => s.status === "approved");
  const completedSessions = sessions.filter((s) => s.status === "completed");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-xl shadow-cyan-500/30">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
              Mentor Dashboard
            </h1>
            <p className="text-slate-400 text-sm">Welcome back, {mentor?.name}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/25">
              <Users className="w-5 h-5 text-cyan-300" />
            </div>
            <p className="text-2xl font-bold text-white">{mentor?.totalSessions || 0}</p>
            <p className="text-xs text-slate-400">Total Sessions</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/25">
              <Star className="w-5 h-5 text-cyan-300" />
            </div>
            <p className="text-2xl font-bold text-white">{mentor?.rating || "N/A"}</p>
            <p className="text-xs text-slate-400">Rating</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/25">
              <Calendar className="w-5 h-5 text-cyan-300" />
            </div>
            <p className="text-2xl font-bold text-white">{upcomingSessions.length}</p>
            <p className="text-xs text-slate-400">Upcoming</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/25">
              <Clock className="w-5 h-5 text-cyan-300" />
            </div>
            <p className="text-2xl font-bold text-white">{completedSessions.length}</p>
            <p className="text-xs text-slate-400">Completed</p>
          </div>
        </div>

        {/* Upcoming Sessions */}
        <h2 className="text-lg font-semibold text-white mb-4">Upcoming Sessions</h2>
        {upcomingSessions.length > 0 ? (
          <div className="space-y-3 mb-8">
            {upcomingSessions.map((s) => {
              const canJoin = isWithinSessionWindow(s);
              return (
                <div key={s._id} className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-5 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-white font-medium">{s.userName}</p>
                    <p className="text-sm text-slate-400">{s.requestedSlot?.date} | {s.requestedSlot?.startTime} - {s.requestedSlot?.endTime}</p>
                  </div>
                  {canJoin ? (
                    <button onClick={() => handleJoin(s)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/30">
                      <Video className="w-4 h-4" /> Join Session
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500">Join available 10 min before session</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-500 mb-8">No upcoming sessions</p>
        )}

        {/* Completed Sessions */}
        <h2 className="text-lg font-semibold text-white mb-4">Past Sessions</h2>
        {completedSessions.length > 0 ? (
          <div className="space-y-3">
            {completedSessions.map((s) => (
              <div key={s._id} className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-5 flex items-center justify-between opacity-75">
                <div>
                  <p className="text-white font-medium">{s.userName}</p>
                  <p className="text-sm text-slate-400">{s.requestedSlot?.date} | {s.requestedSlot?.startTime} - {s.requestedSlot?.endTime}</p>
                </div>
                {s.rating && (
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span className="text-sm font-medium">{s.rating}/5</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No past sessions yet</p>
        )}
      </div>
    </div>
  );
}
