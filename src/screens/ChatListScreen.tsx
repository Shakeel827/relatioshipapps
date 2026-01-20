import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { listConversations, Conversation } from "../services/api";
import { RootStackParamList } from "../types/navigation";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTgTheme } from "../theme/tgTheme";
import { useAuth } from "../hooks";
import { LoginNudgeModal } from "../components/LoginNudgeModal";
import { Avatar } from "../components/Avatar";
import { AmbientBackground } from "../components/AmbientBackground";
import { Glass } from "../components/Glass";

export const ChatListScreen: React.FC = () => {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTgTheme();
  const { isSignedIn } = useAuth();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [nudge, setNudge] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await listConversations();
      setItems(res.conversations || []);
    } catch (e: any) {
      setError("Unable to load chats");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isSignedIn) return;
    const id = setTimeout(() => setNudge(true), 10 * 60 * 1000);
    return () => clearTimeout(id);
  }, [isSignedIn]);

  function openChat(item: Conversation) {
    const title = item.partner?.name || item.partner?.email || "Chat";
    nav.navigate("Chat", { conversationId: item._id, title });
  }

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = items;
    if (!q) return base;
    return base.filter((c) => c._id.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <AmbientBackground />

      <Glass style={styles.headerGlass} padding={14} intensity={22}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Chats</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => nav.navigate("Invite")} style={[styles.iconBtn, { backgroundColor: theme.colors.surface2 }]}>
              <Ionicons name="person-add-outline" size={20} color={theme.colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => nav.navigate("Settings")} style={[styles.iconBtn, { backgroundColor: theme.colors.surface2 }]}>
              <Ionicons name="settings-outline" size={20} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.searchWrap, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.divider }]}>
          <Ionicons name="search" size={18} color={theme.colors.text2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={theme.colors.text2}
            style={[styles.search, { color: theme.colors.text }]}
          />
        </View>
      </Glass>

      {!isSignedIn ? (
        <View style={[styles.banner, { backgroundColor: theme.colors.chip, borderColor: theme.colors.divider }]}>
          <Ionicons name="sparkles-outline" size={18} color={theme.colors.accent} />
          <Text style={[styles.bannerText, { color: theme.colors.text }]}>
            Anonymous mode. Chats won’t sync across devices.
          </Text>
          <TouchableOpacity onPress={() => nav.navigate("Settings")}>
            <Text style={[styles.bannerLink, { color: theme.colors.accent }]}>Sign in</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}
      <FlatList
        data={data}
        keyExtractor={(it) => it._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.rowWrap} onPress={() => openChat(item)} activeOpacity={0.86}>
            <Glass style={[styles.row, { backgroundColor: theme.colors.surface }]} padding={12} intensity={16}>
              <View style={styles.rowInner}>
                <Avatar name={item.partner?.name || item.partner?.email || "Conversation"} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: theme.colors.text }]}>
                    {item.partner?.name || item.partner?.email || "Conversation"}
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.text2 }]} numberOfLines={1}>
                    {item.partner?.email ? "Online-ready • " : "Invite a partner • "}
                    {item._id.slice(0, 8)}…
                  </Text>
                </View>
                <Text style={[styles.time, { color: theme.colors.text2 }]}>
                  {new Date(item.updatedAt).toLocaleTimeString()}
                </Text>
              </View>
            </Glass>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ padding: 12, paddingTop: 140, paddingBottom: 18 }}
      />

      <LoginNudgeModal
        visible={nudge && !isSignedIn}
        onClose={() => setNudge(false)}
        onSignIn={() => { setNudge(false); nav.navigate("Settings"); }}
        onSignUp={() => { setNudge(false); nav.navigate("Settings"); }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGlass: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    zIndex: 20,
  },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 22, fontWeight: "900", letterSpacing: 0.2 },
  headerActions: { flexDirection: "row", gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchWrap: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  search: { flex: 1, fontSize: 14 },
  banner: {
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bannerText: { flex: 1, fontSize: 13, fontWeight: "600" },
  bannerLink: { fontSize: 13, fontWeight: "800" },
  error: { paddingHorizontal: 12, paddingBottom: 6, fontWeight: "700" },
  rowWrap: { paddingHorizontal: 12 },
  row: { borderRadius: 18 },
  rowInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  name: { fontWeight: "800", fontSize: 15 },
  subtitle: { marginTop: 2, fontSize: 13 },
  time: { fontSize: 12, marginLeft: 10 },
});
