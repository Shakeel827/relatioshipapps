import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { RootStackParamList } from "../types/navigation";
import { getMessages, sendMessage, MessageDTO } from "../services/api";
import { AIHelperSheet } from "../components/AIHelperSheet";
import { useTgTheme } from "../theme/tgTheme";
import { AmbientBackground } from "../components/AmbientBackground";
import { Glass } from "../components/Glass";
import { useAuth } from "../hooks";

export const ChatScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, "Chat">>();
  const nav = useNavigation();
  const { theme } = useTgTheme();
  const { user } = useAuth();
  const { conversationId, title } = route.params;
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const listRef = useRef<FlatList<MessageDTO>>(null);

  const load = useCallback(async () => {
    try {
      const since = messages.length ? messages[messages.length - 1].createdAt : undefined;
      const res = await getMessages(conversationId, since);
      if (res.messages?.length) setMessages(prev => [...prev, ...res.messages]);
    } catch (e) {}
  }, [conversationId, messages]);

  useEffect(() => {
    // initial load
    (async () => {
      try {
        const res = await getMessages(conversationId);
        setMessages(res.messages || []);
      } catch {
        setMessages([]);
      }
    })();
    // simple polling every 2.5s
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [conversationId]);

  async function onSend() {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await sendMessage(conversationId, input.trim());
      setMessages(prev => [...prev, res.message]);
      setInput("");
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <AmbientBackground />

      <Glass style={styles.headerGlass} padding={10} intensity={22}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (nav as any).goBack?.()} style={[styles.headerIcon, { backgroundColor: theme.colors.surface2 }]}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.accent} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{title || "Chat"}</Text>
          <TouchableOpacity onPress={() => setShowAI((v) => !v)} style={[styles.headerIcon, { backgroundColor: theme.colors.surface2 }]}>
            <Ionicons name="sparkles-outline" size={20} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>
      </Glass>

      <FlatList
        ref={listRef}
        contentContainerStyle={{ padding: 12, paddingTop: 84, paddingBottom: 18 }}
        data={messages}
        keyExtractor={(m) => m._id}
        renderItem={({ item }) => (
          <View style={[
            styles.bubble,
            String(item.senderId) === String(user?.id) ? styles.me : styles.them,
          ]}>
            <Glass
              intensity={14}
              padding={10}
              style={{
                borderRadius: 18,
                backgroundColor: String(item.senderId) === String(user?.id) ? theme.colors.bubbleMe : theme.colors.bubbleOther,
              }}
            >
              <Text style={[styles.msg, { color: theme.colors.bubbleText }]}>{item.text}</Text>
              <Text style={[styles.time, { color: theme.colors.bubbleText2 }]}>{new Date(item.createdAt).toLocaleTimeString()}</Text>
            </Glass>
          </View>
        )}
      />
      {showAI ? <AIHelperSheet value={input} onApply={setInput} /> : null}
      <Glass style={styles.composerGlass} padding={10} intensity={22}>
        <View style={styles.composer}>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.surface2 }]}>
            <Ionicons name="add" size={22} color={theme.colors.text2} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.surface2, color: theme.colors.text }]}
            placeholder="Write a message"
            placeholderTextColor={theme.colors.text2}
            value={input}
            onChangeText={setInput}
          />
          <TouchableOpacity style={[styles.send, { backgroundColor: theme.colors.accent }]} onPress={onSend} disabled={loading}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </Glass>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  headerGlass: { position: "absolute", left: 12, right: 12, top: 12, zIndex: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 16, fontWeight: "800" },
  bubble: { maxWidth: "86%", marginVertical: 6 },
  me: { alignSelf: "flex-end" },
  them: { alignSelf: "flex-start" },
  msg: { fontSize: 15, lineHeight: 20 },
  time: { fontSize: 11, marginTop: 4 },
  composerGlass: { margin: 12 },
  composer: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  send: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
});
