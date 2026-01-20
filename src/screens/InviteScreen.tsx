import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Share, KeyboardAvoidingView, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { createInvite, acceptInvite } from "../services/api";
import { useTgTheme } from "../theme/tgTheme";
import { useAuth } from "../hooks";
import { LoginNudgeModal } from "../components/LoginNudgeModal";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { AmbientBackground } from "../components/AmbientBackground";
import { Glass } from "../components/Glass";

export const InviteScreen: React.FC = () => {
  const { theme } = useTgTheme();
  const { isSignedIn } = useAuth();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Invite">>();
  const [code, setCode] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string>(route.params?.code || "");
  const [status, setStatus] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);

  async function onCreate() {
    setStatus(null);
    if (!isSignedIn) { setNeedLogin(true); return; }
    try {
      const res = await createInvite();
      setCode(res.code);
      setLink(res.link);
      setStatus("Invite created");
      setOpen(true);
    } catch {
      setStatus("Failed to create invite");
    }
  }

  async function onCopy() {
    if (!link && !code) return;
    await Clipboard.setStringAsync(link || code!);
    setStatus("Copied");
  }

  async function onShare() {
    if (!code) return;
    const appLink = `relastin://invite/${code}`;
    try {
      await Share.share({
        message: `Join my Relastin chat.\n\nCode: ${code}\nOpen: ${appLink}`,
      });
      setStatus("Shared");
    } catch {
      // user cancelled -> ignore
    }
  }

  async function onAccept() {
    const c = (joinCode || code || "").trim();
    if (!c) return;
    if (!isSignedIn) { setNeedLogin(true); return; }
    try {
      const res = await acceptInvite(c);
      setStatus("Accepted – chat created");
      setOpen(false);
      nav.navigate("Chat", { conversationId: res.conversationId, title: "New chat" });
    } catch {
      setStatus("Invalid code");
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: theme.colors.bg }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <AmbientBackground />
      <View style={styles.content}>
        <Glass style={[styles.card, { borderColor: theme.colors.divider }]} padding={16} intensity={22}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-add-outline" size={18} color={theme.colors.accent} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Invite a partner</Text>
          </View>
          <Text style={[styles.cardSub, { color: theme.colors.text2 }]}>
            Generate a code and share it. Your partner can join from their Invite screen.
          </Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={onCreate} style={[styles.btn, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.btnText}>Create invite</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => nav.navigate("ChatList")} style={[styles.btnGhost, { borderColor: theme.colors.divider }]}>
              <Text style={[styles.btnGhostText, { color: theme.colors.text }]}>Back</Text>
            </TouchableOpacity>
          </View>
        </Glass>

        <Glass style={[styles.card, { borderColor: theme.colors.divider }]} padding={16} intensity={22}>
          <View style={styles.cardHeader}>
            <Ionicons name="key-outline" size={18} color={theme.colors.accent} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Join with code</Text>
          </View>
          <Text style={[styles.cardSub, { color: theme.colors.text2 }]}>Paste a code you received.</Text>
          <View style={[styles.inputWrap, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.divider }]}>
            <Ionicons name="hash" size={16} color={theme.colors.text2} />
            <TextInput
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.replace(/\s+/g, ""))}
              placeholder="Enter invite code"
              placeholderTextColor={theme.colors.text2}
              style={[styles.input, { color: theme.colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity style={[styles.btn, { backgroundColor: theme.colors.accent }]} onPress={onAccept}>
            <Text style={styles.btnText}>Join</Text>
          </TouchableOpacity>
        </Glass>

        {status ? <Text style={[styles.status, { color: theme.colors.text2 }]}>{status}</Text> : null}
      </View>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Glass style={[styles.modalCard, { borderColor: theme.colors.divider }]} padding={16} intensity={28}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-add-outline" size={18} color={theme.colors.accent} />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Invite Partner</Text>
            </View>
            <Text style={[styles.label, { color: theme.colors.text2 }]}>Share this code</Text>
            <Text style={[styles.value, { color: theme.colors.text }]} selectable>{code}</Text>
            {link ? (
              <>
                <Text style={[styles.label, { color: theme.colors.text2 }]}>Or share link</Text>
                <Text style={[styles.value, { color: theme.colors.text }]} numberOfLines={2} selectable>{link}</Text>
              </>
            ) : null}
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btnGhost, { borderColor: theme.colors.divider }]} onPress={onCopy}>
                <Text style={[styles.btnGhostText, { color: theme.colors.text }]}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnGhost, { borderColor: theme.colors.divider }]} onPress={onShare}>
                <Text style={[styles.btnGhostText, { color: theme.colors.text }]}>Share</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.close} onPress={() => setOpen(false)}>
              <Text style={{ color: theme.colors.text2, fontWeight: "800" }}>Close</Text>
            </TouchableOpacity>
          </Glass>
        </View>
      </Modal>

      <LoginNudgeModal
        visible={needLogin}
        onClose={() => setNeedLogin(false)}
        onSignIn={() => { setNeedLogin(false); nav.navigate("Settings"); }}
        onSignUp={() => { setNeedLogin(false); nav.navigate("Settings"); }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, padding: 14, gap: 12, justifyContent: "center" },
  status: { marginTop: 2, fontSize: 12, textAlign: "center", fontWeight: "700" },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 16 },
  card: { width: "100%", borderRadius: 18, padding: 16, borderWidth: StyleSheet.hairlineWidth },
  modalCard: { width: "100%", maxWidth: 480, borderRadius: 18, padding: 16, borderWidth: StyleSheet.hairlineWidth },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  cardSub: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  label: { marginTop: 8, fontSize: 12, fontWeight: "800" },
  value: { marginTop: 4, fontSize: 14, fontWeight: "800" },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  inputWrap: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: { flex: 1, fontSize: 14, fontWeight: "700" },
  btn: { marginTop: 12, paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "900" },
  btnGhost: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: "center", borderWidth: StyleSheet.hairlineWidth },
  btnGhostText: { fontWeight: "900" },
  close: { alignSelf: "center", marginTop: 8, paddingVertical: 6, paddingHorizontal: 10 },
});
