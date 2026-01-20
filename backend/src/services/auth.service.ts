import bcrypt from "bcryptjs";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { UserModel } from "../models/User.js";
import { getMongoStatus } from "../lib/mongo.js";

const JWT_SECRET: Secret = (process.env.JWT_SECRET || "dev-secret-change") as Secret;
const JWT_EXPIRES_IN: SignOptions["expiresIn"] = (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"];

// In-memory fallback store for when MongoDB is not available
const inMemoryUsers: Map<string, any> = new Map();

export const authService = {
  async register(
    email: string,
    password: string,
    extras?: { name?: string; age?: number; gender?: string; location?: string }
  ) {
    const normalized = email.trim().toLowerCase();
    const mongoStatus = getMongoStatus();
    
    try {
      // Try to use MongoDB if available
      if (mongoStatus.connected) {
        const existing = await UserModel.findOne({ email: normalized }).lean();
        if (existing) throw new Error("Email already registered");
        const passwordHash = await bcrypt.hash(password, 10);
        const fallbackName = normalized.split("@")[0] || "User";
        const name = (extras?.name || "").trim() || fallbackName;
        const user = await UserModel.create({
          email: normalized,
          passwordHash,
          name,
          age: typeof extras?.age === "number" ? extras?.age : undefined,
          gender: extras?.gender,
          location: extras?.location,
        });
        const token = jwt.sign({ sub: String(user._id), email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        return { token };
      }
    } catch (err: any) {
      console.warn("MongoDB unavailable, falling back to in-memory storage", err?.message);
    }

    // Fallback: use in-memory store
    if (inMemoryUsers.has(normalized)) {
      throw new Error("Email already registered");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const fallbackName = normalized.split("@")[0] || "User";
    const name = (extras?.name || "").trim() || fallbackName;
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user = {
      _id: userId,
      email: normalized,
      passwordHash,
      name,
      age: typeof extras?.age === "number" ? extras?.age : undefined,
      gender: extras?.gender,
      location: extras?.location,
    };
    inMemoryUsers.set(normalized, user);
    const token = jwt.sign({ sub: userId, email: normalized }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return { token };
  },

  async login(email: string, password: string) {
    const normalized = email.trim().toLowerCase();
    const mongoStatus = getMongoStatus();
    
    try {
      // Try to use MongoDB if available
      if (mongoStatus.connected) {
        const user = await UserModel.findOne({ email: normalized }).lean() as any;
        if (!user?.passwordHash) throw new Error("Invalid email or password");
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) throw new Error("Invalid email or password");
        const token = jwt.sign({ sub: String(user._id), email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        return { token };
      }
    } catch (err: any) {
      console.warn("MongoDB unavailable, falling back to in-memory storage", err?.message);
    }

    // Fallback: use in-memory store
    const user = inMemoryUsers.get(normalized);
    if (!user?.passwordHash) throw new Error("Invalid email or password");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new Error("Invalid email or password");
    const token = jwt.sign({ sub: user._id, email: normalized }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return { token };
  },

  verify(token: string) {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
    return payload;
  },
};
