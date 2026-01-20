/**
 * API CLIENT
 *
 * Handles all communication with Relastin backend
 * - Chat endpoint
 * - Reflection endpoint
 * - Environment variable configuration
 */

import { NativeModules, Platform } from "react-native";

function inferDevHost() {
  // Works in Expo + Metro: derive host IP from bundle URL.
  // Example: "http://192.168.0.10:8081/index.bundle?platform=android&dev=true"
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL;
  if (typeof scriptURL !== "string") return null;
  const m = scriptURL.match(/^https?:\/\/([^:/]+)/i);
  return m?.[1] || null;
}

function defaultHostForPlatform() {
  // For web in browser, check current window location
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    // If running on localhost:8081, use the inferred host or machine IP
    if (host === "localhost" || host === "127.0.0.1") {
      return "192.168.1.7"; // Machine IP for local development
    }
    return host;
  }
  // Android emulator special host that maps to your machine.
  if (Platform.OS === "android") return "10.0.2.2";
  return "localhost";
}

function resolveApiBaseUrl() {
  // Highest priority: explicit env
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env;

  // Next: infer from dev server host (works on real device too)
  const devHost = inferDevHost();
  const host = devHost || defaultHostForPlatform();

  // Backend default port is 5000
  return `http://${host}:5000/api`;
}

const API_BASE_URL = resolveApiBaseUrl();
export function getApiBaseUrl() {
  return API_BASE_URL;
}

// Token management (shared with useAuth)
import AsyncStorage from "@react-native-async-storage/async-storage";
const TOKEN_KEY = "@relastin_token";

async function authHeaders() {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  model: string;
}

export interface ReflectionResponse {
  reflection: string;
}

export interface AnalyzeResponse {
  spans: Array<{ start: number; end: number; label: "positive" | "neutral" | "negative" }>;
}

export interface RephraseResponse { variants: string[] }
export interface SuggestResponse { suggestions: string[] }
export interface PerspectiveResponse { triggers: string; impact: string; action: string }
export interface SummaryResponse { triggers: string; impact: string; action: string }

// Telegram-like chat data types
export interface Conversation {
  _id: string;
  members: Array<string | { _id: string; name?: string; email?: string; photoUrl?: string }>;
  aiEnabled: boolean;
  updatedAt: string;
  partner?: { _id: string; name?: string; email?: string; photoUrl?: string } | null;
}

export interface MessageDTO {
  _id: string;
  conversationId: string;
  senderId: string;
  text: string;
  type: "text" | "gift";
  createdAt: string;
}

/**
 * Send a chat message to the backend
 */
export async function sendChatMessage(messages: ChatMessage[]): Promise<ChatResponse> {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        messages,
      }),
    });

    if (!response.ok) {
      let data: any = null;
      try { data = await response.json(); } catch {}
      const err: any = new Error((data && data.error) || "Failed to send message");
      err.code = response.status;
      if (data && data.code) err.serverCode = data.code;
      throw err;
    }

    const data: ChatResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Chat API error:", error);
    throw error;
  }
}

/**
 * Get a tone reflection on a message before sending
 */
export async function getReflection(userMessage: string): Promise<ReflectionResponse> {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/reflect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        userMessage,
      }),
    });

    if (!response.ok) {
      let data: any = null;
      try { data = await response.json(); } catch {}
      const err: any = new Error((data && data.error) || "Failed to analyze tone");
      err.code = response.status;
      if (data && data.code) err.serverCode = data.code;
      throw err;
    }

    const data: ReflectionResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Reflection API error:", error);
    throw error;
  }
}

/**
 * Check backend health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error("Health check failed:", error);
    return false;
  }
}

// AUTH API
export async function apiRegister(
  email: string,
  password: string,
  extras?: { name?: string; age?: number; gender?: string; location?: string }
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, ...extras }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Registration failed");
  await AsyncStorage.setItem(TOKEN_KEY, data.token);
}

export async function apiLogin(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Login failed");
  await AsyncStorage.setItem(TOKEN_KEY, data.token);
}

export async function apiMe(): Promise<{ id: string; email: string } | null> {
  const headers = await authHeaders();
  if (!("Authorization" in headers)) return null;
  const res = await fetch(`${API_BASE_URL}/auth/me`, { headers });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.user || null;
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

// ANALYZE / REPHRASE / SUGGEST
export async function analyzeMessage(userMessage: string): Promise<AnalyzeResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json", ...(headers as Record<string, string>) }),
    body: JSON.stringify({ userMessage }),
  });
  if (!res.ok) throw new Error("Analyze failed");
  return res.json();
}

export async function rephraseMessage(userMessage: string): Promise<RephraseResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/rephrase`, {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json", ...(headers as Record<string, string>) }),
    body: JSON.stringify({ userMessage }),
  });
  if (!res.ok) throw new Error("Rephrase failed");
  return res.json();
}

export async function suggestMessage(context: string): Promise<SuggestResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/suggest`, {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json", ...(headers as Record<string, string>) }),
    body: JSON.stringify({ context }),
  });
  if (!res.ok) throw new Error("Suggest failed");
  return res.json();
}

export async function perspective(context: string): Promise<PerspectiveResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/perspective`, {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json", ...(headers as Record<string, string>) }),
    body: JSON.stringify({ context }),
  });
  if (!res.ok) throw new Error("Perspective failed");
  return res.json();
}

export async function summary(context: string): Promise<SummaryResponse> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/summary`, {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json", ...(headers as Record<string, string>) }),
    body: JSON.stringify({ context }),
  });
  if (!res.ok) throw new Error("Summary failed");
  return res.json();
}

// Conversations / Messages / Invites
export async function listConversations(): Promise<{ conversations: Conversation[] }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/conversations`, { headers });
  if (!res.ok) throw new Error("Failed to list conversations");
  return res.json();
}

export async function ensureConversation(partnerId: string, aiEnabled: boolean = true): Promise<{ conversation: Conversation }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/conversations`, {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json", ...(headers as Record<string, string>) }),
    body: JSON.stringify({ partnerId, aiEnabled }),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  return res.json();
}

export async function getMessages(conversationId: string, since?: string): Promise<{ messages: MessageDTO[] }> {
  const headers = await authHeaders();
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages${qs}`, { headers });
  if (!res.ok) throw new Error("Failed to load messages");
  return res.json();
}

export async function sendMessage(conversationId: string, text: string, flags?: { hideFromAI?: boolean }): Promise<{ message: MessageDTO }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/messages`, {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json", ...(headers as Record<string, string>) }),
    body: JSON.stringify({ conversationId, text, flags }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

export async function createInvite(): Promise<{ code: string; link: string; expiresAt: string }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/invite/create`, { method: "POST", headers });
  if (!res.ok) {
    let data: any = null;
    try { data = await res.json(); } catch {}
    throw new Error(data?.error || "Failed to create invite");
  }
  return res.json();
}

export async function acceptInvite(code: string): Promise<{ conversationId: string }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE_URL}/invite/accept`, {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json", ...(headers as Record<string, string>) }),
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    let data: any = null;
    try { data = await res.json(); } catch {}
    throw new Error(data?.error || "Failed to accept invite");
  }
  return res.json();
}
