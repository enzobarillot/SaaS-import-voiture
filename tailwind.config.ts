import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        mist: "#eef2ff",
        sand: "#fff7ed",
        pine: "#14532d",
        ember: "#9a3412",
        slate: "#475569"
      },
      boxShadow: {
        soft: "0 20px 55px rgba(15, 23, 42, 0.08)"
      },
      fontFamily: {
        body: ["Aptos", "Trebuchet MS", "Segoe UI", "sans-serif"],
        display: ["Georgia", "Times New Roman", "serif"]
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(17,24,39,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(17,24,39,0.05) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
