"use client";

import React from "react";
import { Star, Clock, Users, Award, Zap } from "lucide-react";

export default function MentorCard({ mentor, onBook, onQuickBook }) {
  return (
    <div className="group relative bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-6 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
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
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
            {mentor.avatar ? (
              <img src={mentor.avatar} alt={mentor.name} className="w-full h-full rounded-xl object-cover" />
            ) : (
              mentor.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
            {mentor.name}
          </h3>
          <p className="text-sm text-slate-400 truncate">{mentor.title}</p>
        </div>
      </div>

      {/* Expertise Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {mentor.expertise?.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg"
          >
            {tag}
          </span>
        ))}
        {mentor.expertise?.length > 4 && (
          <span className="px-2.5 py-1 text-xs text-slate-500">
            +{mentor.expertise.length - 4} more
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm text-slate-400">
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
      <p className="text-sm text-slate-400 line-clamp-2 mb-5">{mentor.bio}</p>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onBook(mentor)}
          className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-[0.98]"
        >
          Book Session
        </button>
        {onQuickBook && (
          <button
            onClick={() => onQuickBook(mentor)}
            className="py-2.5 px-4 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500 transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 active:scale-[0.98] flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4" /> Now
          </button>
        )}
      </div>
    </div>
  );
}
