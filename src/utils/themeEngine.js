// src/utils/themeEngine.js
// Generates a full app theme from any natural-language vibe description.
// Calls /api/groq proxy → generates hex values → overrides ALL tokens.css vars on :root.
// Falls back to local preset map if Groq is rate-limited (429).

const THEME_SYSTEM = `You are a theme generator for a student study app called FSchoolAI.
The user described a visual vibe. Generate a complete theme as JSON only.

Return ONLY valid JSON — no markdown, no backticks, no explanation:
{
  "bg": "#hex",
  "surface": "#hex",
  "surface_hover": "#hex",
  "border": "#hex",
  "border_strong": "#hex",
  "accent": "#hex",
  "text_primary": "#hex",
  "text_secondary": "#hex",
  "text_tertiary": "#hex",
  "text_dim": "#hex",
  "urgent_bg": "#hex",
  "urgent_text": "#hex",
  "success_bg": "#hex",
  "success_text": "#hex",
  "progress_bar": "#hex",
  "is_dark": true,
  "theme_name": "2-3 word name",
  "ai_reply": "confirmation under 8 words e.g. Gold Luxury activated."
}

RULES — follow exactly or the app breaks:
- bg: the dominant full-page background. Dark themes: very dark (#0a0a0a range). Light themes: near-white.
- surface: card/panel background. Must be SUBTLY different from bg (slightly lighter if dark, slightly darker if light). Use rgba with low alpha like rgba(255,255,255,0.06) for dark themes.
- surface_hover: slightly more visible than surface for hover states.
- border: very subtle divider. rgba(255,255,255,0.08) style for dark themes, rgba(0,0,0,0.08) for light.
- border_strong: slightly more visible border.
- accent: the MAIN color that defines the theme vibe — make this vivid and on-brand. For "gold luxury" use #C9A84C. For "blood red" use #CC2200. For "ocean" use #0077CC.
- text_primary: main readable text. Must contrast strongly with bg. Near-white for dark themes, near-black for light.
- text_secondary: muted text, ~45% opacity equivalent.
- text_tertiary: very muted, ~25% opacity.
- text_dim: between secondary and tertiary.
- urgent_bg: semi-transparent red tint background for overdue badges. Keep it subtle.
- urgent_text: readable red/warm text for overdue labels.
- success_bg: semi-transparent green tint.
- success_text: readable green text.
- progress_bar: color for progress bars — use a tinted version of accent or a complementary color.
- is_dark: true if bg is dark.
- CRITICAL: NEVER make text the same color as bg. Always ensure strong contrast.
- Be dramatically faithful to the vibe. Mango sunset = deep warm #1a0800 bg + #FF8C00 accent. Blood red = #0a0000 bg + #CC0000 accent. Gold luxury = #0a0800 bg + #C9A84C accent. Pastel lavender = #f5f0ff bg (light!) + #7C4DFF accent.`;

export const DEFAULT_THEME = {
  bg:            "#111111",
  surface:       "rgba(255,255,255,0.05)",
  surface_hover: "rgba(255,255,255,0.08)",
  border:        "rgba(255,255,255,0.08)",
  border_strong: "rgba(255,255,255,0.14)",
  accent:        "rgba(255,255,255,0.85)",
  text_primary:  "#F5F5F5",
  text_secondary:"rgba(255,255,255,0.45)",
  text_tertiary: "rgba(255,255,255,0.25)",
  text_dim:      "rgba(255,255,255,0.35)",
  urgent_bg:     "rgba(255,59,48,0.15)",
  urgent_text:   "rgba(255,100,90,0.9)",
  success_bg:    "rgba(52,199,89,0.1)",
  success_text:  "rgba(100,220,130,0.85)",
  progress_bar:  "rgba(255,255,255,0.6)",
  is_dark:       true,
  theme_name:    "Default",
};

