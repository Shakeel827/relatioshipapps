import mongoose from "mongoose";

let lastError: Error | null = null;
export function getMongoStatus() {
  const state = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  return {
    connected: state === 1,
    state,
    error: lastError ? String(lastError.message || lastError) : null,
  } as const;
}

export async function connectMongo(uri: string) {
  if (!uri) {
    console.warn("⚠️  MONGO_URI not provided. Backend will run without DB.");
    return;
  }

  if (mongoose.connection.readyState === 1) return;
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      heartbeatFrequencyMS: 10000,
    } as any);
    console.log("✅ MongoDB connected");
    lastError = null;
  } catch (err: any) {
    lastError = err;
    console.error("❌ MongoDB connection failed:", err?.message || err);
    throw err;
  }
}
