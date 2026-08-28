import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f4f8',
          100: '#b8dce8',
          200: '#88c4d8',
          300: '#58acc8',
          400: '#2894b8',
          500: '#1a5276',
          600: '#15425e',
          700: '#103247',
          800: '#0b212f',
          900: '#061118',
        },
        danger: {
          low: '#27ae60',
          moderate: '#f39c12',
          severe: '#e67e22',
          critical: '#e74c3c',
        },
      },
    },
  },
  plugins: [],
};

export default config;
