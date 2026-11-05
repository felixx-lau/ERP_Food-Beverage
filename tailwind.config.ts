import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modern Blue + Purple (Indigo-Violet) Brand design tokens
        brand: {
          blue: "#1d4ed8",       // Primary action, active menu (Royal Blue)
          "blue-dark": "#1e3a8a",// Hover/Dark (Navy/Deep Blue)
          "blue-light": "#2563eb",// Vibrant Blue
          "blue-tint": "rgba(29, 78, 216, 0.08)",
          purple: "#7c3aed",     // Accent color (Vibrant Violet/Purple)
          "purple-dark": "#6d28d9",// Darker Purple
          "purple-light": "#8b5cf6",// Light Purple
          "purple-text": "#6d28d9", // High contrast purple text on white (7.8:1)
          "purple-button": "#7c3aed",
          "purple-button-text": "#ffffff",
          "purple-button-hover": "#6d28d9",
          "hero-tile-bg": "#1e293b", // Deep slate/indigo glass background for hero tiles
          "hero-tile-text": "#ffffff",
          "hero-tile-sub": "#e0e7ff", // Periwinkle light sub
          "hero-chip-bg": "#ede9fe", // Lavender chip
          "hero-chip-text": "#5b21b6", // Deep violet text for chip (9.4:1)

          // Aliases for seamless backward compatibility
          green: "#1d4ed8",
          "green-dark": "#1e3a8a",
          "green-light": "#2563eb",
          "green-tint": "rgba(29, 78, 216, 0.08)",
          "gold-button": "#7c3aed",
          "gold-button-text": "#ffffff",
          "gold-button-hover": "#6d28d9",
          "gold-text": "#6d28d9",
        },
        status: {
          success: {
            DEFAULT: "#166534",
            bg: "rgba(22, 101, 52, 0.12)",
            border: "rgba(22, 101, 52, 0.30)",
            text: "#166534",
          },
          warning: {
            DEFAULT: "#854d0e",
            bg: "rgba(133, 77, 14, 0.12)",
            border: "rgba(133, 77, 14, 0.30)",
            text: "#854d0e",
          },
          danger: {
            DEFAULT: "#991b1b",
            bg: "rgba(153, 27, 27, 0.12)",
            border: "rgba(153, 27, 27, 0.30)",
            text: "#991b1b",
          },
          info: {
            DEFAULT: "#1d4ed8",
            bg: "rgba(29, 78, 216, 0.12)",
            border: "rgba(29, 78, 216, 0.30)",
            text: "#1d4ed8",
          },
        },
        indigo: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        violet: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Plus Jakarta Sans",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(29, 78, 216, 0.04), 0 1px 2px -1px rgba(29, 78, 216, 0.02)",
        card: "0 2px 8px -2px rgba(29, 78, 216, 0.08), 0 1px 4px -1px rgba(29, 78, 216, 0.04)",
        dropdown: "0 10px 25px -5px rgba(29, 78, 216, 0.12), 0 8px 10px -6px rgba(29, 78, 216, 0.08)",
        "glass-1": "0 8px 32px 0 rgba(29, 78, 216, 0.07), inset 0 1px 0 0 rgba(255, 255, 255, 0.85)",
        "glass-2": "0 4px 20px -2px rgba(29, 78, 216, 0.06), 0 2px 6px -1px rgba(29, 78, 216, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.90)",
        "glass-3": "0 2px 12px -1px rgba(29, 78, 216, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.95)",
        "glass-hover": "0 12px 32px -4px rgba(29, 78, 216, 0.14), 0 4px 10px -2px rgba(124, 58, 237, 0.08), inset 0 1px 0 0 #FFFFFF",
        "glass-modal": "0 24px 60px -12px rgba(15, 23, 42, 0.25), 0 8px 24px -4px rgba(124, 58, 237, 0.12), inset 0 1px 0 0 #FFFFFF",
      },
      zIndex: {
        background: "-10",
        sidebar: "30",
        topbar: "40",
        dropdown: "45",
        "modal-backdrop": "50",
        modal: "55",
        toast: "60",
        tooltip: "70",
      },
    },
  },
  plugins: [],
};
export default config;
