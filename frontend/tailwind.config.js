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
          navy: "#0c1e3d",
          ice: "#e8f2ff",
          teal: "#0d9488",
        },
      },
    },
  },
  plugins: [
    /** Decorative motion off only when the OS requests reduction (not in-app preset). */
    function demaMotionPlugin({ addVariant }) {
      addVariant("dema-low-motion", ["@media (prefers-reduced-motion: reduce) { & }"]);
    },
  ],
};
