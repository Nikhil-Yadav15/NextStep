"use client";

import { useRef, useState, useCallback, useEffect } from "react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // TURN servers for cross-network connectivity
    ...(process.env.NEXT_PUBLIC_TURN_URL
      ? [
          {
            urls: process.env.NEXT_PUBLIC_TURN_URL,
            username: process.env.NEXT_PUBLIC_TURN_USERNAME || "",
            credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || "",
          },
        ]
      : [
          // Free Metered TURN servers (works for dev/demo)
          {
            urls: "stun:stun.relay.metered.ca:80",
          },
          {
            urls: "turn:global.relay.metered.ca:80",
            username: "e8dd65b92f6ae982befefdab",
            credential: "aV/V+kTH1yLNSJbr",
          },
          {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "e8dd65b92f6ae982befefdab",
            credential: "aV/V+kTH1yLNSJbr",
          },
          {
            urls: "turn:global.relay.metered.ca:443",
            username: "e8dd65b92f6ae982befefdab",
            credential: "aV/V+kTH1yLNSJbr",
          },
          {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "e8dd65b92f6ae982befefdab",
            credential: "aV/V+kTH1yLNSJbr",
          },
        ]),
  ],
};

export default function useWebRTC({ socket, roomId, onRemoteStream, onConnectionChange }) {
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCaller, setIsCaller] = useState(false);
  const pendingCandidates = useRef([]);

  // Use refs to always have current values in callbacks
  const socketRef = useRef(socket);
  const roomIdRef = useRef(roomId);
  const onRemoteStreamRef = useRef(onRemoteStream);
  const onConnectionChangeRef = useRef(onConnectionChange);

  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { onRemoteStreamRef.current = onRemoteStream; }, [onRemoteStream]);
  useEffect(() => { onConnectionChangeRef.current = onConnectionChange; }, [onConnectionChange]);

  const createPeerConnection = useCallback(() => {
    if (peerConnection.current) return peerConnection.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("webrtc-ice-candidate", {
          roomId: roomIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams?.[0]) {
        onRemoteStreamRef.current?.(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setIsConnected(state === "connected");
      onConnectionChangeRef.current?.(state);
    };

    // Add local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current);
      });
    }

    peerConnection.current = pc;
    return pc;
  }, []);

  const startLocalStream = useCallback(async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      localStream.current = stream;
      return stream;
    } catch (err) {
      console.error("Failed to get local media:", err);
      throw err;
    }
  }, []);

  const makeOffer = useCallback(async () => {
    const pc = createPeerConnection();
    setIsCaller(true);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current?.emit("webrtc-offer", { roomId: roomIdRef.current, offer });
  }, [createPeerConnection]);

  const handleOffer = useCallback(async (offer) => {
    const pc = createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current?.emit("webrtc-answer", { roomId: roomIdRef.current, answer });

    for (const candidate of pendingCandidates.current) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingCandidates.current = [];
  }, [createPeerConnection]);

  const handleAnswer = useCallback(async (answer) => {
    const pc = peerConnection.current;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));

    for (const candidate of pendingCandidates.current) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingCandidates.current = [];
  }, []);

  const handleIceCandidate = useCallback(async (candidate) => {
    const pc = peerConnection.current;
    if (pc?.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      pendingCandidates.current.push(candidate);
    }
  }, []);

  const toggleAudio = useCallback((enabled) => {
    localStream.current?.getAudioTracks().forEach((t) => { t.enabled = enabled; });
  }, []);

  const toggleVideo = useCallback((enabled) => {
    localStream.current?.getVideoTracks().forEach((t) => { t.enabled = enabled; });
  }, []);

  const cleanup = useCallback(() => {
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    peerConnection.current?.close();
    peerConnection.current = null;
    pendingCandidates.current = [];
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    startLocalStream,
    makeOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    toggleAudio,
    toggleVideo,
    cleanup,
    isConnected,
    isCaller,
    localStream,
  };
}
