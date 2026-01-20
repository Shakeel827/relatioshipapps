import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { useTgTheme } from "../theme/tgTheme";

type Props = ViewProps & {
  intensity?: number;
  padding?: number;
};

export function Glass({ style, children, intensity = 18, padding = 0, ...rest }: Props) {
  const { theme } = useTgTheme();
  const tint = theme.mode === "dark" ? "dark" : "light";
  return (
    <View style={[styles.wrap, { borderRadius: theme.radii.lg }, style]} {...rest}>
      <BlurView intensity={intensity} tint={tint as any} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.edge, { borderRadius: theme.radii.lg, borderColor: theme.colors.divider }]} />
      <View style={{ padding }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  edge: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});