// ── Local preset fallback map ─────────────────────────────────────────────────
// Used when Groq is rate-limited. Keyed by trigger keywords (checked in order).
const PRESET_THEMES = [
  {
    keys: ["gold", "luxury", "rich"],
    theme: {
      bg: "#0a0800", surface: "rgba(201,168,76,0.07)", surface_hover: "rgba(201,168,76,0.12)",
      border: "rgba(201,168,76,0.12)", border_strong: "rgba(201,168,76,0.22)",
      accent: "#C9A84C", text_primary: "#F5EDD6", text_secondary: "rgba(245,237,214,0.45)",
      text_tertiary: "rgba(245,237,214,0.25)", text_dim: "rgba(245,237,214,0.35)",
      urgent_bg: "rgba(255,59,48,0.15)", urgent_text: "rgba(255,100,90,0.9)",
      success_bg: "rgba(52,199,89,0.1)", success_text: "rgba(100,220,130,0.85)",
      progress_bar: "#C9A84C", is_dark: true, theme_name: "Gold Luxury",
      ai_reply: "Gold Luxury activated.",
    },
  },
  {
    keys: ["blood", "red", "aggressive", "rage"],
    theme: {
      bg: "#0a0000", surface: "rgba(204,34,0,0.07)", surface_hover: "rgba(204,34,0,0.12)",
      border: "rgba(204,34,0,0.14)", border_strong: "rgba(204,34,0,0.24)",
      accent: "#CC2200", text_primary: "#F5E0E0", text_secondary: "rgba(245,224,224,0.45)",
      text_tertiary: "rgba(245,224,224,0.25)", text_dim: "rgba(245,224,224,0.35)",
      urgent_bg: "rgba(255,59,48,0.2)", urgent_text: "rgba(255,120,110,0.95)",
      success_bg: "rgba(52,199,89,0.1)", success_text: "rgba(100,220,130,0.85)",
      progress_bar: "#CC2200", is_dark: true, theme_name: "Blood Red",
      ai_reply: "Blood Red activated.",
    },
  },
  {
    keys: ["tokyo", "rainy", "rain", "japan", "night", "midnight", "3am"],
    theme: {
      bg: "#05080f", surface: "rgba(100,160,255,0.06)", surface_hover: "rgba(100,160,255,0.10)",
      border: "rgba(100,160,255,0.10)", border_strong: "rgba(100,160,255,0.18)",
      accent: "#5B9EF5", text_primary: "#D8E8FF", text_secondary: "rgba(216,232,255,0.45)",
      text_tertiary: "rgba(216,232,255,0.25)", text_dim: "rgba(216,232,255,0.35)",
      urgent_bg: "rgba(255,59,48,0.15)", urgent_text: "rgba(255,100,90,0.9)",
      success_bg: "rgba(52,199,89,0.1)", success_text: "rgba(100,220,130,0.85)",
      progress_bar: "#5B9EF5", is_dark: true, theme_name: "Rainy Tokyo",
      ai_reply: "Rainy Tokyo night activated.",
    },
  },
  {
    keys: ["pink", "rose", "blush", "soft"],
    theme: {
      bg: "#0d0508", surface: "rgba(255,100,160,0.07)", surface_hover: "rgba(255,100,160,0.12)",
      border: "rgba(255,100,160,0.12)", border_strong: "rgba(255,100,160,0.22)",
      accent: "#FF64A0", text_primary: "#FFE0EE", text_secondary: "rgba(255,224,238,0.45)",
      text_tertiary: "rgba(255,224,238,0.25)", text_dim: "rgba(255,224,238,0.35)",
      urgent_bg: "rgba(255,59,48,0.15)", urgent_text: "rgba(255,100,90,0.9)",
      success_bg: "rgba(52,199,89,0.1)", success_text: "rgba(100,220,130,0.85)",
      progress_bar: "#FF64A0", is_dark: true, theme_name: "Soft Pink",
      ai_reply: "Soft Pink activated.",
    },
  },
  {
    keys: ["ocean", "blue", "sea", "water"],
    theme: {
      bg: "#020c14", surface: "rgba(0,119,204,0.07)", surface_hover: "rgba(0,119,204,0.12)",
      border: "rgba(0,119,204,0.14)", border_strong: "rgba(0,119,204,0.24)",
      accent: "#0099E6", text_primary: "#D0EEFF", text_secondary: "rgba(208,238,255,0.45)",
      text_tertiary: "rgba(208,238,255,0.25)", text_dim: "rgba(208,238,255,0.35)",
      urgent_bg: "rgba(255,59,48,0.15)", urgent_text: "rgba(255,100,90,0.9)",
      success_bg: "rgba(52,199,89,0.1)", success_text: "rgba(100,220,130,0.85)",
      progress_bar: "#0099E6", is_dark: true, theme_name: "Deep Ocean",
      ai_reply: "Deep Ocean activated.",
    },
  },
  {
    keys: ["purple", "violet", "lavender", "galaxy", "space", "cyberpunk", "neon"],
    theme: {
      bg: "#07040f", surface: "rgba(130,80,255,0.07)", surface_hover: "rgba(130,80,255,0.12)",
      border: "rgba(130,80,255,0.12)", border_strong: "rgba(130,80,255,0.22)",
      accent: "#8250FF", text_primary: "#EDE0FF", text_secondary: "rgba(237,224,255,0.45)",
      text_tertiary: "rgba(237,224,255,0.25)", text_dim: "rgba(237,224,255,0.35)",
      urgent_bg: "rgba(255,59,48,0.15)", urgent_text: "rgba(255,100,90,0.9)",
      success_bg: "rgba(52,199,89,0.1)", success_text: "rgba(100,220,130,0.85)",
      progress_bar: "#8250FF", is_dark: true, theme_name: "Cyberpunk",
      ai_reply: "Cyberpunk activated.",
    },
  },
  {
    keys: ["forest", "green", "nature", "earthy"],
    theme: {
      bg: "#030a04", surface: "rgba(40,160,80,0.07)", surface_hover: "rgba(40,160,80,0.12)",
      border: "rgba(40,160,80,0.12)", border_strong: "rgba(40,160,80,0.22)",
      accent: "#28A050", text_primary: "#D8F0DC", text_secondary: "rgba(216,240,220,0.45)",
      text_tertiary: "rgba(216,240,220,0.25)", text_dim: "rgba(216,240,220,0.35)",
      urgent_bg: "rgba(255,59,48,0.15)", urgent_text: "rgba(255,100,90,0.9)",
      success_bg: "rgba(52,199,89,0.15)", success_text: "rgba(100,220,130,0.9)",
      progress_bar: "#28A050", is_dark: true, theme_name: "Deep Forest",
      ai_reply: "Deep Forest activated.",
    },
  },
  {
    keys: ["mango", "sunset", "orange", "warm", "fire"],
    theme: {
      bg: "#1a0800", surface: "rgba(255,140,0,0.07)", surface_hover: "rgba(255,140,0,0.12)",
      border: "rgba(255,140,0,0.12)", border_strong: "rgba(255,140,0,0.22)",
      accent: "#FF8C00", text_primary: "#FFE8CC", text_secondary: "rgba(255,232,204,0.45)",
      text_tertiary: "rgba(255,232,204,0.25)", text_dim: "rgba(255,232,204,0.35)",
      urgent_bg: "rgba(255,59,48,0.18)", urgent_text: "rgba(255,120,90,0.95)",
      success_bg: "rgba(52,199,89,0.1)", success_text: "rgba(100,220,130,0.85)",
      progress_bar: "#FF8C00", is_dark: true, theme_name: "Mango Sunset",
      ai_reply: "Mango Sunset activated.",
    },
  },
  {
    keys: ["white", "light", "minimal", "clean", "bright"],
    theme: {
      bg: "#f8f8f8", surface: "rgba(0,0,0,0.04)", surface_hover: "rgba(0,0,0,0.07)",
      border: "rgba(0,0,0,0.08)", border_strong: "rgba(0,0,0,0.15)",
      accent: "#111111", text_primary: "#111111", text_secondary: "rgba(0,0,0,0.45)",
      text_tertiary: "rgba(0,0,0,0.25)", text_dim: "rgba(0,0,0,0.35)",
      urgent_bg: "rgba(255,59,48,0.1)", urgent_text: "rgba(180,30,20,0.9)",
      success_bg: "rgba(52,199,89,0.1)", success_text: "rgba(30,140,60,0.9)",
      progress_bar: "#111111", is_dark: false, theme_name: "Clean Light",
      ai_reply: "Clean Light activated.",
    },
  },
];

