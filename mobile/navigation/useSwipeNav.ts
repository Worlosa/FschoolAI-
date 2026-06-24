import { useRef } from "react";
import { useRouter } from "expo-router";
import { NAV, PageKey } from "./navConfig";

const MIN_SWIPE_PX = 48;

export function useSwipeNav(currentPage: PageKey) {
  const router = useRouter();
  const startRef = useRef<{ x: number; y: number } | null>(null);

  function navigate(direction: "left" | "right" | "up" | "down") {
    const target = NAV[currentPage]?.[direction];
    if (target) router.replace(`/${target}`);
  }

  const onTouchStart = (e: any) => {
    const touch = e.nativeEvent.touches[0];
    startRef.current = { x: touch.pageX, y: touch.pageY };
  };

  const onTouchEnd = (e: any) => {
    if (!startRef.current) return;
    const touch = e.nativeEvent.changedTouches[0];
    const dx = touch.pageX - startRef.current.x;
    const dy = touch.pageY - startRef.current.y;
    startRef.current = null;

    if (Math.abs(dx) < MIN_SWIPE_PX && Math.abs(dy) < MIN_SWIPE_PX) return;

    if (Math.abs(dx) >= Math.abs(dy)) {
      navigate(dx < 0 ? "right" : "left");
    } else {
      navigate(dy < 0 ? "down" : "up");
    }
  };

  return { onTouchStart, onTouchEnd, navigate };
}
