import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primitive: {
          bg: "#0f172a",
          surface: "#1e293b",
          border: "#334155",
          muted: "#64748b",
          accent: "#0d9488",
          accentHover: "#0f766e",
        },
      },
    },
  },
  plugins: [],
};
export default config;
