"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { format, parseISO, startOfWeek } from "date-fns";

const COLORS = ["#22d3ee", "#38bdf8", "#60a5fa", "#0ea5e9", "#0284c7", "#0891b2", "#67e8f9"];

const toFiniteNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/* ── shared bento cell ── */
const BentoCell = ({ children, className = "", glow }) => (
  <div
    className={`group relative overflow-hidden rounded-3xl border border-slate-800/70 bg-slate-950/60 p-5 backdrop-blur-xl transition-all duration-300 hover:border-slate-700/80 hover:-translate-y-0.5 ${className}`}
    style={glow ? { boxShadow: `0 0 40px -12px ${glow}` } : undefined}
  >
    {children}
  </div>
);

const BentoLabel = ({ children }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">{children}</p>
);

/* ── tooltip ── */
function CustomTooltip({ active, payload, label, labelFormatter, valueFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl px-4 py-3 shadow-2xl">
      {label && (
        <p className="text-xs text-slate-400 mb-1.5 font-medium">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color || entry.fill }}>
          {valueFormatter ? valueFormatter(entry.value, entry.name) : entry.value}
        </p>
      ))}
    </div>
  );
}

const axisStyle = { fill: "#94a3b8", fontSize: 11 };

export default function Analytics({ interviews = [], skills = [] }) {
  const { t } = useLanguage();
  const uniquePresence = (() => {
    if (typeof window === "undefined") return null;
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith("uniquePresence="));
    return match ? match.split("=")[1] : null;
  })();

  const [data, setData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [topicData, setTopicData] = useState([]);

  useEffect(() => {
    if (!uniquePresence) return;
    const fetchScores = async () => {
      try {
        const res = await fetch("/api/getScores", {
          headers: { Authorization: `Bearer ${uniquePresence}` },
        });
        const payload = await res.json();
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        const sorted = rows.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setData(sorted);

        const weekly = {};
        sorted.forEach((test) => {
          if (!test?.createdAt) return;
          const week = format(startOfWeek(parseISO(test.createdAt)), "MMM d");
          weekly[week] = (weekly[week] || 0) + 1;
        });
        setWeeklyData(Object.entries(weekly).map(([week, count]) => ({ week, count })));

        const tagMap = {};
        sorted.forEach((t) => {
          if (t.tags && Array.isArray(t.tags)) {
            t.tags.forEach((tag) => { tagMap[tag] = (tagMap[tag] || 0) + 1; });
          }
        });
        setTopicData(Object.entries(tagMap).map(([tag, value]) => ({ topic: tag, value })));
      } catch (error) {
        console.error("Failed to load analytics:", error);
        setData([]); setWeeklyData([]); setTopicData([]);
      }
    };
    fetchScores();
  }, [uniquePresence]);

  /* ── derived data ── */
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const scores = data.map((d) => toFiniteNumber(d?.percentage)).filter((p) => p !== null);
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const latest = scores.length > 0 ? scores[scores.length - 1] : 0;
    const trending = scores.length >= 2 ? latest >= scores[scores.length - 2] : true;
    const bestTopic = topicData.length > 0
      ? topicData.reduce((max, t) => (t.value > max.value ? t : max), topicData[0]).topic
      : "\u2014";
    return { avg, total: data.length, bestTopic, trending, latest };
  }, [data, topicData]);

  const distributionData = useMemo(() => {
    if (data.length === 0) return [];
    const buckets = { "0\u201320": 0, "21\u201340": 0, "41\u201360": 0, "61\u201380": 0, "81\u2013100": 0 };
    data.forEach((d) => {
      const p = toFiniteNumber(d?.percentage);
      if (p === null) return;
      if (p <= 20) buckets["0\u201320"]++;
      else if (p <= 40) buckets["21\u201340"]++;
      else if (p <= 60) buckets["41\u201360"]++;
      else if (p <= 80) buckets["61\u201380"]++;
      else buckets["81\u2013100"]++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [data]);

  const radarData = useMemo(() => {
    if (data.length === 0) return [];
    const topicScores = {};
    data.forEach((d) => {
      const score = toFiniteNumber(d?.percentage);
      if (score === null) return;
      const topic = d.topic || "General";
      if (!topicScores[topic]) topicScores[topic] = { sum: 0, count: 0 };
      topicScores[topic].sum += score;
      topicScores[topic].count++;
    });
    return Object.entries(topicScores).map(([topic, { sum, count }]) => ({
      topic: topic.length > 14 ? topic.slice(0, 12) + "\u2026" : topic,
      avgScore: count > 0 ? Math.round(sum / count) : 0,
    })).filter((row) => Number.isFinite(row.avgScore));
  }, [data]);

  const interviewStats = useMemo(() => {
    if (!interviews || interviews.length === 0) return null;
    const completed = interviews.filter((i) => i.reports && i.reports.length > 0).length;
    const total = interviews.length;
    const pct = Math.round((completed / total) * 100);
    return { completed, total, pct };
  }, [interviews]);

  const funnelData = useMemo(() => {
    const skillCount = skills.length;
    const quizCount = data.length;
    const interviewCount = interviews.length;
    const completedCount = interviews.filter((i) => i.reports && i.reports.length > 0).length;
    const passedCount = data.filter((d) => toFiniteNumber(d?.percentage) >= 60).length;
    const stages = [
      { label: t("dashboardAnalytics.funnelSkills"), value: skillCount, color: "#22d3ee" },
      { label: t("dashboardAnalytics.funnelQuizzes"), value: quizCount, color: "#38bdf8" },
      { label: t("dashboardAnalytics.funnelPassed"), value: passedCount, color: "#0ea5e9" },
      { label: t("dashboardAnalytics.funnelInterviews"), value: interviewCount, color: "#0284c7" },
      { label: t("dashboardAnalytics.funnelCompleted"), value: completedCount, color: "#0891b2" },
    ];
    const maxVal = Math.max(...stages.map((s) => s.value), 1);
    return stages.map((s) => ({ ...s, pct: Math.max((s.value / maxVal) * 100, 12) }));
  }, [skills, data, interviews, t]);

  const hasData = data.length > 0 || weeklyData.length > 0 || topicData.length > 0 || interviews.length > 0 || skills.length > 0;

  /* ── empty state ── */
  if (!hasData) {
    return (
      <div className="rounded-3xl border border-slate-800/70 bg-slate-950/60 p-10 mt-6 backdrop-blur-xl">
        <div className="flex flex-col items-center justify-center text-center py-8 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/90 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-300">{t("dashboardAnalytics.emptyTitle")}</p>
            <p className="text-sm text-slate-500 mt-1">{t("dashboardAnalytics.emptySubtitle")}</p>
          </div>
        </div>
      </div>
    );
  }

  /* ────────────────────────────────
     BENTO GRID LAYOUT
     6-column grid, auto rows ~160px
     ──────────────────────────────── */
  return (
    <div className="mt-6 space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-cyan-300 mb-2">
            {t("dashboardAnalytics.title").toUpperCase()}
          </p>
          <h2 className="text-2xl md:text-3xl font-semibold text-white">{t("dashboardAnalytics.title")}</h2>
          <p className="text-sm text-slate-400 mt-1">{t("dashboardAnalytics.subtitle")}</p>
        </div>
      </div>

      {/* ── BENTO GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 auto-rows-[160px]">

        {data.length > 0 && (
          <BentoCell className="col-span-2 md:col-span-4 md:row-span-2" glow="rgba(34,211,238,0.12)">
            <BentoLabel>{t("dashboardAnalytics.performanceTrend")}</BentoLabel>
            <p className="text-xs text-slate-500 mb-2">{t("dashboardAnalytics.performanceTrendDesc")}</p>
            <div className="h-[calc(100%-48px)]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} stroke="#94a3b8" />
                  <XAxis dataKey="createdAt" tickFormatter={(d) => format(parseISO(d), "MMM d")} tick={axisStyle} axisLine={{ stroke: "#1e293b" }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={axisStyle} axisLine={{ stroke: "#1e293b" }} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip labelFormatter={(d) => format(parseISO(d), "PPP")} valueFormatter={(val) => `${val}%`} />} />
                  <Area type="monotone" dataKey="percentage" stroke="#22d3ee" strokeWidth={2.5} fill="url(#scoreGradient)" dot={{ r: 3, fill: "#22d3ee", stroke: "#0f172a", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#22d3ee", stroke: "#67e8f9", strokeWidth: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </BentoCell>
        )}

        {/* KPI: Average Score */}
        {stats && (
          <BentoCell className="col-span-1 md:col-span-2 flex flex-col justify-center items-center text-center" glow="rgba(34,211,238,0.08)">
            <BentoLabel>{t("dashboardAnalytics.avgScore")}</BentoLabel>
            <p className="text-5xl font-bold text-white leading-none mt-1">
              {stats.avg}<span className="text-lg text-slate-500 font-normal">%</span>
            </p>
            <div className="mt-3 h-1.5 w-24 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700" style={{ width: `${stats.avg}%` }} />
            </div>
          </BentoCell>
        )}

        {/* KPI: Total Tests */}
        {stats && (
          <BentoCell className="col-span-1 md:col-span-2 flex flex-col justify-center items-center text-center">
            <BentoLabel>{t("dashboardAnalytics.totalTests")}</BentoLabel>
            <p className="text-5xl font-bold text-white leading-none mt-1">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-2">{t("dashboardAnalytics.performanceTrendDesc")}</p>
          </BentoCell>
        )}

        {/* ─── ROW 3-4: Best Topic + Trend + Topic Donut ─── */}
        {stats && (
          <BentoCell className="col-span-1 md:col-span-2 flex flex-col justify-center">
            <BentoLabel>{t("dashboardAnalytics.bestTopic")}</BentoLabel>
            <p className="text-xl font-bold text-white mt-1 truncate">{stats.bestTopic}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {topicData.slice(0, 3).map((entry, i) => (
                <span key={entry.topic} className="px-2 py-0.5 text-xs md:text-[10px] font-medium rounded-md border" style={{ color: COLORS[i], borderColor: `${COLORS[i]}33`, backgroundColor: `${COLORS[i]}11` }}>
                  {entry.topic}
                </span>
              ))}
            </div>
          </BentoCell>
        )}

        {stats && (
          <BentoCell className="col-span-1 md:col-span-1 flex flex-col justify-center items-center text-center">
            <BentoLabel>{t("dashboardAnalytics.trend")}</BentoLabel>
            <p className="text-4xl font-bold text-white leading-none mt-1">{stats.latest}%</p>
            <div className="mt-2">
              {stats.trending ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-0.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  Up
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-400/10 border border-red-400/20 rounded-full px-2.5 py-0.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                  Down
                </span>
              )}
            </div>
          </BentoCell>
        )}

        {/* Topic Distribution — Donut */}
        {topicData.length > 0 && (
          <BentoCell className="col-span-2 md:col-span-3 md:row-span-2" glow="rgba(56,189,248,0.1)">
            <BentoLabel>{t("dashboardAnalytics.topicDistribution")}</BentoLabel>
            <div className="h-[calc(100%-32px)] flex flex-col">
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={topicData} dataKey="value" nameKey="topic" cx="50%" cy="50%" outerRadius="80%" innerRadius="55%" paddingAngle={3} strokeWidth={0}>
                      {topicData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Pie>
                    <Tooltip content={<CustomTooltip valueFormatter={(val, name) => `${name}: ${val}`} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 justify-center">
                {topicData.map((entry, i) => (
                  <div key={entry.topic} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs md:text-[10px] text-slate-400 truncate max-w-[120px] md:max-w-[80px]">{entry.topic}</span>
                  </div>
                ))}
              </div>
            </div>
          </BentoCell>
        )}

        {/* ─── ROW 5-6: Weekly Frequency + Score Distribution ─── */}
        {weeklyData.length > 0 && (
          <BentoCell className="col-span-2 md:col-span-3 md:row-span-2">
            <BentoLabel>{t("dashboardAnalytics.weeklyFrequency")}</BentoLabel>
            <p className="text-xs text-slate-500 mb-2">{t("dashboardAnalytics.weeklyFrequencyDesc")}</p>
            <div className="h-[calc(100%-48px)]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} stroke="#94a3b8" />
                  <XAxis dataKey="week" tick={axisStyle} axisLine={{ stroke: "#1e293b" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={axisStyle} axisLine={{ stroke: "#1e293b" }} tickLine={false} />
                  <Tooltip content={<CustomTooltip valueFormatter={(val) => `${val} test${val !== 1 ? "s" : ""}`} />} />
                  <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </BentoCell>
        )}

        {distributionData.length > 0 && (
          <BentoCell className="col-span-2 md:col-span-3 md:row-span-2">
            <BentoLabel>{t("dashboardAnalytics.scoreDistribution")}</BentoLabel>
            <p className="text-xs text-slate-500 mb-2">{t("dashboardAnalytics.scoreDistributionDesc")}</p>
            <div className="h-[calc(100%-48px)]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData} barCategoryGap="18%">
                  <defs>
                    <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={1} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} stroke="#94a3b8" />
                  <XAxis dataKey="range" tick={{ ...axisStyle, fontSize: 10 }} axisLine={{ stroke: "#1e293b" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={axisStyle} axisLine={{ stroke: "#1e293b" }} tickLine={false} />
                  <Tooltip content={<CustomTooltip valueFormatter={(val) => `${val} test${val !== 1 ? "s" : ""}`} />} />
                  <Bar dataKey="count" fill="url(#histGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </BentoCell>
        )}

        {/* ─── ROW 7-8: Radar + Interview Ring ─── */}
        {radarData.length >= 3 && (
          <BentoCell className="col-span-2 md:col-span-6 md:row-span-2" glow="rgba(34,211,238,0.08)">
            <BentoLabel>{t("dashboardAnalytics.strengthsWeaknesses")}</BentoLabel>
            <p className="text-xs text-slate-500 mb-1">{t("dashboardAnalytics.strengthsWeaknessesDesc")}</p>
            <div className="h-[calc(100%-44px)]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#334155" strokeOpacity={0.5} />
                  <PolarAngleAxis dataKey="topic" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickCount={5} />
                  <Tooltip content={<CustomTooltip valueFormatter={(val) => `${val}%`} />} />
                  <Radar dataKey="avgScore" stroke="#22d3ee" strokeWidth={2} fill="#22d3ee" fillOpacity={0.15} dot={{ r: 3, fill: "#22d3ee", stroke: "#0f172a", strokeWidth: 2 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </BentoCell>
        )}

        {interviewStats && (
          <BentoCell className="col-span-2 md:col-span-2 md:row-span-2 flex flex-col items-center justify-center text-center" glow="rgba(96,165,250,0.1)">
            <BentoLabel>{t("dashboardAnalytics.interviewCompletion")}</BentoLabel>
            <div className="relative w-32 h-32 my-2">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="url(#ringGradient)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${interviewStats.pct * 3.14} ${314 - interviewStats.pct * 3.14}`} />
                <defs>
                  <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{interviewStats.pct}%</span>
              </div>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-white">{interviewStats.completed}</p>
                <p className="text-xs md:text-[10px] text-slate-500">{t("dashboardAnalytics.completed")}</p>
              </div>
              <div className="w-px bg-slate-800" />
              <div>
                <p className="text-lg font-bold text-white">{interviewStats.total}</p>
                <p className="text-xs md:text-[10px] text-slate-500">{t("dashboardAnalytics.total")}</p>
              </div>
            </div>
          </BentoCell>
        )}

        {/* ─── ROW 9: Learning Pipeline Funnel (full-width) ─── */}
        {funnelData.some((s) => s.value > 0) && (
          <BentoCell className="col-span-2 md:col-span-6 md:row-span-2">
            <BentoLabel>{t("dashboardAnalytics.funnelTitle")}</BentoLabel>
            <p className="text-xs text-slate-500 mb-3">{t("dashboardAnalytics.funnelDesc")}</p>
            <div className="flex flex-col items-center gap-1.5">
              {funnelData.map((stage) => (
                <div key={stage.label} className="w-full flex items-center gap-3 group">
                  <span className="w-20 sm:w-24 text-right text-xs md:text-[11px] font-medium text-slate-500 shrink-0 truncate">
                    {stage.label}
                  </span>
                  <div className="flex-1 flex items-center justify-center">
                    <div
                      className="relative h-9 rounded-lg flex items-center justify-center transition-all duration-500 group-hover:scale-[1.02]"
                      style={{
                        width: `${stage.pct}%`,
                        background: `linear-gradient(135deg, ${stage.color}22, ${stage.color}44)`,
                        border: `1px solid ${stage.color}33`,
                        boxShadow: `0 0 24px ${stage.color}12`,
                      }}
                    >
                      <span className="text-xs font-bold text-white/90">{stage.value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-1.5 pt-3">
              <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-xs md:text-[10px] text-slate-600">{t("dashboardAnalytics.funnelDirection")}</span>
            </div>
          </BentoCell>
        )}

      </div>
    </div>
  );
}
