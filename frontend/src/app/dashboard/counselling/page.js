"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Calendar, Sparkles, RefreshCw, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import MentorCard from "@/components/counselling/MentorCard";
import CategoryFilter from "@/components/counselling/CategoryFilter";
import BookingCard from "@/components/counselling/BookingCard";
import MentorDetailModal from "@/components/counselling/MentorDetailModal";
import RatingModal from "@/components/counselling/RatingModal";

function getToken() {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("uniquePresence="))
    ?.split("=")[1];
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await res.json();
  if (data.status === "error") throw new Error(data.message);
  return data;
}

export default function CounsellingPage() {
  const router = useRouter();
  const [mentors, setMentors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [ratingBooking, setRatingBooking] = useState(null);
  const [activeTab, setActiveTab] = useState("mentors");

  const fetchMentors = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("expertise", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);
      const data = await apiFetch(`/api/mentors?${params}`);
      setMentors(data.data || []);
    } catch (err) {
      console.error("Failed to fetch mentors:", err);
    }
  }, [selectedCategory, searchQuery]);

  const fetchBookings = useCallback(async () => {
    try {
      const data = await apiFetch("/api/bookings");
      setBookings(data.data || []);
    } catch (err) {
      console.error("Failed to fetch bookings:", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchMentors(), fetchBookings()]).finally(() => setLoading(false));
  }, [fetchMentors, fetchBookings]);

  useEffect(() => {
    fetchMentors();
  }, [selectedCategory, searchQuery, fetchMentors]);

  const handleBook = async (bookingData) => {
    try {
      await apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify(bookingData),
      });
      toast.success("Booking request sent! Waiting for admin approval.");
      setSelectedMentor(null);
      fetchBookings();
    } catch (err) {
      toast.error(err.message || "Failed to book session");
    }
  };

  const handleQuickBook = async (mentor) => {
    try {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const startTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const endDate = new Date(now.getTime() + 30 * 60000);
      const endTime = `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;

      const res = await apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          mentorId: mentor._id,
          mentorName: mentor.name,
          date,
          startTime,
          endTime,
        }),
      });

      // Auto-approve it for demo
      if (res.data?._id) {
        await apiFetch(`/api/bookings/${res.data._id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "approved", adminNote: "Auto-approved for demo" }),
        });
      }

      toast.success("Session booked & approved! Check My Bookings to join.");
      fetchBookings();
      setActiveTab("bookings");
    } catch (err) {
      toast.error(err.message || "Quick book failed");
    }
  };

  const handleRate = async (bookingId, rating, feedback) => {
    try {
      await apiFetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        body: JSON.stringify({ rating, feedback }),
      });
      toast.success("Thanks for your feedback!");
      fetchBookings();
    } catch (err) {
      toast.error("Failed to submit rating");
    }
  };

  const handleJoinSession = (booking) => {
    router.push(`/dashboard/session/${booking._id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-xl shadow-cyan-500/30">
            <RefreshCw className="w-7 h-7 text-white animate-spin" />
          </div>
          <p className="text-slate-400">Loading counselling...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-40 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-4 text-xs tracking-[0.2em] uppercase text-zinc-500 font-medium">
          Executive Portal
        </div>

        {/* Header */}
        <div className="mb-8 bg-zinc-950/80 border border-zinc-900/80 rounded-2xl p-6 md:p-7 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
              1:1 Personalized Counselling
            </h1>
          </div>
          <p className="text-zinc-400 max-w-3xl">
            Book exclusive sessions with industry-leading mentors and career strategists to accelerate your professional trajectory.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-zinc-950/80 border border-zinc-900/80 rounded-2xl p-2 w-fit backdrop-blur-xl">
          <button
            onClick={() => setActiveTab("mentors")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              activeTab === "mentors"
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-zinc-900/60 text-zinc-400 border-zinc-800/70 hover:text-zinc-200"
            }`}
          >
            <Users className="w-4 h-4" /> Browse Mentors
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              activeTab === "bookings"
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-zinc-900/60 text-zinc-400 border-zinc-800/70 hover:text-zinc-200"
            }`}
          >
            <Calendar className="w-4 h-4" /> My Bookings
            {bookings.filter((b) => b.status === "pending").length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
                {bookings.filter((b) => b.status === "pending").length}
              </span>
            )}
          </button>
        </div>

        {/* Mentors Tab */}
        {activeTab === "mentors" && (
          <div className="space-y-6">
            {/* Search + Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search mentors by name or expertise..."
                  className="w-full bg-zinc-950/80 border border-zinc-900/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>
            </div>

            <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />

            {/* Mentor Grid */}
            {mentors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {mentors.map((mentor) => (
                  <MentorCard
                    key={mentor._id}
                    mentor={mentor}
                    onBook={setSelectedMentor}
                    onQuickBook={handleQuickBook}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <Users className="w-6 h-6 text-cyan-300" />
                </div>
                <p className="text-zinc-400 text-lg">No mentors found</p>
                <p className="text-zinc-500 text-sm mt-1">Try adjusting your search or filter</p>
              </div>
            )}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            {bookings.length > 0 ? (
              bookings.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  onJoin={handleJoinSession}
                  onRate={setRatingBooking}
                />
              ))
            ) : (
              <div className="text-center py-16">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <Calendar className="w-6 h-6 text-cyan-300" />
                </div>
                <p className="text-zinc-400 text-lg">No bookings yet</p>
                <p className="text-zinc-500 text-sm mt-1">Browse mentors and book your first session!</p>
              </div>
            )}
          </div>
        )}

        <button
          className="fixed right-6 bottom-6 h-12 w-12 rounded-full bg-zinc-900 text-white border border-zinc-800 shadow-lg hover:bg-zinc-800 transition-all"
          type="button"
          aria-label="Open counselling help"
        >
          <MessageCircle className="w-5 h-5 mx-auto" />
        </button>

        {/* Modals */}
        {selectedMentor && (
          <MentorDetailModal
            mentor={selectedMentor}
            onClose={() => setSelectedMentor(null)}
            onBook={handleBook}
          />
        )}
        {ratingBooking && (
          <RatingModal
            booking={ratingBooking}
            onClose={() => setRatingBooking(null)}
            onSubmit={handleRate}
          />
        )}
      </div>
    </div>
  );
}
