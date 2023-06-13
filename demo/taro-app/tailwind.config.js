/** @type {import('tailwindcss').Config} */
module.exports = {
  // https://github.com/mrmlnc/fast-glob
  content: ["./src/**/*.{html,js,ts,jsx,tsx}", "!./src/moduleB/**/*.{html,js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
  corePlugins: {
    preflight: false
  }
}
