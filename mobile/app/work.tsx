import { Text, StyleSheet } from "react-native";
import ScreenWrapper from "../components/ScreenWrapper";

export default function WorkScreen() {
  return (
    <ScreenWrapper page="work">
      <Text style={styles.sub}>Coming soon</Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  sub: { fontSize: 14, color: "rgba(255,255,255,0.4)" },
});
