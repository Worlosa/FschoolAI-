// src/utils/themeEngine.js
// Generates a full app theme from any natural-language vibe description.
// Calls /api/groq proxy → generates hex values → overrides ALL tokens.css vars on :root.

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

const DEFAULT_THEME = {
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
  // Core tokens — matches tokens.css exactly
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
  // Body background — index.css sets background on body directly
  document.body.style.background = theme.bg;
  document.body.style.color      = theme.text_primary;
  // Store for progress bars (inline style in Work.jsx)
  r.style.setProperty("--color-progress-bar",  theme.progress_bar);
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

/** Persist theme */
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

/** Call /api/groq → parse theme JSON */
async function fetchTheme(vibe) {
  const res = await fetch("/api/groq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: THEME_SYSTEM,
      messages: [{ role: "user", content: `Generate a dramatic, premium theme for: "${vibe}"` }],
    }),
  });
  if (!res.ok) throw new Error("Theme API failed");
  const data = await res.json();
  const raw = (data.content ?? "").trim().replace(/```json|```/g, "").trim();
  const theme = JSON.parse(raw);
  // Validate essential fields — fall back to default if AI hallucinated
  if (!theme.bg || !theme.text_primary) throw new Error("Invalid theme response");
  return theme;
}

/** Full pipeline: generate → apply → save. Returns theme + ai_reply. */
export async function generateAndApplyTheme(vibe, userId, supabase) {
  const theme = await fetchTheme(vibe);
  applyTheme(theme);
  saveTheme(theme, userId, supabase);
  return theme;
}

export { DEFAULT_THEME };