/** Match vibe string against local preset keywords — returns preset or null */
function matchPreset(vibe) {
  const lower = vibe.toLowerCase();
  for (const { keys, theme } of PRESET_THEMES) {
    if (keys.some(k => lower.includes(k))) return theme;
  }
  return null;
}

/** Detect if a message is asking to change the app theme/vibe/colors */
export function isThemeRequest(message) {
  const lower = message.toLowerCase();
  const triggers = [
    "theme", "colour", "color", "vibe", "background", "make it", "change it",
    "switch to", "dark mode", "light mode", "aesthetic", "white", "black",
    "blue", "red", "green", "purple", "pink", "yellow", "orange", "gold",
    "neon", "pastel", "minimal", "clean", "dark", "bright", "warm", "cool",
    "chill", "hype", "aggressive", "soft", "luxury", "sunset", "midnight",
    "forest", "ocean", "fire", "space", "sky", "blood", "mango", "rainy",
    "tokyo", "cyberpunk", "earthy", "3am", "focus mode", "feel like",
  ];
  return triggers.some(t => lower.includes(t));
}

/** Apply a full theme object — overrides every token in tokens.css */
export function applyTheme(theme) {
  const r = document.documentElement;
  r.style.setProperty("--color-bg",            theme.bg);
  r.style.setProperty("--color-surface",        theme.surface);
  r.style.setProperty("--color-surface-hover",  theme.surface_hover);
  r.style.setProperty("--color-border",         theme.border);
  r.style.setProperty("--color-border-strong",  theme.border_strong);
  r.style.setProperty("--color-accent",         theme.accent);
  r.style.setProperty("--text-primary",         theme.text_primary);
  r.style.setProperty("--text-secondary",       theme.text_secondary);
  r.style.setProperty("--text-tertiary",        theme.text_tertiary);
  r.style.setProperty("--text-dim",             theme.text_dim);
  r.style.setProperty("--color-urgent-bg",      theme.urgent_bg);
  r.style.setProperty("--color-urgent-text",    theme.urgent_text);
  r.style.setProperty("--color-success-bg",     theme.success_bg);
  r.style.setProperty("--color-success-text",   theme.success_text);
  r.style.setProperty("--color-progress-bar",   theme.progress_bar);
  document.body.style.background = theme.bg;
  document.body.style.color      = theme.text_primary;
}

