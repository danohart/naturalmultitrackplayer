import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1b294c',
          alt: '#657499',
        },
        secondary: {
          DEFAULT: '#e5ba5c',
          bold: '#e92629',
        },
        gray: {
          lightest: '#e5e5e5',
          light: '#ced3de',
          dark: '#434d66',
        },
      },
    },
  },
  plugins: [],
};

export default config;