import type { Config } from "tailwindcss";

// Colours come from CSS variables in app/globals.css (the ONE place to
// change the Wishtune palette). Each variable holds an "R G B" triplet so
// Tailwind opacity modifiers (bg-brand/10) keep working.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: v("ink"), soft: v("ink-soft"), muted: v("ink-muted") },
        brand: { DEFAULT: v("brand"), dark: v("brand-dark"), light: v("brand-light") },
        accent: { DEFAULT: v("accent"), light: v("accent-light") },
        canvas: v("canvas"),
        surface: v("surface"),
        line: v("line"),
        danger: v("danger"),
        success: v("success"),
        warning: v("warning"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(var(--ink) / 0.05), 0 8px 24px -14px rgb(var(--ink) / 0.18)",
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
};
export default config;