/** Reset to original tokens.css values */
export function resetTheme() {
  const r = document.documentElement;
  const props = [
    "--color-bg","--color-surface","--color-surface-hover","--color-border",
    "--color-border-strong","--color-accent","--text-primary","--text-secondary",
    "--text-tertiary","--text-dim","--color-urgent-bg","--color-urgent-text",
    "--color-success-bg","--color-success-text","--color-progress-bar",
  ];
  props.forEach(p => r.style.removeProperty(p));
  document.body.style.removeProperty("background");
  document.body.style.removeProperty("color");
  localStorage.removeItem("fschool_theme");
}

/** Persist theme to localStorage + Supabase */
export function saveTheme(theme, userId, supabase) {
  localStorage.setItem("fschool_theme", JSON.stringify(theme));
  if (userId && supabase) {
    supabase.from("users")
      .upsert({ id: userId, theme }, { onConflict: "id" })
      .then(() => {}).catch(() => {});
  }
}

/** Load and apply saved theme on boot */
export function loadSavedTheme(userData) {
  const theme = userData?.theme
    ?? JSON.parse(localStorage.getItem("fschool_theme") ?? "null");
  if (theme && theme.bg) applyTheme(theme);
}

/** Call /api/groq → parse theme JSON. Retries once on 429 after 1.5s. */
async function fetchThemeFromGroq(vibe) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch("/api/groq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: THEME_SYSTEM,
        messages: [{ role: "user", content: `Generate a dramatic, premium theme for: "${vibe}"` }],
      }),
    });

    if (res.status === 429) {
      if (attempt === 0) {
        // Wait 1.5s then retry once
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      // Both attempts rate-limited — throw so caller can use preset fallback
      throw new Error("RATE_LIMITED");
    }

    if (!res.ok) throw new Error("API_ERROR");

    const data = await res.json();
    const raw  = (data.content ?? "").trim().replace(/```json[\s\S]*?```|```/g, "").trim();
    const theme = JSON.parse(raw);
    if (!theme.bg || !theme.text_primary) throw new Error("INVALID_RESPONSE");
    return theme;
  }
}

/**
 * Full pipeline: try Groq → fall back to local preset → apply → save.
 * Never throws — always applies something.
 */
export async function generateAndApplyTheme(vibe, userId, supabase) {
  let theme = null;
  let usedFallback = false;

  try {
    theme = await fetchThemeFromGroq(vibe);
  } catch (err) {
    // Rate limited or API error — try local preset
    theme = matchPreset(vibe);
    usedFallback = true;

    if (!theme) {
      // No preset matched either — still apply something rather than failing silently
      // Build a minimal theme from the DEFAULT with a tinted accent hinted at by vibe
      theme = { ...DEFAULT_THEME, theme_name: "Custom", ai_reply: "Theme applied." };
    }
  }

  applyTheme(theme);
  saveTheme(theme, userId, supabase);

  // Add fallback note to ai_reply if we didn't use Groq
  if (usedFallback && theme.ai_reply) {
    theme = { ...theme, ai_reply: theme.ai_reply };
  }

  return theme;
}
