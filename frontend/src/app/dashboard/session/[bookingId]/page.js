"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Mic, MicOff, VideoIcon, VideoOff, PhoneOff, MessageSquare, X, Send, Clock } from "lucide-react";
import { toast } from "sonner";
import { getSocket, disconnectSocket } from "@/lib/socket";
import useWebRTC from "@/hooks/useWebRTC";

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
  const [socketInstance, setSocketInstance] = useState(null);
  const [remotePeer, setRemotePeer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sessionStartTime] = useState(Date.now());
  const [connectionState, setConnectionState] = useState("new");

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const handleRemoteStream = useCallback((stream) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
    }
  }, []);

  const webrtc = useWebRTC({
    socket: socketInstance,
    roomId: booking?.roomId,
    onRemoteStream: handleRemoteStream,
    onConnectionChange: setConnectionState,
  });

  // Fetch booking & validate
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
      } catch (err) {
        toast.error("Failed to load session");
        router.push("/dashboard/counselling");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bookingId, router]);

  // Initialize socket + media when booking is loaded
  useEffect(() => {
    if (!booking?.roomId) return;

    const token = getToken();
    const socket = getSocket(token);
    setSocketInstance(socket);

    // Track if this peer should be the caller
    let shouldMakeOffer = false;
    let peerCount = 0;

    // Start local media
    webrtc.startLocalStream().then((stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      // Join room AFTER media is ready
      socket.emit("join-room", { roomId: booking.roomId });
    }).catch(() => {
      toast.error("Camera/microphone access denied");
      // Still join room even without media
      socket.emit("join-room", { roomId: booking.roomId });
    });

    // Socket event listeners
    socket.on("peer-joined", (data) => {
      peerCount++;
      setRemotePeer(data);
      toast.success(`${data.name} joined the session`);

      // Only the FIRST peer to detect the other initiates the offer
      if (peerCount === 1) {
        shouldMakeOffer = true;
        setTimeout(() => webrtc.makeOffer(), 500);
      }
    });

    socket.on("webrtc-offer", ({ offer }) => {
      webrtc.handleOffer(offer);
    });

    socket.on("webrtc-answer", ({ answer }) => {
      webrtc.handleAnswer(answer);
    });

    socket.on("webrtc-ice-candidate", ({ candidate }) => {
      webrtc.handleIceCandidate(candidate);
    });

    socket.on("peer-left", ({ name }) => {
      toast.info(`${name} left the session`);
      setRemotePeer(null);
    });

    socket.on("session-chat", (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.emit("leave-room", { roomId: booking.roomId });
      socket.off("peer-joined");
      socket.off("webrtc-offer");
      socket.off("webrtc-answer");
      socket.off("webrtc-ice-candidate");
      socket.off("peer-left");
      socket.off("session-chat");
      webrtc.cleanup();
    };
  }, [booking?.roomId]);

  const handleToggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    webrtc.toggleAudio(!newState);
  };

  const handleToggleVideo = () => {
    const newState = !isVideoOff;
    setIsVideoOff(newState);
    webrtc.toggleVideo(!newState);
  };

  const handleEndCall = () => {
    if (socketInstance && booking?.roomId) {
      socketInstance.emit("leave-room", { roomId: booking.roomId });
    }
    webrtc.cleanup();
    router.push("/dashboard/counselling");
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketInstance) return;
    socketInstance.emit("session-chat", { roomId: booking.roomId, message: chatInput });
    setChatInput("");
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
          <p className="text-xs text-slate-400">
            {connectionState === "connected" ? "🟢 Connected" :
             connectionState === "connecting" ? "🟡 Connecting..." :
             "⚪ Waiting for peer..."}
          </p>
        </div>
        <SessionTimer startTime={sessionStartTime} />
      </div>

      {/* Video Area */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        {/* Remote Video (large) */}
        <div className="w-full h-full max-w-4xl aspect-video bg-slate-900 rounded-2xl overflow-hidden relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!remotePeer && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <VideoIcon className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-500">Waiting for the other participant to join...</p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (small, corner) */}
        <div className="absolute bottom-8 right-8 w-48 aspect-video bg-slate-800 rounded-xl overflow-hidden shadow-2xl border border-slate-700/50">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isVideoOff ? "hidden" : ""}`}
          />
          {isVideoOff && (
            <div className="w-full h-full flex items-center justify-center">
              <VideoOff className="w-6 h-6 text-slate-600" />
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="absolute top-0 right-0 w-80 h-full bg-slate-900/95 backdrop-blur-sm border-l border-slate-800/50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
              <h3 className="text-sm font-semibold">Session Chat</h3>
              <button onClick={() => setShowChat(false)} className="p-1 rounded-lg hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`${msg.senderId === getToken() ? "text-right" : ""}`}>
                  <p className="text-xs text-slate-500 mb-0.5">{msg.senderName}</p>
                  <p className={`text-sm px-3 py-2 rounded-lg inline-block max-w-[90%] ${
                    msg.senderId === getToken()
                      ? "bg-blue-600/30 text-blue-100"
                      : "bg-slate-800 text-slate-300"
                  }`}>
                    {msg.message}
                  </p>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800/50 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
              <button type="submit" className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-center gap-4 py-5 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800/50">
        <button
          onClick={handleToggleMute}
          className={`p-4 rounded-full transition-all ${
            isMuted ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-slate-800 text-white border border-slate-700 hover:bg-slate-700"
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={handleToggleVideo}
          className={`p-4 rounded-full transition-all ${
            isVideoOff ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-slate-800 text-white border border-slate-700 hover:bg-slate-700"
          }`}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
        </button>

        <button
          onClick={() => setShowChat(!showChat)}
          className={`p-4 rounded-full transition-all ${
            showChat ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-slate-800 text-white border border-slate-700 hover:bg-slate-700"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        <button
          onClick={handleEndCall}
          className="p-4 rounded-full bg-red-600 text-white hover:bg-red-500 transition-all shadow-lg shadow-red-500/30"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
