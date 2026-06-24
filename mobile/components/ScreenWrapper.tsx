import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSwipeNav } from "../navigation/useSwipeNav";
import PageDots from "./PageDots";
import { PageKey, LABEL } from "../navigation/navConfig";
import { Text } from "react-native";

type Props = {
  page: PageKey;
  children: React.ReactNode;
};

export default function ScreenWrapper({ page, children }: Props) {
  const { onTouchStart, onTouchEnd } = useSwipeNav(page);

  return (
    <SafeAreaView style={styles.safe}>
      <View
        style={styles.container}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Text style={styles.title}>{LABEL[page]}</Text>
        <View style={styles.content}>{children}</View>
        <View style={styles.footer}>
          <PageDots current={page} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: "#0f0f0f" },
  container: { flex: 1, padding: 20 },
  title:     { fontSize: 28, fontWeight: "700", color: "#fff", marginBottom: 16, letterSpacing: -0.5 },
  content:   { flex: 1 },
  footer:    { alignItems: "center", paddingVertical: 12 },
});
