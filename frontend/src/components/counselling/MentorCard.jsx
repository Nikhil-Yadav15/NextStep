"use client";

import React from "react";
import { Star, Clock, Users, Zap } from "lucide-react";

export default function MentorCard({ mentor, onBook, onQuickBook }) {
  return (
    <div className="group relative bg-zinc-950/80 border border-zinc-900/80 rounded-2xl p-6 hover:border-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 backdrop-blur-xl">
      {/* Free / Paid Badge */}
      <div className="absolute top-4 right-4">
        {mentor.isFree ? (
          <span className="px-3 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
            Free
          </span>
        ) : (
          <span className="px-3 py-1 text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
            Premium
          </span>
        )}
      </div>

      {/* Avatar + Info */}
      <div className="flex items-start gap-4 mb-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-cyan-500/25">
            {mentor.avatar ? (
              <img src={mentor.avatar} alt={mentor.name} className="w-full h-full rounded-xl object-cover" />
            ) : (
              mentor.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-zinc-950" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate transition-colors group-hover:text-cyan-300">
            {mentor.name}
          </h3>
          <p className="text-sm text-zinc-400 truncate">{mentor.title}</p>
        </div>
      </div>

      {/* Expertise Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {mentor.expertise?.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="px-2.5 py-1 text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-lg"
          >
            {tag}
          </span>
        ))}
        {mentor.expertise?.length > 4 && (
          <span className="px-2.5 py-1 text-xs text-zinc-500">
            +{mentor.expertise.length - 4} more
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-white font-medium">{mentor.rating || "New"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>{mentor.experience}y exp</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          <span>{mentor.totalSessions} sessions</span>
        </div>
      </div>

      {/* Bio */}
      <p className="text-sm text-zinc-400 line-clamp-2 mb-5">{mentor.bio}</p>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onBook(mentor)}
          className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 transition-all duration-200 active:scale-[0.98]"
        >
          Book Session
        </button>
        {onQuickBook && (
          <button
            onClick={() => onQuickBook(mentor)}
            className="py-2.5 px-4 rounded-xl font-medium text-sm bg-zinc-900 text-zinc-200 border border-zinc-800 hover:bg-zinc-800 transition-all duration-200 active:scale-[0.98] flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4" /> Now
          </button>
        )}
      </div>
    </div>
  );
}
