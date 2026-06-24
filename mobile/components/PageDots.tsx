import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { DOT_GRID, PageKey } from "../navigation/navConfig";

export default function PageDots({ current }: { current: PageKey }) {
  const router = useRouter();

  return (
    <View style={styles.grid}>
      {DOT_GRID.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((page, c) => {
            if (!page) return <View key={c} style={styles.empty} />;
            const active = page === current;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => router.replace(`/${page}`)}
                style={[styles.dot, active && styles.dotActive]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid:      { alignItems: "center", gap: 6 },
  row:       { flexDirection: "row", gap: 6 },
  dot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)" },
  dotActive: { backgroundColor: "#c49a3c", transform: [{ scale: 1.4 }] },
  empty:     { width: 6, height: 6 },
});
