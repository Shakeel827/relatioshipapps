import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../types/navigation";
import { AnimatedSanctuaryBackground } from "../components/AnimatedSanctuaryBackground";
import { theme } from "../theme/theme";
import { checkHealth, getApiBaseUrl } from "../services/api";
import { Surface } from "../components/Surface";

type Props = NativeStackScreenProps<RootStackParamList, "Arrival">;

export function ArrivalScreen({ navigation }: Props) {
  const breath = useSharedValue(0);
  const [status, setStatus] = useState<"booting" | "error">("booting");
  const api = useMemo(() => getApiBaseUrl(), []);

  useEffect(() => {
    breath.value = withRepeat(
      withTiming(1, {
        duration: theme.motion.slow * 2,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, [breath]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setStatus("booting");
      const ok = await checkHealth();
      if (!alive) return;
      if (ok) navigation.replace("ChatList");
      else setStatus("error");
    })();
    return () => { alive = false; };
  }, [navigation, api]);

  const orb = useAnimatedStyle(() => {
    const s = 0.92 + breath.value * 0.14;
    const o = 0.22 + breath.value * 0.18;
    return { transform: [{ scale: s }], opacity: o };
  });

  return (
    <View style={styles.root}>
      <AnimatedSanctuaryBackground />
      <View style={styles.center}>
        <Animated.View style={[styles.orb, orb]} />
        <Text style={styles.text}>Relastin</Text>
        <Text style={styles.sub}>
          {status === "booting" ? "Connecting…" : "Can’t reach the backend"}
        </Text>

        {status === "error" ? (
          <Surface style={styles.panel} intensity={22}>
            <Text style={styles.panelTitle}>Connection help</Text>
            <Text style={styles.panelText}>
              Backend URL: {api}
            </Text>
            <Text style={styles.panelText}>
              Make sure your backend is running on port 5000 and your phone is on the same network.
            </Text>
            <TouchableOpacity style={styles.retry} onPress={() => navigation.replace("Arrival")}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </Surface>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.paper },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  orb: {
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(201,183,214,0.55)",
  },
  text: {
    marginTop: theme.spacing.xl,
    textAlign: "center",
    color: theme.colors.ink,
    fontSize: theme.type.title.fontSize,
    lineHeight: theme.type.title.lineHeight,
    letterSpacing: 0.2,
    fontWeight: "700",
  },
  sub: {
    marginTop: theme.spacing.sm,
    textAlign: "center",
    color: theme.colors.inkMuted,
    fontSize: theme.type.small.fontSize,
    lineHeight: theme.type.small.lineHeight,
  },
  panel: {
    marginTop: theme.spacing.xl,
    width: "100%",
    maxWidth: 520,
  },
  panelTitle: {
    color: theme.colors.ink,
    fontSize: theme.type.subtitle.fontSize,
    lineHeight: theme.type.subtitle.lineHeight,
    fontWeight: "600",
  },
  panelText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.inkMuted,
    fontSize: theme.type.small.fontSize,
    lineHeight: theme.type.small.lineHeight,
  },
  retry: {
    marginTop: theme.spacing.lg,
    alignSelf: "flex-start",
    backgroundColor: theme.colors.blueDusk,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  retryText: { color: "#fff", fontWeight: "800" },
});

