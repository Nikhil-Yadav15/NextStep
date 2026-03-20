"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Users, MessageCircle, ArrowLeft } from 'lucide-react';
import { getSocket, disconnectSocket } from '@/lib/socket';

// In-memory cache for the session
const messageCache = {};
const userListCache = { data: null, lastFetch: 0 };

export default function ChatPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserName, setCurrentUserName] = useState(null);
  const [showUserList, setShowUserList] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const scrollLockRef = useRef(false);
  const socketRef = useRef(null);
  const selectedUserRef = useRef(null);

  // Keep selectedUserRef in sync for socket callbacks
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  // --- Auth + initial data ---
  useEffect(() => {
    const uniquePresence = document.cookie
      .split('; ')
      .find(row => row.startsWith('uniquePresence='))
      ?.split('=')[1];

    if (!uniquePresence) {
      setError('Not authenticated. Please log in.');
      setLoading(false);
      return;
    }

    setCurrentUser({ uniquePresence });
    fetchUserData(uniquePresence);
    fetchUsers(uniquePresence);
    setLoading(false);

    // --- Socket connection ---
    const socket = getSocket(uniquePresence);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
      setSocketConnected(true);
      stopPolling();
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setSocketConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('⚠️ Socket connection error:', err.message);
      setSocketConnected(false);
    });

    return () => {
      stopPolling();
      disconnectSocket();
      socketRef.current = null;
    };
  }, []);

  // --- Listen for incoming messages via socket ---
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handleReceiveMessage = (msg) => {
      const current = selectedUserRef.current;
      if (!currentUser) return;

      const isMine = msg.senderId === currentUser.uniquePresence;
      const formatted = {
        senderId: msg.senderId,
        senderName: msg.senderName,
        receiverId: msg.receiverId,
        message: msg.message,
        timestamp: msg.timestamp,
        isRead: msg.isRead,
        isMine,
      };

      // If message is from/to the currently selected conversation, append it
      if (
        current &&
        (msg.senderId === current.uniquePresence || msg.receiverId === current.uniquePresence)
      ) {
        setMessages((prev) => {
          // Dedupe by timestamp + senderId
          const exists = prev.some(
            (m) => m.timestamp === msg.timestamp && m.senderId === msg.senderId && m.message === msg.message
          );
          if (exists) return prev;

          const updated = [...prev, formatted];
          // Update cache
          const cacheKey = `${currentUser.uniquePresence}_${current.uniquePresence}`;
          messageCache[cacheKey] = updated;
          return updated;
        });
        scrollLockRef.current = false;

        // Mark as read if message is from the other user
        if (!isMine) {
          socket.emit('mark_read', { senderId: msg.senderId });
        }
      } else if (!isMine) {
        // Message from someone not currently selected — update unread count
        setUsers((prev) =>
          prev.map((u) =>
            u.uniquePresence === msg.senderId
              ? { ...u, unreadCount: (u.unreadCount || 0) + 1 }
              : u
          )
        );
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [currentUser]);

  // --- Fallback polling when socket is disconnected ---
  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    if (!socketConnected) {
      // Socket down — start polling
      startPolling(selectedUser.uniquePresence);
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [selectedUser, currentUser, socketConnected]);

  // --- Load history when selecting a user ---
  useEffect(() => {
    if (selectedUser && currentUser) {
      scrollLockRef.current = false;
      fetchMessages(selectedUser.uniquePresence);

      // Mark messages as read via socket
      if (socketRef.current?.connected) {
        socketRef.current.emit('mark_read', { senderId: selectedUser.uniquePresence });
      }
    }
  }, [selectedUser, currentUser]);

  // Smooth scroll only when new messages arrive
  useEffect(() => {
    if (!scrollLockRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // --- Polling helpers ---
  const startPolling = (otherUserPresence) => {
    stopPolling();
    pollIntervalRef.current = setInterval(() => {
      fetchMessages(otherUserPresence);
    }, 3000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const fetchUserData = async (uniquePresence) => {
    try {
      const response = await fetch('/api/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${uniquePresence}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentUserName(result.data?.name);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchUsers = async (uniquePresence) => {
    try {
      const now = Date.now();
      if (userListCache.data && now - userListCache.lastFetch < 10000) {
        setUsers(userListCache.data);
        return;
      }

      const response = await fetch('/api/chat', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${uniquePresence}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch users:', response.status);
        return;
      }

      const text = await response.text();
      if (!text) {
        console.error('Empty response from server');
        return;
      }

      const result = JSON.parse(text);
      if (result.status === 'success') {
        const usersData = result.data || [];
        userListCache.data = usersData;
        userListCache.lastFetch = now;
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      if (userListCache.data) {
        setUsers(userListCache.data);
      } else {
        setUsers([]);
      }
    }
  };

  const fetchMessages = useCallback(async (otherUserPresence) => {
    if (!currentUser) return;

    const cacheKey = `${currentUser.uniquePresence}_${otherUserPresence}`;
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentUser.uniquePresence}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otherUser: otherUserPresence }),
      });

      if (!response.ok) {
        console.error('Failed to fetch messages:', response.status);
        if (messageCache[cacheKey]) {
          setMessages(messageCache[cacheKey]);
        }
        return;
      }

      const text = await response.text();
      if (!text) return;

      const result = JSON.parse(text);
      if (result.status === 'success') {
        const formattedMessages = (result.data || []).map(msg => ({
          senderId: msg.senderId,
          senderName: msg.senderName,
          receiverId: msg.receiverId,
          message: msg.message,
          timestamp: msg.timestamp,
          isRead: msg.isRead,
          isMine: msg.senderId === currentUser.uniquePresence,
        }));
        
        messageCache[cacheKey] = formattedMessages;
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      if (messageCache[cacheKey]) {
        setMessages(messageCache[cacheKey]);
      }
    }
  }, [currentUser]);

  const selectUser = (user) => {
    setSelectedUser(user);
    setShowUserList(false);
    scrollLockRef.current = false;

    // Clear unread count for this user
    setUsers((prev) =>
      prev.map((u) =>
        u.uniquePresence === user.uniquePresence ? { ...u, unreadCount: 0 } : u
      )
    );
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !currentUser) return;

    const msgText = newMessage.trim();
    const socket = socketRef.current;

    // Try socket first
    if (socket?.connected) {
      const payload = {
        receiverId: selectedUser.uniquePresence,
        senderName: currentUserName,
        receiverName: selectedUser.name,
        message: msgText,
      };

      setNewMessage('');

      socket.emit('send_message', payload, (response) => {
        if (response?.status === 'success') {
          // Append sent message to local state
          const formatted = {
            senderId: currentUser.uniquePresence,
            senderName: currentUserName,
            receiverId: selectedUser.uniquePresence,
            receiverName: selectedUser.name,
            message: response.data.message,
            timestamp: response.data.timestamp,
            isRead: false,
            isMine: true,
          };
          setMessages((prev) => {
            const updated = [...prev, formatted];
            const cacheKey = `${currentUser.uniquePresence}_${selectedUser.uniquePresence}`;
            messageCache[cacheKey] = updated;
            return updated;
          });
          scrollLockRef.current = false;
        } else {
          console.error('Socket send failed:', response?.message);
          setNewMessage(msgText);
        }
      });
    } else {
      // Fallback to REST
      try {
        const response = await fetch('/api/chat/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentUser.uniquePresence}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receiverId: selectedUser.uniquePresence,
            senderName: currentUserName,
            receiverName: selectedUser.name,
            message: msgText,
          }),
        });

        if (response.ok) {
          setNewMessage('');
          fetchMessages(selectedUser.uniquePresence);
        } else {
          console.error('Failed to send message:', response.status);
        }
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[hsl(222,47%,4%)]">
        <div className="text-center animate-fade-in-up">
          <div className="relative mx-auto mb-6 w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-pulse-ring"></div>
            <div className="absolute inset-2 rounded-full bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-blue-400 animate-pulse" />
            </div>
          </div>
          <p className="text-gray-400 text-sm tracking-wide">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[hsl(222,47%,4%)]">
        <div className="text-center animate-fade-in-up">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-red-500/10 backdrop-blur-sm border border-red-500/20 flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[hsl(222,47%,4%)] overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-600/8 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/5 rounded-full blur-[150px]"></div>
      </div>

      {/* Users List Sidebar */}
      <div className={`${showUserList ? 'w-full md:w-96' : 'hidden md:block md:w-96'} relative z-10 backdrop-blur-xl bg-white/[0.03] border-r border-white/[0.06] flex flex-col overflow-hidden transition-all duration-300`}>
        {/* Sidebar Header */}
        <div className="p-4 flex-shrink-0 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.15] transition-all duration-300 cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-white tracking-tight">Messages</h2>
            </div>
            {socketConnected && (
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                <span className="text-[10px] text-emerald-400/70 font-medium uppercase tracking-wider">Live</span>
              </div>
            )}
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto chatbot-scrollbar">
          {users.length === 0 ? (
            <div className="p-8 text-center animate-fade-in-up">
              <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                <Users className="h-6 w-6 text-gray-600" />
              </div>
              <p className="text-gray-600 text-sm">No users available</p>
            </div>
          ) : (
            users.map((user, index) => (
              <button
                key={user.uniquePresence}
                onClick={() => selectUser(user)}
                style={{ animationDelay: `${index * 50}ms` }}
                className={`w-full p-4 flex items-center gap-3 cursor-pointer transition-all duration-300 border-b border-white/[0.03] group animate-fade-in-up ${
                  selectedUser?.uniquePresence === user.uniquePresence
                    ? 'bg-blue-500/10 border-l-2 border-l-blue-500'
                    : 'hover:bg-white/[0.04] border-l-2 border-l-transparent'
                }`}
              >
                <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-base flex-shrink-0 transition-all duration-300 ${
                  selectedUser?.uniquePresence === user.uniquePresence
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                    : 'bg-gradient-to-br from-gray-700 to-gray-800 group-hover:from-blue-600/80 group-hover:to-blue-700/80'
                }`}>
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`font-medium text-base truncate transition-colors duration-200 ${
                    selectedUser?.uniquePresence === user.uniquePresence ? 'text-blue-100' : 'text-gray-200 group-hover:text-white'
                  }`}>{user.name}</p>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{user.email}</p>
                </div>
                {user.unreadCount > 0 && (
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-30"></div>
                    <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.4)]">
                      {user.unreadCount}
                    </div>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${showUserList ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-hidden relative z-10`}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 backdrop-blur-xl bg-white/[0.03] border-b border-white/[0.06] flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setShowUserList(true)}
                className="md:hidden p-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.1] transition-all duration-300"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-semibold text-white text-sm shadow-[0_0_20px_rgba(59,130,246,0.25)]">
                  {selectedUser.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[hsl(222,47%,4%)]"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-base truncate">{selectedUser.name}</p>
                <p className="text-sm text-gray-500 truncate">{selectedUser.email}</p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 chatbot-scrollbar">
              {messages.length === 0 ? (
                <div className="text-center mt-16 animate-fade-in-up">
                  <div className="mx-auto mb-4 w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-gray-700" />
                  </div>
                  <p className="text-gray-600 text-sm">No messages yet</p>
                  <p className="text-gray-700 text-xs mt-1">Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                  >
                    <div className="max-w-xs lg:max-w-md">
                      {!msg.isMine && (
                        <p className="text-[10px] text-gray-500 mb-1 ml-3 font-medium uppercase tracking-wider">
                          {msg.senderName}
                        </p>
                      )}
                      <div
                        className={`px-4 py-2.5 rounded-2xl backdrop-blur-sm transition-all duration-200 ${
                          msg.isMine
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-sm shadow-[0_4px_20px_rgba(59,130,246,0.25)]'
                            : 'bg-white/[0.06] border border-white/[0.08] text-gray-200 rounded-bl-sm'
                        }`}
                      >
                        <p className="break-words text-base leading-relaxed">{msg.message}</p>
                      </div>
                      <p className={`text-[10px] text-gray-600 mt-1 px-2 ${msg.isMine ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-5 backdrop-blur-xl bg-white/[0.02] border-t border-white/[0.06] flex-shrink-0">
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-5 py-3.5 bg-white/[0.04] border border-white/[0.08] text-white text-base rounded-2xl focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 focus:bg-white/[0.06] placeholder-gray-600 transition-all duration-300"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 hover:shadow-[0_0_25px_rgba(59,130,246,0.35)] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none flex-shrink-0 active:scale-95 cursor-pointer"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center animate-fade-in-up">
              <div className="relative mx-auto mb-6">
                <div className="w-24 h-24 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mx-auto">
                  <MessageCircle className="h-10 w-10 text-gray-700" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                </div>
              </div>
              <p className="text-gray-400 text-sm font-medium">Select a conversation</p>
              <p className="text-gray-600 text-xs mt-1">Choose someone to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}