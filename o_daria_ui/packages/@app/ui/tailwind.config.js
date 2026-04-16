// CommonJS re-export so postcss.config.js can require('@app/ui/tailwind.config')
// The actual config lives in tailwind.config.ts; this shim is for tooling that can't use TS directly.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../apps/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jade: { DEFAULT: "#2D6A4F", light: "#52B788", dark: "#1B4332" },
        porcelain: { DEFAULT: "#4A7FA5", light: "#74B3CE", dark: "#2C5F7A" },
        gold: { DEFAULT: "#C9A84C", light: "#E9C46A", dark: "#9A7B2E" },
        ivory: { DEFAULT: "#F5F0E8", dark: "#EDE4D3" },
        ink: { DEFAULT: "#1C2B22", light: "#2D3F35" },
        success: "#2D6A4F",
        warning: "#C9A84C",
        error: "#C1440E",
        info: "#4A7FA5",
        disabled: "#9CA3AF",
        surface: "#FAF6EE",
        "surface-elevated": "#F0EAD8",
        "surface-dark": "#1C2B22",
        "button-primary-bg": "#2D6A4F",
        "button-primary-hover": "#1B4332",
        "button-secondary-bg": "#F5F0E8",
        "button-secondary-border": "#C9A84C",
        "card-border": "#C9A84C",
        "card-bg": "#FAF6EE",
        "input-border": "#9CA3AF",
        "input-focus-border": "#4A7FA5",
        "badge-processing-bg": "#EDE4D3",
        "badge-success-bg": "#D1FAE5",
        "sidebar-bg": "#C9A84C",
        "sidebar-text": "#1C2B22",
        "sidebar-active": "#B8942E",
        "sidebar-active-text": "#FAF6EE",
        "main-bg": "#1C2B22",
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"IM Fell English"', "serif"],
        body: ["Inter", '"DM Sans"', "sans-serif"],
        sans: ["Inter", '"DM Sans"', "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 8px rgba(201, 168, 76, 0.15)",
        "card-hover": "0 4px 16px rgba(201, 168, 76, 0.25)",
        dialog: "0 8px 32px rgba(28, 43, 34, 0.2)",
      },
    },
  },
  plugins: [],
};
