module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          'Open Sans',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace'
        ]
      }
    },
    plugins: []
  }
}
