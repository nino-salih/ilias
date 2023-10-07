import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{html,ejs}","./views/**/*.{html,ejs}"],
  theme: {
    extend: {
      colors: {
        'primary-600': '#FF3838',
        'primary-400': '#FF5D5D',
        'primary-200': '#FF9A9A',
      },
    },
  },
  plugins: [],
} as Config;