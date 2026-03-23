"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import RoadmapProgressBar from "@/components/dashboard/RoadmapProgressBar";

export default function RoadmapPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [roadmaps, setRoadmaps] = useState(null);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});
  const [progressData, setProgressData] = useState(null);
  const [cachedAt, setCachedAt] = useState(null);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    const fetchExistingRoadmap = async () => {
      const uniquePresence = document.cookie
        .split("; ")
        .find((row) => row.startsWith("uniquePresence="))
        ?.split("=")[1];

      if (!uniquePresence) return;

      try {
        setLoading(true);
        const response = await fetch("/api/roadmap", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${uniquePresence}`,
          },
        });

        const data = await response.json();
        if (data.status === "success" && data.data?.roadmaps) {
          setRoadmaps(data.data.roadmaps);
          const firstJobId = Object.keys(data.data.roadmaps)[0];
          setSelectedJob(firstJobId);
          if (data.data?.cachedAt) setCachedAt(data.data.cachedAt);

          if (data.source === "cache") {
            toast.success(t("roadmapPage.toastLoadedSaved"));
          }
        }
      } catch (err) {
        console.warn("No cached roadmap found:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchExistingRoadmap();
  }, []);

  const handleGenerateRoadmap = async (force = false) => {
    setLoading(true);
    setError(null);
    setProgressData(null);

    try {
      const uniquePresence = document.cookie
        .split("; ")
        .find((row) => row.startsWith("uniquePresence="))
        ?.split("=")[1];

      if (!uniquePresence) {
        throw new Error(t("roadmapPage.loginRequired"));
      }

      // First, try non-stream request to check cache (only when not forcing)
      if (!force) {
        const cacheRes = await fetch("/api/roadmap", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${uniquePresence}`,
          },
          body: JSON.stringify({ force: false }),
        });
        const cacheData = await cacheRes.json();
        if (cacheData.status === "success" && cacheData.source === "cache" && cacheData.data?.roadmaps) {
          setRoadmaps(cacheData.data.roadmaps);
          setSelectedJob(Object.keys(cacheData.data.roadmaps)[0]);
          if (cacheData.data?.cachedAt) setCachedAt(cacheData.data.cachedAt);
          toast.success(t("roadmapPage.toastLoadedProfile"));
          setLoading(false);
          return;
        }
      }

      // Use SSE streaming for generation
      const abortController = new AbortController();
      abortRef.current = abortController;

      const response = await fetch("/api/roadmap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${uniquePresence}`,
        },
        body: JSON.stringify({ force, stream: true }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || t("roadmapPage.failedGenerate"));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const dataLine = line.replace(/^data: /, "").trim();
          if (!dataLine) continue;

          try {
            const event = JSON.parse(dataLine);

            if (event.stage === "complete" && event.data?.roadmaps) {
              setRoadmaps(event.data.roadmaps);
              setSelectedJob(Object.keys(event.data.roadmaps)[0]);
              setCachedAt(new Date().toISOString());
              setProgressData({ stage: "done", progress: 100 });
              toast.success(t("roadmapPage.toastGenerated"));
            } else if (event.stage === "error") {
              throw new Error(event.error || t("roadmapPage.failedGenerate"));
            } else {
              setProgressData(event);
            }
          } catch (parseErr) {
            if (parseErr.message !== t("roadmapPage.failedGenerate")) {
              console.warn("SSE parse error:", parseErr);
            } else {
              throw parseErr;
            }
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Error generating roadmap:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
      abortRef.current = null;
      setTimeout(() => setProgressData(null), 1500);
    }
  };

  const handleRegenerate = () => {
    setShowRegenConfirm(false);
    setRoadmaps(null);
    setSelectedJob(null);
    setExpandedSteps({});
    handleGenerateRoadmap(true);
  };

  const formatCachedTime = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const toggleStep = (stepIndex) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepIndex]: !prev[stepIndex]
    }));
  };

  const formatJobTitle = (jobId) => {
    const parts = jobId.split('-');
    const title = parts.slice(1, -1).join(' ');
    const company = parts[parts.length - 1];
    return { title, company };
  };

  const currentRoadmap = selectedJob && roadmaps ? roadmaps[selectedJob] : null;

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-8 text-slate-100">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100 mb-4 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("roadmapPage.back")}
          </button>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent mb-2">
            {t("roadmapPage.title")}
          </h1>
          <p className="text-slate-400 text-lg">
            {t("roadmapPage.subtitle")}
          </p>
        </motion.div>

        <motion.div
          key="roadmap"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
        >
          {!roadmaps ? (
            <AnimatePresence mode="wait">
              {loading && progressData ? (
                <RoadmapProgressBar key="progress" progress={progressData} />
              ) : (
                <motion.div
                  key="generate"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-slate-900/70 border border-slate-800/70 rounded-2xl shadow-xl p-8 md:p-12 text-center"
                >
                  <div className="max-w-2xl mx-auto">
                    <div className="mb-8">
                      <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                        <svg
                          className="w-12 h-12 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                          />
                        </svg>
                      </div>
                      <h2 className="text-2xl font-bold text-slate-100 mb-3">
                        {t("roadmapPage.readyTitle")}
                      </h2>
                      <p className="text-slate-300 mb-2">
                        {t("roadmapPage.readySubtitle")}
                      </p>
                      <p className="text-sm text-slate-400">
                        {t("roadmapPage.readyCaption")}
                      </p>
                    </div>

                    <button
                      onClick={() => handleGenerateRoadmap(false)}
                      disabled={loading}
                      className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-slate-950 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <span className="relative z-10 flex items-center gap-3">
                        {loading ? (
                          <>
                            <svg
                              className="animate-spin h-6 w-6"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            {t("roadmapPage.generating")}
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                              />
                            </svg>
                            {t("roadmapPage.generateRoadmap")}
                          </>
                        )}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg"
                      >
                        <p className="text-red-300 text-sm">{error}</p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-slate-900/70 border border-slate-800/70 rounded-2xl shadow-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Saved Roadmaps</h3>
                  <div className="space-y-2">
                    {Object.keys(roadmaps).map((jobId) => {
                      const info = formatJobTitle(jobId);
                      const active = jobId === selectedJob;
                      return (
                        <button
                          key={jobId}
                          onClick={() => setSelectedJob(jobId)}
                          className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${active
                            ? "bg-cyan-500/15 text-cyan-200 border-cyan-500/30"
                            : "bg-slate-800/40 text-slate-300 border-slate-700/70 hover:bg-slate-800/70"}`}
                        >
                          <p className="text-sm font-medium truncate">{info.title}</p>
                          <p className="text-xs text-slate-400 truncate">{info.company}</p>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setShowRegenConfirm(true)}
                    disabled={loading}
                    className="mt-6 w-full px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800/60 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {loading ? t("roadmapPage.regenerating") : t("roadmapPage.generateNew")}
                  </button>

                  {cachedAt && (
                    <p className="mt-3 text-xs text-slate-400 text-center">
                      Generated {formatCachedTime(cachedAt)}
                    </p>
                  )}

                  <AnimatePresence>
                    {showRegenConfirm && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-4 p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg"
                      >
                        <p className="text-sm text-amber-200 mb-3">
                          This will regenerate all roadmaps. This may take a few minutes.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleRegenerate}
                            className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-950 bg-amber-400 rounded-md hover:bg-amber-300 transition-colors"
                          >
                            Yes, regenerate
                          </button>
                          <button
                            onClick={() => setShowRegenConfirm(false)}
                            className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-3"
              >
                {currentRoadmap && Array.isArray(currentRoadmap) && (
                  <div className="space-y-6">
                    <div className="bg-slate-900/70 border border-slate-800/70 rounded-2xl shadow-lg p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-slate-100 mb-2">
                            {formatJobTitle(selectedJob).title}
                          </h2>
                          <p className="text-slate-400">
                            {formatJobTitle(selectedJob).company} • {currentRoadmap.length} {t("roadmapPage.learningSteps")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {currentRoadmap.map((step, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-slate-900/70 border border-slate-800/70 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                        >
                          <button
                            onClick={() => toggleStep(index)}
                            className="w-full p-6 flex items-start gap-4 text-left hover:bg-slate-800/35 transition-colors"
                          >
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-slate-950 font-bold">
                                {step.step || index + 1}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold text-slate-100 mb-2">{step.title}</h3>
                              <p className="text-slate-400 text-sm mb-3">{step.description}</p>
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-cyan-500/15 text-cyan-200 border border-cyan-500/20 rounded-full text-xs font-medium">
                                  {step.estimatedDuration}
                                </span>
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/15 text-blue-200 border border-blue-500/20 rounded-full text-xs font-medium">
                                  {step.skills?.length || 0} skills
                                </span>
                                {step.resources?.length > 0 && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-sky-500/15 text-sky-200 border border-sky-500/20 rounded-full text-xs font-medium">
                                    {step.resources.length} resources
                                  </span>
                                )}
                              </div>
                            </div>
                            <motion.div
                              animate={{ rotate: expandedSteps[index] ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex-shrink-0"
                            >
                              <svg
                                className="w-6 h-6 text-slate-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </motion.div>
                          </button>

                          <AnimatePresence>
                            {expandedSteps[index] && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="border-t border-slate-800/80"
                              >
                                <div className="p-6 bg-slate-900/50 space-y-4">
                                  {step.skills && step.skills.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-slate-300 mb-3">
                                        Skills You'll Learn
                                      </h4>
                                      <div className="flex flex-wrap gap-2">
                                        {step.skills.map((skill, idx) => (
                                          <span
                                            key={idx}
                                            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
                                          >
                                            {skill}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {step.resources && step.resources.length > 0 && (
                                    <div>
                                      <h4 className="text-sm font-semibold text-slate-300 mb-3">
                                        Learning Resources
                                      </h4>
                                      <div className="space-y-3">
                                        {step.resources.map((resource, idx) => (
                                          <a
                                            key={idx}
                                            href={resource.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block p-4 bg-slate-800/70 border border-slate-700 rounded-lg hover:border-blue-400 transition-all group"
                                          >
                                            <h5 className="font-medium text-slate-100 group-hover:text-blue-300 transition-colors mb-1 line-clamp-1">
                                              {resource.title}
                                            </h5>
                                            {resource.description && (
                                              <p className="text-xs text-slate-400 line-clamp-2">{resource.description}</p>
                                            )}
                                            <p className="text-xs text-blue-300 mt-1 truncate">{resource.url}</p>
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {(!step.resources || step.resources.length === 0) && (
                                    <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                                      <p className="text-sm text-amber-200">
                                        No resources found yet. Try searching for "{step.skills?.[0]}" tutorials online.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
