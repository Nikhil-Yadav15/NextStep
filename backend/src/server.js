import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve("./.env") }); 

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({limit: "50mb"}));

app.get('/', (req, res) => {
  res.send('API Working... 😭');
})

try {
  const { default: interviewsRouter } = await import("./routes/interviews.js");
  app.use("/interviews", interviewsRouter);
} catch (error) {
  console.error("Failed to load interviews router:", error.message);
  console.error("Stack:", error.stack);
}

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});