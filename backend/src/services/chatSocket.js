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
  let db, chatsCollection;

  mongoClient
    .connect()
    .then(() => {
      db = mongoClient.db("AI_Interview");
      chatsCollection = db.collection("Chats");
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
