/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"] ,
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'IBM Plex Sans'", "sans-serif"]
      },
      colors: {
        ink: {
          900: "#141519",
          800: "#1E2026",
          700: "#2E3138",
          600: "#3B3F49",
          500: "#4B5160",
          200: "#CAD0DD",
          100: "#E8ECF4"
        },
        sand: {
          50: "#F8F5F1",
          100: "#F0E9E1",
          200: "#E2D6C8"
        },
        leaf: {
          500: "#2D6A4F",
          400: "#3D8B62"
        },
        ember: {
          500: "#C85C3B",
          400: "#E0714E"
        },
        ocean: {
          500: "#1F5B7A",
          400: "#2A7CA0"
        }
      },
      boxShadow: {
        card: "0 22px 60px rgba(20, 21, 25, 0.08)",
        glow: "0 0 0 1px rgba(20, 21, 25, 0.06), 0 15px 40px rgba(20, 21, 25, 0.08)"
      }
    }
  },
  plugins: []
};
