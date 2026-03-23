"use client";

import React, { useState } from "react";
import { X, Star } from "lucide-react";

export default function RatingModal({ booking, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit(booking._id, rating, feedback);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-900/80 rounded-2xl shadow-2xl p-6">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-1">Rate Your Session</h2>
        <p className="text-sm text-zinc-400 mb-6">How was your session with {booking.mentorName}?</p>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-10 h-10 ${
                  star <= (hoverRating || rating)
                    ? "text-amber-400 fill-amber-400"
                    : "text-zinc-600"
                } transition-colors`}
              />
            </button>
          ))}
        </div>

        {/* Feedback */}
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Share your experience (optional)..."
          rows={3}
          className="w-full bg-zinc-900/50 border border-zinc-800/70 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 resize-none mb-4"
        />

        <button
          onClick={handleSubmit}
          disabled={rating === 0 || isSubmitting}
          className="w-full py-2.5 rounded-xl font-medium text-sm bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 disabled:opacity-50 transition-all"
        >
          {isSubmitting ? "Submitting..." : "Submit Rating"}
        </button>
      </div>
    </div>
  );
}
