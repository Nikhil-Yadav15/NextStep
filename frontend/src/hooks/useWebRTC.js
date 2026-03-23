"use client";

import { useRef, useState, useCallback, useEffect } from "react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function useWebRTC({ socket, roomId, onRemoteStream, onConnectionChange }) {
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCaller, setIsCaller] = useState(false);
  const pendingCandidates = useRef([]);

  const createPeerConnection = useCallback(() => {
    if (peerConnection.current) return peerConnection.current;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("webrtc-ice-candidate", { roomId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams?.[0]) {
        onRemoteStream?.(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setIsConnected(state === "connected");
      onConnectionChange?.(state);
    };

    // Add local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStream.current);
      });
    }

    peerConnection.current = pc;
    return pc;
  }, [socket, roomId, onRemoteStream, onConnectionChange]);

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
    socket.emit("webrtc-offer", { roomId, offer });
  }, [createPeerConnection, socket, roomId]);

  const handleOffer = useCallback(async (offer) => {
    const pc = createPeerConnection();
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("webrtc-answer", { roomId, answer });

    // Flush pending ICE candidates
    for (const candidate of pendingCandidates.current) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingCandidates.current = [];
  }, [createPeerConnection, socket, roomId]);

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
