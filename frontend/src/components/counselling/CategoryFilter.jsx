"use client";

import React from "react";

const CATEGORIES = [
  "All",
  "IAS / UPSC",
  "IT & Software",
  "Medical",
  "Law",
  "MBA",
  "Engineering",
  "Data Science",
  "Design",
  "Finance",
  "Teaching",
];

export default function CategoryFilter({ selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat || (cat === "All" && !selected);
        return (
          <button
            key={cat}
            onClick={() => onChange(cat === "All" ? null : cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
              isActive
                ? "bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-lg shadow-blue-500/10"
                : "bg-slate-900/40 text-slate-400 border-slate-800/50 hover:text-white hover:border-slate-700"
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
