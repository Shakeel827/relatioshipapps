import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

import express, { Express } from "express";
import cors from "cors";
import chatRoutes from "./routes/chat.routes.js";
import authRoutes from "./routes/auth.routes.js";
import inviteRoutes from "./routes/invite.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import { connectMongo, getMongoStatus } from "./lib/mongo.js";
import { rateLimiter, errorHandler } from "./middleware/index.js";
import { freeTierGate } from "./middleware/freeTier.js";

const app: Express = express();
const PORT = parseInt(process.env.PORT || "5000", 10);
const MONGO_URI = process.env.MONGO_URI || "";

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Body parsing
app.use(express.json({ limit: "10mb" }));

// CORS - Allow frontend requests
app.use(
  cors({
    // React Native (device) doesn't enforce CORS, but Expo Web does.
    // Use reflective origin in dev; tighten for production deployments.
    origin: process.env.NODE_ENV === "production"
      ? (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : [])
      : true,
    credentials: false,
  })
);

// Rate limiting
const rateLimitWindowMs =
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10);
const rateLimitMaxRequests = parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || "100",
  10
);
app.use("/api/", rateLimiter(rateLimitWindowMs, rateLimitMaxRequests));
// Free tier gate (allows limited unauthenticated usage for chat/reflect)
app.use("/api", freeTierGate);

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get("/", (req, res) => {
  res.json({
    name: "Relastin Backend",
    version: "1.0.0",
    status: "running",
    docs: "See /api/health for service status",
  });
});

// API health: includes DB status
app.get("/api/health", (req, res) => {
  const mongo = getMongoStatus();
  res.json({
    name: "Relastin Backend",
    status: "ok",
    mongo,
  });
});

// Auth + Chat API
app.use("/api", authRoutes);
app.use("/api", chatRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.path,
  });
});

// Error handling
app.use(errorHandler);

// ============================================================================
// DB + START SERVER
// ============================================================================

(async () => {
  try {
    // Try to connect to MongoDB with timeout, but don't block if it fails
    if (MONGO_URI) {
      try {
        // Set a 5 second timeout for MongoDB connection
        const mongoPromise = connectMongo(MONGO_URI);
        await Promise.race([
          mongoPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("MongoDB connection timeout")), 5000)
          ),
        ]);
      } catch (dbErr: any) {
        console.warn("⚠️  Could not connect to MongoDB:", dbErr?.message || dbErr);
        console.warn("⚠️  Server will run without database persistence.");
      }
    } else {
      console.warn("⚠️  MONGO_URI is not set. Proceeding without database.");
    }

    // Mount domain routes (after DB attempt)
    app.use("/api", inviteRoutes);
    app.use("/api", conversationRoutes);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`\n🌙 Relastin Backend running on http://0.0.0.0:${PORT}`);
      console.log(`📝 Chat endpoint: POST /api/chat`);
      console.log(`🔍 Reflect endpoint: POST /api/reflect`);
      console.log(`❤️  Health check: GET /api/health\n`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();
