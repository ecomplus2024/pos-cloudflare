/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{js,jsx,html}"],
  safelist: [
    // Grid responsive variants (dùng động trong JSX)
    "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-4", "sm:grid-cols-5", "sm:grid-cols-6",
    "md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3", "md:grid-cols-4", "md:grid-cols-5", "md:grid-cols-6",
    "lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4", "lg:grid-cols-5", "lg:grid-cols-6",
    "xl:grid-cols-1", "xl:grid-cols-2", "xl:grid-cols-3", "xl:grid-cols-4", "xl:grid-cols-5", "xl:grid-cols-6",
    // Common utilities
    "max-w-7xl", "max-w-6xl", "max-w-5xl", "max-w-4xl", "max-w-3xl", "max-w-2xl", "max-w-md", "max-w-sm", "max-w-lg", "max-w-xl",
    "min-h-screen", "sticky-top-72", "sticky-top-120",
    // Common opacity/scale/translate values
    "animate-blob", "animate-bounce-slow", "animate-ping", "animate-wiggle", "animate-pulse-ring", "animate-spin",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
        // Primary blue palette (dùng cho PublicMenu + các gradient/shadow/ring)
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
    },
  },
  plugins: [],
};
