"use client";

import React, { useState } from "react";
import { X, Star, Clock, Users, Award, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

function generateNext14Days() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      date: d.toISOString().split("T")[0],
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: d.getDate(),
      month: d.toLocaleDateString("en-US", { month: "short" }),
      isToday: i === 0,
    });
  }
  return days;
}

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
];

export default function MentorDetailModal({ mentor, onClose, onBook }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [dateOffset, setDateOffset] = useState(0);
  const [isBooking, setIsBooking] = useState(false);

  const days = generateNext14Days();
  const visibleDays = days.slice(dateOffset, dateOffset + 7);

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) return;
    setIsBooking(true);
    try {
      const [hours, mins] = selectedTime.split(":").map(Number);
      const endHours = mins === 30 ? hours + 1 : hours;
      const endMins = mins === 30 ? "00" : "30";
      const endTime = `${String(endHours).padStart(2, "0")}:${endMins}`;

      await onBook({
        mentorId: mentor._id,
        mentorName: mentor.name,
        date: selectedDate,
        startTime: selectedTime,
        endTime,
      });
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800/50 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800/50 p-6 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {mentor.avatar ? (
                <img src={mentor.avatar} alt={mentor.name} className="w-full h-full rounded-xl object-cover" />
              ) : (
                mentor.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{mentor.name}</h2>
              <p className="text-sm text-slate-400">{mentor.title}</p>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" />{mentor.rating || "New"}</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{mentor.experience}y</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4" />{mentor.totalSessions} sessions</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Bio */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2">About</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{mentor.bio}</p>
          </div>

          {/* Expertise */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2">Expertise</h3>
            <div className="flex flex-wrap gap-2">
              {mentor.expertise?.map((tag) => (
                <span key={tag} className="px-3 py-1.5 text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Select Date
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDateOffset(Math.max(0, dateOffset - 7))}
                disabled={dateOffset === 0}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 grid grid-cols-7 gap-2">
                {visibleDays.map((day) => (
                  <button
                    key={day.date}
                    onClick={() => { setSelectedDate(day.date); setSelectedTime(null); }}
                    className={`flex flex-col items-center p-2 rounded-xl text-sm transition-all border ${
                      selectedDate === day.date
                        ? "bg-blue-600/20 text-blue-400 border-blue-500/40"
                        : "bg-slate-800/40 text-slate-400 border-slate-800/50 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    <span className="text-xs opacity-75">{day.dayName}</span>
                    <span className="text-lg font-bold">{day.dayNum}</span>
                    <span className="text-xs opacity-75">{day.month}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setDateOffset(Math.min(7, dateOffset + 7))}
                disabled={dateOffset >= 7}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Select Time
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {TIME_SLOTS.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      selectedTime === time
                        ? "bg-blue-600/20 text-blue-400 border-blue-500/40"
                        : "bg-slate-800/40 text-slate-400 border-slate-800/50 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Confirm Booking */}
          {selectedDate && selectedTime && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Confirm Booking</p>
                  <p className="text-sm text-slate-400">
                    {selectedDate} at {selectedTime} with {mentor.name}
                  </p>
                  {!mentor.isFree && (
                    <p className="text-xs text-amber-400 mt-1">💎 This is a premium session</p>
                  )}
                </div>
                <button
                  onClick={handleBook}
                  disabled={isBooking}
                  className="px-6 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
                >
                  {isBooking ? "Booking..." : "Confirm"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
