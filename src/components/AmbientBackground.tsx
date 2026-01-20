import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useTgTheme } from "../theme/tgTheme";

const AView = Animated.createAnimatedComponent(View);

export function AmbientBackground() {
  const { theme } = useTgTheme();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [t]);

  const drift = useAnimatedStyle(() => {
    const amp = 26;
    const tx = (t.value - 0.5) * amp;
    const ty = (0.5 - t.value) * (amp * 0.8);
    return { transform: [{ translateX: tx }, { translateY: ty }, { scale: 1.15 }] };
  });

  const top = theme.mode === "dark" ? "#0b1220" : "#f7fbff";
  const mid = theme.mode === "dark" ? theme.colors.surface : "#eaf2ff";
  const accent = theme.mode === "dark" ? "#1c4d7a" : "#d7f0ff";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <AView style={[StyleSheet.absoluteFill, drift]}>
        <LinearGradient
          colors={[top, mid, accent]}
          start={{ x: 0.15, y: 0.05 }}
          end={{ x: 0.95, y: 0.95 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[
            theme.mode === "dark" ? "rgba(46,166,255,0.18)" : "rgba(51,144,236,0.14)",
            theme.mode === "dark" ? "rgba(124,199,255,0.10)" : "rgba(106,184,255,0.10)",
            "rgba(255,255,255,0.00)",
          ]}
          start={{ x: 0.9, y: 0.1 }}
          end={{ x: 0.2, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      </AView>
    </View>
  );
}

