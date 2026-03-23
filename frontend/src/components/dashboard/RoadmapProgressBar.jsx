"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STAGE_LABELS = {
  starting: "Preparing your roadmap...",
  analyzeJob: "Analyzing job requirements",
  generateRoadmap: "Generating learning path",
  incrementIndex: "Moving to next job",
  finalize: "Finalizing roadmaps",
  done: "Complete!",
  error: "Something went wrong",
};

const STAGE_ICONS = {
  starting: "🚀",
  analyzeJob: "🔍",
  generateRoadmap: "🧠",
  incrementIndex: "➡️",
  finalize: "✨",
  done: "🎉",
  error: "❌",
};

const TIPS = [
  "🎯 Analyzing job descriptions to identify key skills...",
  "📚 Finding the best learning resources for you...",
  "🧩 Building a personalized learning path...",
  "⚡ Matching your skills with job requirements...",
  "🌟 Curating top-rated tutorials and courses...",
  "🔗 Connecting the dots between skills...",
  "💡 Pro tip: Bookmark more jobs for richer roadmaps!",
  "🎓 Great things take time — your roadmap is worth the wait!",
  "🏗️ Structuring your learning journey step by step...",
  "🔬 Searching across YouTube, MDN, Coursera and more...",
];

export default function RoadmapProgressBar({ progress = {} }) {
  const { stage, jobIndex = 0, totalJobs = 1, jobTitle, company, progress: pct = 0 } = progress;
  const [tipIndex, setTipIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const stageLabel = STAGE_LABELS[stage] || "Working...";
  const stageIcon = STAGE_ICONS[stage] || "⏳";
  const clampedPct = Math.min(Math.max(pct, 0), 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl shadow-xl p-8 md:p-10 max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          key={stageIcon}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-5xl mb-4"
        >
          {stageIcon}
        </motion.div>
        <AnimatePresence mode="wait">
          <motion.h2
            key={stageLabel}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-xl font-bold text-gray-800"
          >
            {stageLabel}
          </motion.h2>
        </AnimatePresence>
        {jobTitle && stage !== "done" && stage !== "starting" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-gray-500 mt-1"
          >
            {jobTitle}{company ? ` at ${company}` : ""}
          </motion.p>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative mb-6">
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full relative"
            style={{
              background: "linear-gradient(90deg, #3b82f6, #6366f1, #a855f7)",
            }}
            initial={{ width: "0%" }}
            animate={{ width: `${clampedPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
              }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </div>

        {/* Percentage label */}
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-400">{formatTime(elapsed)} elapsed</span>
          <span className="text-sm font-semibold text-indigo-600">{clampedPct}%</span>
        </div>
      </div>

      {/* Job step dots */}
      {totalJobs > 1 && (
        <div className="flex justify-center gap-3 mb-6">
          {Array.from({ length: totalJobs }).map((_, i) => {
            const isComplete = i < jobIndex || stage === "done" || stage === "finalize";
            const isCurrent = i === jobIndex && stage !== "done" && stage !== "finalize";
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
                    isComplete
                      ? "bg-gradient-to-br from-green-400 to-emerald-500 text-white"
                      : isCurrent
                        ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                        : "bg-gray-100 text-gray-400"
                  }`}
                  animate={
                    isCurrent
                      ? { scale: [1, 1.15, 1] }
                      : {}
                  }
                  transition={
                    isCurrent
                      ? { duration: 1.2, repeat: Infinity }
                      : {}
                  }
                >
                  {isComplete ? "✓" : i + 1}
                </motion.div>
                <span className="text-[10px] text-gray-400">Job {i + 1}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Rotating tips */}
      <div className="h-12 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={tipIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="text-sm text-gray-500 text-center"
          >
            {TIPS[tipIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Animated background dots */}
      <div className="flex justify-center gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-indigo-300"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
