/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  // Preflight (Tailwind's CSS reset) is disabled so it doesn't fight the
  // hand-written styles in index.css / CaseRegistration.jsx.
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
