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
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-zinc-900/60 text-zinc-400 border-zinc-800/70 hover:text-zinc-200 hover:border-zinc-700"
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
