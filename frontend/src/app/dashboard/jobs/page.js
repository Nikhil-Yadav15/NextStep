"use client";
import React, { useState, useEffect } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

export default function JobsPage() {
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState("both");
  const [loading, setLoading] = useState(false);
  const [liJobs, setLiJobs] = useState([]);
  const [nkJobs, setNkJobs] = useState([]);
  const [serpJobs, setSerpJobs] = useState([]); 
  const [error, setError] = useState("");
  const [savedJobs, setSavedJobs] = useState([]);
  const [showSaved, setShowSaved] = useState(false);

  const getUniquePresence = () => {
    if (typeof window === "undefined") return null;
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith("uniquePresence="));
    return match ? match.split("=")[1] : null;
  };

  useEffect(() => {
    const saved = JSON.parse(window.savedJobsData || "[]");
    setSavedJobs(saved);
  }, []);

  const saveToPersistence = (jobs) => {
    window.savedJobsData = JSON.stringify(jobs);
  };

  const fetchJSON = async (url) => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const hint = await res.text();
      throw new Error(`Error ${res.status}: ${hint.slice(0, 160)}`);
    }
    return res.json();
  };

  const onSearch = async () => {
    setError("");
    setLiJobs([]);
    setNkJobs([]);
    setSerpJobs([]);
    setLoading(true);
    try {
      const title = encodeURIComponent(role.trim());
      const loc = encodeURIComponent(location.trim());

      const sources = {
        linkedin: () => fetchJSON(`/api/linkedin?title=${title}&location=${loc}`),
        naukri: () => fetchJSON(`/api/naukri?query=${title}&location=${loc}`),
        serpapi: () => fetchJSON(`/api/serpapi?title=${title}&location=${loc}`),
      };

      if (source === "linkedin") {
        const json = await sources.linkedin();
        setLiJobs(json.jobs || []);
      } else if (source === "naukri") {
        const json = await sources.naukri();
        setNkJobs(json.jobs || []);
      } else if (source === "serpapi") {
        const json = await sources.serpapi();
        setSerpJobs(json.jobs || []);
      } else {
        const [li, nk, sp] = await Promise.all([
          sources.linkedin(),
          sources.naukri(),
          sources.serpapi(),
        ]);
        setLiJobs(li.jobs || []);
        setNkJobs(nk.jobs || []);
        setSerpJobs(sp.jobs || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveJob = async (job, jobSource) => {
    const uniquePresence = getUniquePresence();
    if (!uniquePresence) return alert("You must be logged in!");

    const jobWithSource = { ...job, source: jobSource, savedAt: new Date().toISOString() };
    const jobKey = `${jobSource}-${job.title}-${job.company}`;

    const isAlreadySaved = savedJobs.some(
      (saved) => `${saved.source}-${saved.title}-${saved.company}` === jobKey
    );

    let updatedSaved;
    if (isAlreadySaved) {
      updatedSaved = savedJobs.filter(
        (saved) => `${saved.source}-${saved.title}-${saved.company}` !== jobKey
      );
    } else {
      updatedSaved = [...savedJobs, jobWithSource];

      try {
        await fetch("/api/saveBookmarkedJob", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${uniquePresence}`,
          },
          body: JSON.stringify({
            jobId: job.id || jobKey,
            title: job.title,
            company: job.company || "",
            link: job.url || "",
          }),
        });
      } catch (err) {
        console.error("Error saving job:", err);
      }
    }

    setSavedJobs(updatedSaved);
    saveToPersistence(updatedSaved);
  };

  const isJobSaved = (job, jobSource) => {
    const jobKey = `${jobSource}-${job.title}-${job.company}`;
    return savedJobs.some(
      (saved) => `${saved.source}-${saved.title}-${saved.company}` === jobKey
    );
  };

  const removeSavedJob = (index) => {
    const updatedSaved = savedJobs.filter((_, i) => i !== index);
    setSavedJobs(updatedSaved);
    saveToPersistence(updatedSaved);
  };

  const JobCard = ({ job, jobSource, index }) => {
    const isSaved = isJobSaved(job, jobSource);

    return (
      <li className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            <div className="text-lg font-semibold text-slate-100">
              {job.title}{" "}
              {job.company && <span className="text-slate-400">· {job.company}</span>}
            </div>
            {job.location && <div className="text-sm text-slate-400 mt-1">{job.location}</div>}
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-primary hover:text-primary/80 text-sm transition-colors"
              >
                View job →
              </a>
            )}
          </div>
          <button
            onClick={() => toggleSaveJob(job, jobSource)}
            className={`p-2 rounded-lg transition-all ${
              isSaved
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            }`}
            title={isSaved ? "Remove from goals" : "Save to goals"}
          >
            {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
          </button>
        </div>
      </li>
    );
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </a>
        </div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Find Jobs
          </h1>
          <button
            onClick={() => setShowSaved(!showSaved)}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-white hover:shadow-lg hover:shadow-primary/25 transition-all transform hover:scale-105"
          >
            <Bookmark size={18} />
            My Goals ({savedJobs.length})
          </button>
        </div>

        {showSaved ? (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-slate-100">Saved Jobs</h2>
              <button
                onClick={() => setShowSaved(false)}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Back to Search
              </button>
            </div>
            {savedJobs.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl">
                <Bookmark size={48} className="mx-auto mb-3 opacity-30 text-slate-500" />
                <p className="text-slate-400">No saved jobs yet. Start searching and save jobs to your goals!</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {savedJobs.map((job, i) => (
                  <li key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-3 py-1 rounded-full bg-primary/20 text-primary font-medium border border-primary/30">
                            {job.source}
                          </span>
                        </div>
                        <div className="text-lg font-semibold text-slate-100">
                          {job.title}{" "}
                          {job.company && (
                            <span className="text-slate-400">· {job.company}</span>
                          )}
                        </div>
                        {job.location && (
                          <div className="text-sm text-slate-400 mt-1">{job.location}</div>
                        )}
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-primary hover:text-primary/80 text-sm transition-colors"
                          >
                            View job →
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => removeSavedJob(i)}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                        title="Remove from goals"
                      >
                        <BookmarkCheck size={20} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 mb-4">
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Job role (e.g., Software Engineer)"
                  className="bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  onKeyDown={(e) => e.key === "Enter" && onSearch()}
                />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location (e.g., India)"
                  className="bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                  onKeyDown={(e) => e.key === "Enter" && onSearch()}
                />
                <button
                  onClick={onSearch}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-white hover:shadow-lg hover:shadow-primary/25 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-400">Source:</span>
                {["both", "linkedin", "naukri", "serpapi"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSource(s)}
                    className={`text-sm px-4 py-2 rounded-lg border transition-all ${
                      source === s
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                        : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loading && (
              <div className="mb-6">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-300 font-medium">Searching for jobs...</span>
                    <span className="text-slate-400 text-sm">This may take a moment</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full animate-pulse" style={{ width: "100%" }}></div>
                  </div>
                  <div className="mt-3 text-sm text-slate-400 text-center">
                    Fetching results from LinkedIn, Naukri, and SerpApi...
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-100 mb-4">LinkedIn</h2>
                <ul className="space-y-3">
                  {liJobs.map((j, i) => (
                    <JobCard key={`li-${i}`} job={j} jobSource="linkedin" index={i} />
                  ))}
                  {!loading && !error && liJobs.length === 0 && (
                    <li className="text-slate-500 text-center py-8 bg-slate-900/30 rounded-lg border border-slate-800/30">No LinkedIn results.</li>
                  )}
                </ul>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-100 mb-4">Naukri</h2>
                <ul className="space-y-3">
                  {nkJobs.map((j, i) => (
                    <JobCard key={`nk-${i}`} job={j} jobSource="naukri" index={i} />
                  ))}
                  {!loading && !error && nkJobs.length === 0 && (
                    <li className="text-slate-500 text-center py-8 bg-slate-900/30 rounded-lg border border-slate-800/30">No Naukri results.</li>
                  )}
                </ul>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-100 mb-4">SerpApi (Google Jobs)</h2>
                <ul className="space-y-3">
                  {serpJobs.map((j, i) => (
                    <JobCard key={`sp-${i}`} job={j} jobSource="serpapi" index={i} />
                  ))}
                  {!loading && !error && serpJobs.length === 0 && (
                    <li className="text-slate-500 text-center py-8 bg-slate-900/30 rounded-lg border border-slate-800/30">No SerpApi results.</li>
                  )}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}