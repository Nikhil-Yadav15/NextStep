"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Upload,
  Target,
  FileText,
  CheckCircle,
  Sparkles,
  Briefcase,
  Map,
  Video,
  FileQuestion,
  ArrowUpRight,
} from "lucide-react";
import DashboardNav from "@/components/layout/Dashboardnav";
import ChatbotButton from "@/components/dashboard/Chatbot";
import Analytics from "@/components/dashboard/Analytics";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function DashboardPage() {
  const { t } = useLanguage();
  const backendApiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const toFiniteNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const [file, setFile] = useState(null);
  const [goals, setGoals] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [skills, setSkills] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [quizScores, setQuizScores] = useState([]);
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error'|'info' }

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchDashboardData = async () => {
    const uniquePresence = document.cookie
      .split('; ')
      .find(row => row.startsWith('uniquePresence='))
      ?.split('=')[1];

    let profileName = null;

    if (uniquePresence) {
      // Fetch profile for skills (and get userName for interview filtering)
      try {
        const res = await fetch('/api/getProfile', {
          headers: { 'Authorization': `Bearer ${uniquePresence}` }
        });
        const data = await res.json();
        if (data.status === 'success') {
          setSkills(data.data.skills || []);
          profileName = data.data.name || null;
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }

      // Fetch quiz scores
      try {
        const res = await fetch('/api/getScores', {
          headers: { 'Authorization': `Bearer ${uniquePresence}` }
        });
        const data = await res.json();
        if (data.status === 'success') {
          setQuizScores(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching scores:', err);
      }
    }

    // Fetch interviews from backend (filtered by userName if available)
    try {
      const url = profileName
        ? `${backendApiBase}/interviews?userName=${encodeURIComponent(profileName)}`
        : `${backendApiBase}/interviews`;
      const res = await fetch(url);
      const data = await res.json();
      setInterviews(Array.isArray(data) ? data : (data.interviews || []));
    } catch (err) {
      console.error('Error fetching interviews:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!isProcessing) { setProcessingStep(0); return; }
    const interval = setInterval(() => {
      setProcessingStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 3500);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const processingSteps = [
    { label: t("dashboardHome.processingStepExtract") || "Extracting document data", icon: "📄" },
    { label: t("dashboardHome.processingStepAnalyze") || "Analyzing content with AI", icon: "🧠" },
    { label: t("dashboardHome.processingStepMatch") || "Matching skills & goals", icon: "🎯" },
    { label: t("dashboardHome.processingStepFinalize") || "Finalizing results", icon: "✨" },
  ];

  const completedInterviews= interviews.filter(i => i.reports && i.reports.length > 0).length;
  const numericQuizScores = quizScores
    .map((s) => toFiniteNumber(s?.percentage))
    .filter((n) => n !== null);
  const avgQuizScore = numericQuizScores.length > 0
    ? Math.round(numericQuizScores.reduce((sum, n) => sum + n, 0) / numericQuizScores.length)
    : 0;

  const spotlightCards = [
    {
      title: t("dashboardHome.spotlightJobsTitle"),
      description: t("dashboardHome.spotlightJobsDesc"),
      metric: `${skills.length > 0 ? skills.length : 0} ${t("dashboardHome.skillSignalsMetric")}`,
      link: "/dashboard/jobs",
      icon: <Briefcase className="h-5 w-5" />,
    },
    {
      title: t("dashboardHome.spotlightRoadmapTitle"),
      description: t("dashboardHome.spotlightRoadmapDesc"),
      metric: goals.trim() ? t("dashboardHome.goalsDetected") : t("dashboardHome.setGoals"),
      link: "/dashboard/roadmap",
      icon: <Map className="h-5 w-5" />,
    },
    {
      title: t("dashboardHome.spotlightInterviewTitle"),
      description: t("dashboardHome.spotlightInterviewDesc"),
      metric: `${completedInterviews}/${interviews.length} ${t("dashboardHome.completed")}`,
      link: "/dashboard/interview",
      icon: <Video className="h-5 w-5" />,
    },
    {
      title: t("dashboardHome.spotlightQuizTitle"),
      description: t("dashboardHome.spotlightQuizDesc"),
      metric: quizScores.length > 0 ? `${avgQuizScore}% ${t("dashboardHome.avgScore")}` : t("dashboardHome.noAttemptsYet"),
      link: "/dashboard/quiz",
      icon: <FileQuestion className="h-5 w-5" />,
    },
  ];

  const features = [
    {
      title: t("dashboardHome.featureJobsTitle"),
      description: t("dashboardHome.featureJobsDesc"),
      link: "/dashboard/jobs",
      icon: <Briefcase className="w-5 h-5" />,
    },
    {
      title: t("dashboardHome.featureRoadmapTitle"),
      description: t("dashboardHome.featureRoadmapDesc"),
      link: "/dashboard/roadmap",
      icon: <Map className="w-5 h-5" />,
    },
    {
      title: t("dashboardHome.featureInterviewTitle"),
      description: t("dashboardHome.featureInterviewDesc"),
      link: "/dashboard/interview",
      icon: <Video className="w-5 h-5" />,
    },
    {
      title: t("dashboardHome.featureQuizTitle"),
      description: t("dashboardHome.featureQuizDesc"),
      link: "/dashboard/quiz",
      icon: <FileQuestion className="w-5 h-5" />,
    },
    {
      title: t("dashboardHome.featureResumeTitle"),
      description: t("dashboardHome.featureResumeDesc"),
      link: "/dashboard/resume",
      icon: <FileText className="w-5 h-5" />,
    },
     {
      title: t("dashboardHome.featureChatTitle"),
      description: t("dashboardHome.featureChatDesc"),
      link: "/dashboard/chat",
      icon: <Sparkles className="w-5 h-5" />,
    }
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
      } else {
        showToast(t("dashboardHome.alertUploadType"), 'error');
        e.target.value = '';
      }
    }
  };

  const handleProcess = async () => {
    if (!file && !goals.trim()) {
      showToast(t("dashboardHome.alertDocOrGoals"), 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const uniquePresence = document.cookie
        .split('; ')
        .find(row => row.startsWith('uniquePresence='))
        ?.split('=')[1];

      let extractedText = null;

      if (file) {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const extractResponse = await fetch('/api/extract-text', {
            method: 'POST',
            body: formData,
          });

          if (!extractResponse.ok) {
            throw new Error(t("dashboardHome.alertExtractFailed"));
          }

          const extractData = await extractResponse.json();
          extractedText = extractData.text;
          
        } catch (error) {
          console.error('Error extracting text:', error);
          showToast(t("dashboardHome.alertProcessingDocument"), 'error');
          setIsProcessing(false);
          return;
        }
      }

      const apiCalls = [];
      const processingBody = {};
      
      if (extractedText) {
        processingBody.fileName = file.name;
        processingBody.fileSize = file.size;
        processingBody.doc_text = extractedText;
      }
      if (goals.trim()) {
        processingBody.goals = goals;
      }
      apiCalls.push(
        fetch('/api/user/processing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${uniquePresence}`
          },
          body: JSON.stringify(processingBody),
        })
      );

      if (extractedText && jobDescription.trim()) {
        const atsBody = {
          doc_text: extractedText,
          jobDescription: jobDescription.trim(),
          fileName: file.name
        };

        apiCalls.push(
          fetch('/api/user/ats-check', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${uniquePresence}`
            },
            body: JSON.stringify(atsBody),
          })
        );
      }

      const results = await Promise.allSettled(apiCalls);
      console.log('API call results:', results);

      const processingResult = results[0];
      if (processingResult.status === 'fulfilled') {
        const data = await processingResult.value.json();
        if (!processingResult.value.ok) {
          if (processingResult.value.status === 401) {
            showToast(`${t("dashboardHome.alertAuthFailed")}: ` + (data.error || t("dashboardHome.unauthorized")), 'error');
          } else if (processingResult.value.status === 429) {
            showToast(`${t("dashboardHome.alertRateLimit")} ${data.retryAfter || t("dashboardHome.aWhile")} ${t("dashboardHome.seconds")}.`, 'error');
          } else {
            showToast(`${t("dashboardHome.alertProcessingError")}: ${data.error || t("dashboardHome.somethingWrong")}`, 'error');
          }
        } else {
          console.log('Processing API Response:', data);
        }
      } else {
        console.error('Processing API failed:', processingResult.reason);
        showToast(t("dashboardHome.alertApiFailed"), 'error');
      }

      if (results.length > 1) {
        const atsResult = results[1];
        if (atsResult.status === 'fulfilled') {
          const atsData = await atsResult.value.json();
          if (!atsResult.value.ok) {
            console.error('ATS Check Error:', atsData);
            showToast(`${t("dashboardHome.alertAtsError")}: ${atsData.error || t("dashboardHome.somethingWrong")}`, 'error');
          } else {
            console.log('ATS Check Response:', atsData);
            showToast(`${t("dashboardHome.alertSuccessAts")} ${atsData.data.atsAnalysis.matchScore}%`, 'success');
          }
        } else {
          console.error('ATS Check failed:', atsResult.reason);
          showToast(t("dashboardHome.alertAtsFailedSaved"), 'error');
        }
      }

      if (results[0].status === 'fulfilled') {
        showToast(t("dashboardHome.alertProcessingCompleted"), 'success');
        setFile(null);
        setGoals('');
        setJobDescription('');
        setShowUploadSection(false);
        // Re-fetch profile data to reflect newly parsed skills/goals
        fetchDashboardData();
      }

    } catch (error) {
      console.error('Error calling API:', error);
      showToast(t("dashboardHome.alertRequestError"), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070a12] text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_15%,rgba(56,189,248,0.22),transparent_38%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.2),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(15,23,42,0.9),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(120deg,rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(210deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:44px_44px] opacity-25" />
      <ChatbotButton />

      {/* Toast notification */}
      {toast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className={`pointer-events-auto flex items-center gap-3 px-6 py-5 rounded-2xl shadow-2xl backdrop-blur-md border max-w-md animate-fade-in-up ${
            toast.type === 'success'
              ? 'bg-green-950/80 border-green-500/40 text-green-200'
              : toast.type === 'error'
                ? 'bg-red-950/80 border-red-500/40 text-red-200'
                : 'bg-slate-900/80 border-primary/40 text-blue-200'
          }`}>
            <span className="text-lg">
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <p className="text-sm font-medium">{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-auto text-slate-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>
        </div>
      )}
      
      <div className="relative z-10 container mx-auto px-4 py-8 space-y-8">
        <DashboardNav />

        <div className="rounded-3xl border border-slate-800/70 bg-slate-950/70 p-7 shadow-[0_18px_60px_-25px_rgba(2,132,199,0.45)] backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-cyan-300">
                {t("dashboardHome.commandCenter")}
              </p>
              <h1 className="text-3xl font-semibold leading-tight text-white md:text-5xl">
                {t("dashboardHome.welcome")}
              </h1>
              <p className="max-w-3xl text-sm text-slate-300 md:text-base">
                {t("dashboardHome.subtitle")}
              </p>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[360px]">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{t("dashboardHome.profileActivity")}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{quizScores.length + interviews.length}</p>
                <p className="mt-1 text-xs text-slate-400">{t("dashboardHome.totalTrackedSessions")}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">{t("dashboardHome.skillSignals")}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{skills.length}</p>
                <p className="mt-1 text-xs text-slate-400">{t("dashboardHome.skillsCaptured")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/65 p-5 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/40">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{t("dashboardHome.cardQuizzes")}</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15">
                <FileText className="h-5 w-5 text-cyan-300" />
              </div>
            </div>
            <p className="text-3xl font-semibold text-white">{quizScores.length}</p>
            <p className="mt-1 text-sm text-slate-400">{quizScores.length > 0 ? `${avgQuizScore}% ${t("dashboardHome.avgScore")}` : t("dashboardHome.noQuizzes")}</p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/65 p-5 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/40">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{t("dashboardHome.cardInterviews")}</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15">
                <svg className="h-5 w-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-semibold text-white">{interviews.length}</p>
            <p className="mt-1 text-sm text-slate-400">{completedInterviews} {t("dashboardHome.completed")}</p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/65 p-5 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/40">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{t("dashboardHome.cardSkills")}</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15">
                <CheckCircle className="h-5 w-5 text-cyan-300" />
              </div>
            </div>
            <p className="text-3xl font-semibold text-white">{skills.length}</p>
            <p className="mt-1 text-sm text-slate-400">{skills.length > 0 ? `${skills.slice(0, 3).join(', ')}` : t("dashboardHome.noSkills")}</p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/65 p-5 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/40">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{t("dashboardHome.platformModules")}</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15">
                <Sparkles className="h-5 w-5 text-cyan-300" />
              </div>
            </div>
            <p className="text-3xl font-semibold text-white">{features.length}</p>
            <p className="mt-1 text-sm text-slate-400">{t("dashboardHome.activeAiFeatures")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{t("dashboardHome.workflowModules")}</h2>
                  <p className="mt-1 text-sm text-slate-400">{t("dashboardHome.workflowModulesSubtitle")}</p>
                </div>
                <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  {t("dashboardHome.live")}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {spotlightCards.map((card) => (
                  <Link
                    key={card.title}
                    href={card.link}
                    className="group rounded-2xl border border-slate-800/80 bg-slate-950/55 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-400/40"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                        {card.icon}
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-slate-500 transition-colors group-hover:text-cyan-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.description}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.11em] text-cyan-300">{card.metric}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5 backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">{t("dashboardHome.additionalLinks")}</h3>
            <p className="mt-1 text-sm text-slate-400">{t("dashboardHome.additionalLinksSubtitle")}</p>

            <div className="mt-4 space-y-2.5">
              {features.map((feature) => (
                <Link
                  key={feature.link}
                  href={feature.link}
                  className="group flex items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-950/50 px-3 py-3 transition-all hover:border-cyan-400/30"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">
                    {feature.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">{feature.title}</p>
                    <p className="truncate text-xs text-slate-400">{feature.description}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-500 transition-colors group-hover:text-cyan-300" />
                </Link>
              ))}
            </div>
          </aside>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/70 p-7 shadow-2xl backdrop-blur-xl">
  {/* Processing overlay */}
  {isProcessing && (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-8 rounded-3xl bg-slate-950/92 backdrop-blur-md animate-fade-in-up">
      {/* Orbiting dots around a central icon */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-300/20 animate-pulse-ring" />
        <div className="absolute inset-[-8px] rounded-full border border-dashed border-cyan-300/30 animate-spin" style={{ animationDuration: '6s' }} />
        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50 animate-orbit" />
        <div className="absolute w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 animate-orbit-reverse" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-xl shadow-cyan-500/30">
          <Sparkles className="w-7 h-7 text-white animate-pulse" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-64 space-y-3">
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="relative h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-500 transition-all duration-700 ease-out"
            style={{ width: `${((processingStep + 1) / processingSteps.length) * 100}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>
        <p className="text-xs text-slate-500 text-center">
          {processingStep + 1} / {processingSteps.length}
        </p>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-3 w-72">
        {processingSteps.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 ${
              i < processingStep
                ? 'bg-green-500/10 border border-green-500/20'
                : i === processingStep
                  ? 'bg-cyan-500/10 border border-cyan-400/30 shadow-lg shadow-cyan-400/10'
                  : 'bg-slate-800/30 border border-slate-800/50 opacity-40'
            }`}
            style={i <= processingStep ? { animationDelay: `${i * 150}ms` } : {}}
          >
            <span className="text-lg w-6 text-center">
              {i < processingStep ? '✓' : step.icon}
            </span>
            <span className={`text-sm font-medium ${
              i < processingStep
                ? 'text-green-400'
                : i === processingStep
                  ? 'text-white'
                  : 'text-slate-500'
            }`}>
              {step.label}
            </span>
            {i === processingStep && (
              <div className="ml-auto flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )}

  <div className="mb-6 flex items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15">
        <FileText className="h-5 w-5 text-cyan-300" />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-white">{t("dashboardHome.docTitle")}</h2>
        <p className="text-slate-400">{t("dashboardHome.docSubtitle")}</p>
      </div>
    </div>
    <button
      onClick={() => setShowUploadSection((prev) => !prev)}
      className="rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-cyan-300"
    >
      {showUploadSection ? t("dashboardHome.hide") : t("dashboardHome.open")}
    </button>
  </div>

  <div className={`space-y-6 transition-all duration-800 overflow-hidden ${
    showUploadSection 
      ? 'max-h-[2000px] opacity-100 translate-y-0' 
      : 'max-h-0 opacity-0 -translate-y-4'
  }`}>
    <div>
      <label className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <Upload className="w-4 h-4" />
        {t("dashboardHome.uploadResume")}
      </label>
      <input
        type="file"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx"
        className="block w-full text-sm text-slate-400
          file:mr-4 file:py-3 file:px-6
          file:rounded-lg file:border-0
          file:text-sm file:font-semibold
          file:bg-cyan-500 file:text-slate-950
          hover:file:bg-cyan-400
          border border-slate-800 rounded-lg
          bg-slate-950/50
          focus:outline-none focus:border-cyan-400 transition-colors"
      />
      {file && (
        <div className="mt-3 rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-3">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-cyan-300">{t("dashboardHome.selected")}</span> {file.name}
            <span className="text-slate-500 ml-2">({(file.size / 1024).toFixed(2)} KB)</span>
          </p>
        </div>
      )}
    </div>

    <div>
      <label className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <Target className="w-4 h-4" />
        {t("dashboardHome.yourGoals")}
      </label>
      <textarea
        value={goals}
        onChange={(e) => setGoals(e.target.value)}
        placeholder={t("dashboardHome.yourGoalsPlaceholder")}
        rows={4}
        className="w-full px-4 py-3 border border-slate-800 rounded-lg
          bg-slate-950/50 text-white placeholder-slate-500
          focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors resize-none"
      />
    </div>

    <div>
      <label className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        {t("dashboardHome.jobDescription")}
      </label>
      <textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        placeholder={t("dashboardHome.jobDescriptionPlaceholder")}
        rows={5}
        className="w-full px-4 py-3 border border-slate-800 rounded-lg
          bg-slate-950/50 text-white placeholder-slate-500
          focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors resize-none"
      />
      {file && jobDescription.trim() && (
        <p className="mt-3 text-sm text-green-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {t("dashboardHome.atsParallel")}
        </p>
      )}
    </div>

    <button
      onClick={handleProcess}
      disabled={isProcessing}
      className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4 font-bold text-slate-950
        hover:shadow-lg hover:shadow-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900
        transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
        transform hover:scale-[1.02] active:scale-[0.98]"
    >
      {t("dashboardHome.processDocument")}
    </button>
  </div>
</div>

        <Analytics interviews={interviews} skills={skills} />

      </div>
    </div>
  );
}
