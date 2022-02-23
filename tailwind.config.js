module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["Consolas", "Liberation Mono", "Courier New", "monospace"],
      },
    },
    plugins: [
      require('@tailwindcss/forms'),
    ],
  }
}
