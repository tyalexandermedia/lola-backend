export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand surfaces — kept distinct from slate so we can tune them without
        // touching every other slate use across the UI.
        navy: {
          DEFAULT: "#0B1220",
          card:    "#0F1724",
        },
        // Accessible gold accents. gold-400 is the primary accent (gradient
        // start). gold-500 is the deep hover / gradient end.
        gold: {
          50:  "#FFF8E1",
          100: "#FFECB3",
          200: "#FFE082",
          300: "#FFE08F",
          400: "#FFD166",
          500: "#F4B942",
          600: "#C99A2E",
          700: "#A47C24",
          800: "#7F5E1B",
          900: "#5A4112",
        },
        amber: {
          glow: "#FFB703",
        },
        lola: {
          50:  "#fdf5ff",
          100: "#f6e7fe",
          200: "#ead0fb",
          300: "#d6aaf5",
          400: "#c185ef",
          500: "#a560e7",
          600: "#8c3edd",
          700: "#762fb7",
          800: "#5e288f",
          900: "#4d216f",
        },
      },
      boxShadow: {
        soft:        "0 24px 80px rgba(99, 72, 201, 0.12)",
        "gold-glow": "0 8px 24px rgba(255, 177, 0, 0.18)",
      },
      transitionTimingFunction: {
        "press": "cubic-bezier(0.2, 0.8, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
