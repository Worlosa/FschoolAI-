// src/utils/themeEngine.js
// Generates a full app theme from any natural-language vibe description.
// Calls /api/groq proxy → returns theme JSON → applies CSS vars to :root.

const THEME_SYSTEM = `You are a theme generator for a student study app called FSchoolAI.
The user described a visual vibe. Generate a theme as a JSON object only.

Return ONLY valid JSON — no markdown fences, no explanation, nothing else:
{
  "bg_primary": "#hex",
  "bg_secondary": "#hex",
  "bg_card": "#hex",
  "accent": "#hex",
  "accent_bright": "#hex",
  "text_primary": "#hex",
  "text_muted": "#hex",
  "border": "#hex",
  "is_dark": true,
  "theme_name": "short evocative name max 3 words",
  "transition": "fade"
}

Rules:
- bg_primary: dominant background (darkest if dark theme)
- bg_secondary: slightly lighter than bg_primary for cards/surfaces
- bg_card: card background, subtly distinct from bg_secondary
- accent: main interactive/highlight color — vibrant, fits the vibe
- accent_bright: lighter version of accent for text on dark backgrounds
- text_primary: main text — must have strong contrast on bg_primary
- text_muted: secondary text — readable but softer
- border: subtle border color, low opacity feel
- is_dark: true if bg is dark, false if light
- CRITICAL: always ensure text is readable — never put light text on light bg or dark on dark
- Be creative and faithful to the vibe. Mango sunset = warm orange/amber + deep brown bg. Blood red aggressive = very dark bg + red accent.`;

/** Detect if a message is asking to change the app theme/vibe/colors */
export function isThemeRequest(message) {
  const lower = message.toLowerCase();
  const triggers = [
    "theme", "colour", "color", "vibe", "background", "make it", "change it",
    "switch to", "dark mode", "light mode", "aesthetic", "white", "black",
    "blue", "red", "green", "purple", "pink", "yellow", "orange", "gold",
    "neon", "pastel", "minimal", "clean", "dark", "bright", "warm", "cool",
    "chill", "hype", "aggressive", "soft", "luxury", "sunset", "midnight",
    "forest", "ocean", "fire", "space", "sky", "blood", "mango",
  ];
  return triggers.some(t => lower.includes(t));
}

/** Call /api/groq and get a theme JSON back */
async function fetchTheme(vibe) {
  const res = await fetch("/api/groq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: THEME_SYSTEM,
      messages: [{ role: "user", content: `Generate a theme for this vibe: "${vibe}"` }],
    }),
  });
  if (!res.ok) throw new Error("Theme API failed");
  const data = await res.json();
  const raw = (data.content ?? "").trim().replace(/```json|```/g, "").trim();
  return JSON.parse(raw);
}

/** Apply a theme object to :root CSS variables */
export function applyTheme(theme) {
  const root = document.documentElement;
  root.style.setProperty("--app-bg-primary",   theme.bg_primary);
  root.style.setProperty("--app-bg-secondary",  theme.bg_secondary);
  root.style.setProperty("--app-bg-card",       theme.bg_card);
  root.style.setProperty("--app-accent",        theme.accent);
  root.style.setProperty("--app-accent-bright", theme.accent_bright);
  root.style.setProperty("--app-text-primary",  theme.text_primary);
  root.style.setProperty("--app-text-muted",    theme.text_muted);
  root.style.setProperty("--app-border",        theme.border);
  // Wire into existing tokens so all components pick up changes
  root.style.setProperty("--color-bg",    theme.bg_primary);
  root.style.setProperty("--color-accent", theme.accent);
  root.style.setProperty("--text-primary", theme.text_primary);
}

/** Persist theme to localStorage + Supabase */
export function saveTheme(theme, userId, supabase) {
  localStorage.setItem("fschool_theme", JSON.stringify(theme));
  if (userId && supabase) {
    supabase.from("users")
      .upsert({ id: userId, theme }, { onConflict: "id" })
      .then(() => {})
      .catch(() => {});
  }
}

/** Load and apply saved theme on app boot */
export function loadSavedTheme(userData) {
  const theme = userData?.theme
    ?? JSON.parse(localStorage.getItem("fschool_theme") ?? "null");
  if (theme) applyTheme(theme);
}

/** Full pipeline: generate → apply → save */
export async function generateAndApplyTheme(vibe, userId, supabase) {
  const theme = await fetchTheme(vibe);
  applyTheme(theme);
  saveTheme(theme, userId, supabase);
  return theme;
}
