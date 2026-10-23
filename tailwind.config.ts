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
        night: "#0b101b",
        "night-card": "#111827",
        "moon-blue": "#2563eb",
        "moon-glow": "#3b82f6",
        "cyan-accent": "#06b6d4",
        "amber-gold": "#f59e0b",
      },
    },
  },
  plugins: [],
};
export default config;
