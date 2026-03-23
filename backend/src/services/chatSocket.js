import { Server } from "socket.io";
import { MongoClient, ObjectId } from "mongodb";
import { createClient } from "@supabase/supabase-js";

let io = null;
// Map<uniquePresence, Set<socketId>> — supports multiple tabs
const onlineUsers = new Map();

export function initChatSocket(server) {
  const localOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:3001",
  ];

  const configuredOrigins = [
    ...(process.env.CORS_ORIGINS || "").split(","),
    process.env.FRONTEND_URL || "",
  ]
    .map((o) => o.trim())
    .filter(Boolean);

  const allowedOrigins = [...localOrigins, ...configuredOrigins];

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // --- MongoDB connection (reused across socket events) ---
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI not set — chat socket disabled");
    return;
  }

  const mongoClient = new MongoClient(mongoUri);
  let db, chatsCollection, groupsCollection;

  mongoClient
    .connect()
    .then(() => {
      db = mongoClient.db("AI_Interview");
      chatsCollection = db.collection("Chats");
      groupsCollection = db.collection("Groups");
      console.log("✅ Chat socket connected to MongoDB");
    })
    .catch((err) => {
      console.error("❌ Chat socket MongoDB connection failed:", err.message);
    });

  // --- Supabase client for auth ---
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Supabase env vars missing — chat socket auth disabled");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // --- Auth middleware ---
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));

      // Handle mentor: tokens via MongoDB
      if (token.startsWith("mentor:") && db) {
        const mentorId = token.slice(7).trim();
        if (!mentorId) return next(new Error("Invalid mentor token"));
        try {
          const mentor = await db.collection("Mentors").findOne({
            _id: new ObjectId(mentorId),
            status: "active",
          });
          if (!mentor) return next(new Error("Mentor not found"));
          socket.data.user = { id: mentorId, name: mentor.name, email: mentor.email };
          socket.data.uniquePresence = token;
          return next();
        } catch {
          return next(new Error("Invalid mentor token"));
        }
      }

      const { data: user, error } = await supabase
        .from("users")
        .select("id, name, email, uniquePresence")
        .eq("uniquePresence", token)
        .single();

      if (error || !user) return next(new Error("Invalid credentials"));

      socket.data.user = user;
      socket.data.uniquePresence = token;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  // --- Connection handler ---
  io.on("connection", (socket) => {
    const { uniquePresence } = socket.data;
    console.log(`🔌 Socket connected: ${socket.data.user.name} (${socket.id})`);

    // Track online status (multi-tab safe)
    if (!onlineUsers.has(uniquePresence)) {
      onlineUsers.set(uniquePresence, new Set());
    }
    onlineUsers.get(uniquePresence).add(socket.id);

    // Join personal room for targeted messaging
    socket.join(`user:${uniquePresence}`);

    // Auto-join all group rooms user is a member of
    if (groupsCollection) {
      groupsCollection
        .find({ members: uniquePresence })
        .toArray()
        .then((groups) => {
          groups.forEach((g) => {
            socket.join(`group:${g._id.toString()}`);
          });
          if (groups.length > 0) {
            console.log(`📂 ${socket.data.user.name} joined ${groups.length} group rooms`);
          }
        })
        .catch((err) => console.error("❌ Failed to join group rooms:", err.message));
    }

    // Broadcast online status
    socket.broadcast.emit("user_online", { uniquePresence });

    // --- Send message ---
    socket.on("send_message", async (data, ack) => {
      try {
        const { receiverId, senderName, receiverName, message } = data;

        if (!receiverId || !message?.trim()) {
          return ack?.({ status: "error", message: "Invalid payload" });
        }

        if (!chatsCollection) {
          return ack?.({ status: "error", message: "Database not ready" });
        }

        const chatMessage = {
          _id: new ObjectId(),
          senderId: uniquePresence,
          senderName: senderName || socket.data.user.name || "Unknown",
          receiverId,
          receiverName: receiverName || "Unknown",
          message: message.trim(),
          timestamp: new Date(),
          isRead: false,
          conversationId: [uniquePresence, receiverId].sort().join("_"),
        };

        await chatsCollection.insertOne(chatMessage);

        // Emit to receiver's room
        io.to(`user:${receiverId}`).emit("receive_message", chatMessage);

        // Ack to sender with saved message
        ack?.({ status: "success", data: chatMessage });
      } catch (err) {
        console.error("❌ send_message error:", err.message);
        ack?.({ status: "error", message: "Failed to send message" });
      }
    });

    // --- Typing indicator ---
    socket.on("typing", ({ receiverId }) => {
      if (receiverId) {
        io.to(`user:${receiverId}`).emit("user_typing", {
          uniquePresence,
          name: socket.data.user.name,
        });
      }
    });

    // --- Mark messages as read ---
    socket.on("mark_read", async ({ senderId }) => {
      try {
        if (!chatsCollection || !senderId) return;

        await chatsCollection.updateMany(
          { senderId, receiverId: uniquePresence, isRead: false },
          { $set: { isRead: true } }
        );

        // Notify the sender that their messages were read
        io.to(`user:${senderId}`).emit("messages_read", {
          readBy: uniquePresence,
        });
      } catch (err) {
        console.error("❌ mark_read error:", err.message);
      }
    });

    // --- Join group (socket room) ---
    socket.on("join_group", ({ groupId }) => {
      if (groupId) {
        socket.join(`group:${groupId}`);
      }
    });

    // --- Leave group (socket room) ---
    socket.on("leave_group", ({ groupId }) => {
      if (groupId) {
        socket.leave(`group:${groupId}`);
      }
    });

    // --- Send group message ---
    socket.on("send_group_message", async (data, ack) => {
      try {
        const { groupId, senderName, message } = data;

        if (!groupId || !message?.trim()) {
          return ack?.({ status: "error", message: "Invalid payload" });
        }

        if (!chatsCollection || !groupsCollection) {
          return ack?.({ status: "error", message: "Database not ready" });
        }

        // Verify membership
        const group = await groupsCollection.findOne({
          _id: new ObjectId(groupId),
          members: uniquePresence,
        });

        if (!group) {
          return ack?.({ status: "error", message: "Not a group member" });
        }

        const chatMessage = {
          _id: new ObjectId(),
          senderId: uniquePresence,
          senderName: senderName || socket.data.user.name || "Unknown",
          groupId,
          message: message.trim(),
          timestamp: new Date(),
          readBy: [{ userId: uniquePresence, readAt: new Date() }],
        };

        await chatsCollection.insertOne(chatMessage);

        // Emit to all group members (including sender for confirmation)
        io.to(`group:${groupId}`).emit("receive_group_message", chatMessage);

        ack?.({ status: "success", data: chatMessage });
      } catch (err) {
        console.error("❌ send_group_message error:", err.message);
        ack?.({ status: "error", message: "Failed to send group message" });
      }
    });

    // ========== WebRTC Signaling for 1:1 Counselling ==========

    socket.on("join-room", ({ roomId }) => {
      if (!roomId) return;
      const roomKey = `session:${roomId}`;

      // Check who's already in the room BEFORE joining
      const room = io.sockets.adapter.rooms.get(roomKey);
      const existingMembers = room ? [...room].filter((id) => id !== socket.id) : [];

      socket.join(roomKey);

      // Tell existing members about the new joiner
      socket.to(roomKey).emit("peer-joined", {
        uniquePresence,
        name: socket.data.user.name,
        socketId: socket.id,
      });

      // Tell the joiner about existing members (so they know someone is already there)
      for (const memberId of existingMembers) {
        const memberSocket = io.sockets.sockets.get(memberId);
        if (memberSocket) {
          socket.emit("peer-joined", {
            uniquePresence: memberSocket.data.uniquePresence,
            name: memberSocket.data.user.name,
            socketId: memberId,
          });
        }
      }

      console.log(`🎥 ${socket.data.user.name} joined session room: ${roomId} (${existingMembers.length} already in room)`);
    });

    socket.on("leave-room", ({ roomId }) => {
      if (!roomId) return;
      socket.leave(`session:${roomId}`);
      socket.to(`session:${roomId}`).emit("peer-left", {
        uniquePresence,
        name: socket.data.user.name,
      });
      console.log(`🎥 ${socket.data.user.name} left session room: ${roomId}`);
    });

    socket.on("webrtc-offer", ({ roomId, offer }) => {
      if (!roomId || !offer) return;
      socket.to(`session:${roomId}`).emit("webrtc-offer", {
        offer,
        from: socket.id,
        name: socket.data.user.name,
      });
    });

    socket.on("webrtc-answer", ({ roomId, answer }) => {
      if (!roomId || !answer) return;
      socket.to(`session:${roomId}`).emit("webrtc-answer", {
        answer,
        from: socket.id,
      });
    });

    socket.on("webrtc-ice-candidate", ({ roomId, candidate }) => {
      if (!roomId || !candidate) return;
      socket.to(`session:${roomId}`).emit("webrtc-ice-candidate", {
        candidate,
        from: socket.id,
      });
    });

    socket.on("session-chat", ({ roomId, message }) => {
      if (!roomId || !message?.trim()) return;
      io.to(`session:${roomId}`).emit("session-chat", {
        senderId: uniquePresence,
        senderName: socket.data.user.name,
        message: message.trim(),
        timestamp: new Date(),
      });
    });

    // ========== End WebRTC Signaling ==========

    // --- Disconnect ---
    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.data.user.name} (${socket.id})`);

      const sockets = onlineUsers.get(uniquePresence);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(uniquePresence);
          socket.broadcast.emit("user_offline", { uniquePresence });
        }
      }
    });
  });

  console.log("✅ Chat socket.io initialized");
}
