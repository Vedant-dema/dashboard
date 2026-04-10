/** @type {import('tailwindcss').Config} */
/** Typography-only scale (spacing/icons stay fixed). Driven by `html { --dema-font-scale }`. */
function demaScaledFontSize(remSize, lineHeightRemOrUnitless) {
  const fontSize = `calc(${remSize} * var(--dema-font-scale, 1))`;
  if (lineHeightRemOrUnitless === "1") {
    return [fontSize, { lineHeight: "1" }];
  }
  return [
    fontSize,
    {
      lineHeight: `calc(${lineHeightRemOrUnitless} * var(--dema-font-scale, 1))`,
    },
  ];
}

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontSize: {
        xs: demaScaledFontSize("0.75rem", "1rem"),
        sm: demaScaledFontSize("0.875rem", "1.25rem"),
        base: demaScaledFontSize("1rem", "1.5rem"),
        lg: demaScaledFontSize("1.125rem", "1.75rem"),
        xl: demaScaledFontSize("1.25rem", "1.75rem"),
        "2xl": demaScaledFontSize("1.5rem", "2rem"),
        "3xl": demaScaledFontSize("1.875rem", "2.25rem"),
        "4xl": demaScaledFontSize("2.25rem", "2.5rem"),
        "5xl": demaScaledFontSize("3rem", "1"),
        "6xl": demaScaledFontSize("3.75rem", "1"),
        "7xl": demaScaledFontSize("4.5rem", "1"),
        "8xl": demaScaledFontSize("6rem", "1"),
        "9xl": demaScaledFontSize("8rem", "1"),
      },
      fontFamily: {
        /* All stacks follow Settings → Display typeface (including tables/codes that use font-mono). */
        sans: ["var(--dema-font-stack)"],
        serif: ["var(--dema-font-stack)"],
        mono: ["var(--dema-font-stack)"],
      },
      colors: {
        dema: {
          blue: "#2563eb",
          teal: "#0d9488",
        },
      },
      keyframes: {
        timetableFadeUp: {
          "0%": { opacity: "0", transform: "translate3d(0,16px,0) scale(0.985)" },
          "100%": { opacity: "1", transform: "translate3d(0,0,0) scale(1)" },
        },
        timetableFadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        timetableStat: {
          "0%": { opacity: "0", transform: "translate3d(0,12px,0)" },
          "100%": { opacity: "1", transform: "translate3d(0,0,0)" },
        },
        timetableBlob: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "40%": { transform: "translate3d(3%,-4%,0) scale(1.06)" },
          "70%": { transform: "translate3d(-4%,3%,0) scale(0.94)" },
        },
        /** Staggered overview cards / smart-summary lines in contact drawer */
        contactCardIn: {
          "0%": { opacity: "0", transform: "translate3d(0,18px,0)" },
          "100%": { opacity: "1", transform: "translate3d(0,0,0)" },
        },
      },
      animation: {
        "timetable-fade-up": "timetableFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "timetable-fade-in": "timetableFadeIn 0.7s ease-out both",
        "timetable-stat": "timetableStat 0.55s cubic-bezier(0.16, 1, 0.3, 1) both",
        "timetable-blob": "timetableBlob 22s ease-in-out infinite",
        "contact-card-in":
          "contactCardIn 0.52s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
