import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./{app,components}/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
