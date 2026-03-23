"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { PhoneOff, Clock } from "lucide-react";
import { toast } from "sonner";

function getToken() {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("uniquePresence="))
    ?.split("=")[1];
}

function SessionTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-400">
      <Clock className="w-4 h-4" />
      <span className="font-mono">{mins}:{secs}</span>
    </div>
  );
}

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.bookingId;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Participant");
  const [sessionStartTime] = useState(Date.now());
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  // Fetch booking
  useEffect(() => {
    async function load() {
      try {
        const token = getToken();
        const res = await fetch(`/api/bookings/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.status === "error") throw new Error(data.message);
        setBooking(data.data);

        // Get user name from profile
        try {
          const profileRes = await fetch("/api/getProfile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const profileData = await profileRes.json();
          if (profileData.data?.name) setUserName(profileData.data.name);
        } catch {}
      } catch (err) {
        toast.error("Failed to load session");
        router.push("/dashboard/counselling");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bookingId, router]);

  // Initialize Jitsi when booking is loaded
  useEffect(() => {
    if (!booking?.roomId || !jitsiContainerRef.current) return;

    // Load the Jitsi external API script
    const script = document.createElement("script");
    script.src = "https://8x8.vc/vpaas-magic-cookie-ef5ce88c523d41a599c8b1dc5b3ab765/external_api.js";
    script.async = true;
    script.onload = () => {
      if (!window.JitsiMeetExternalAPI) return;

      const roomName = `nextstep-${booking.roomId.replace(/[^a-zA-Z0-9]/g, "")}`;

      const api = new window.JitsiMeetExternalAPI("8x8.vc", {
        roomName: `vpaas-magic-cookie-ef5ce88c523d41a599c8b1dc5b3ab765/${roomName}`,
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: userName,
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          hideConferenceSubject: true,
          disableModeratorIndicator: true,
          enableClosePage: false,
          toolbarButtons: [
            "microphone", "camera", "desktop", "chat",
            "raisehand", "tileview", "hangup",
            "fullscreen", "settings",
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          DEFAULT_BACKGROUND: "#0f172a",
          TOOLBAR_ALWAYS_VISIBLE: true,
          FILM_STRIP_MAX_HEIGHT: 120,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        },
      });

      api.addListener("readyToClose", () => {
        router.push("/dashboard/counselling");
      });

      api.addListener("participantJoined", () => {
        toast.success("Participant joined!");
      });

      jitsiApiRef.current = api;
    };

    document.body.appendChild(script);

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
      // Clean up script
      const existing = document.querySelector('script[src*="8x8.vc"]');
      if (existing) existing.remove();
    };
  }, [booking?.roomId, userName, router]);

  const handleEndCall = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }
    router.push("/dashboard/counselling");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Connecting to session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800/50">
        <div>
          <h2 className="text-sm font-semibold">
            Session with {booking?.mentorName || booking?.userName || "Participant"}
          </h2>
          <p className="text-xs text-slate-400">Room: {booking?.roomId?.slice(0, 8)}...</p>
        </div>
        <div className="flex items-center gap-4">
          <SessionTimer startTime={sessionStartTime} />
          <button
            onClick={handleEndCall}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-all shadow-lg shadow-red-500/30"
          >
            <PhoneOff className="w-4 h-4" /> Leave
          </button>
        </div>
      </div>

      {/* Jitsi Container */}
      <div ref={jitsiContainerRef} className="flex-1 w-full" style={{ minHeight: "calc(100vh - 60px)" }} />
    </div>
  );
}
