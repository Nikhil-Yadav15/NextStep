"use client";

import React from "react";
import { Clock, Calendar, CheckCircle, XCircle, Loader2, Video } from "lucide-react";

const STATUS_CONFIG = {
  pending: { label: "Pending", icon: Loader2, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  approved: { label: "Approved", icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  rejected: { label: "Rejected", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
  completed: { label: "Completed", icon: CheckCircle, color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/30" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-slate-500", bg: "bg-slate-500/10 border-slate-500/30" },
};

function isWithinSessionWindow(booking) {
  if (booking.status !== "approved") return false;
  const now = new Date();
  const sessionDate = new Date(`${booking.requestedSlot.date}T${booking.requestedSlot.startTime}`);
  const sessionEnd = new Date(`${booking.requestedSlot.date}T${booking.requestedSlot.endTime}`);
  const windowStart = new Date(sessionDate.getTime() - 10 * 60000); // 10 min early
  return now >= windowStart && now <= sessionEnd;
}

export default function BookingCard({ booking, onJoin, onRate }) {
  const config = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const canJoin = isWithinSessionWindow(booking);

  return (
    <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-xl p-5 hover:border-slate-700/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-white font-semibold">{booking.mentorName}</h4>
          <p className="text-sm text-slate-400">Mentor</p>
        </div>
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.color}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${booking.status === "pending" ? "animate-spin" : ""}`} />
          {config.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          <span>{booking.requestedSlot.date}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>{booking.requestedSlot.startTime} - {booking.requestedSlot.endTime}</span>
        </div>
      </div>

      {booking.adminNote && (
        <p className="text-xs text-slate-500 mb-3 italic">Note: {booking.adminNote}</p>
      )}

      <div className="flex gap-2">
        {canJoin && (
          <button
            onClick={() => onJoin(booking)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Video className="w-4 h-4" />
            Join Session
          </button>
        )}
        {booking.status === "approved" && !canJoin && (
          <span className="text-xs text-slate-500 py-2">
            Join button will appear 10 min before session
          </span>
        )}
        {booking.status === "completed" && !booking.rating && onRate && (
          <button
            onClick={() => onRate(booking)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all"
          >
            Rate Session
          </button>
        )}
      </div>
    </div>
  );
}
