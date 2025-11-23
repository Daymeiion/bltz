import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'bebas': ['var(--font-bebas)', 'cursive'],
        'oswald': ['var(--font-oswald)', 'sans-serif'],
        'open-sans': ['var(--font-open-sans)', 'sans-serif'],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        brand: {
          DEFAULT: "#ffbb00",
          foreground: "#000000",
        },
        bltz: {
          navy: "hsl(var(--bltz-navy))",
          blue: {
            DEFAULT: "hsl(var(--bltz-blue))",
            light: "hsl(var(--bltz-blue-light))",
            dark: "hsl(var(--bltz-blue-dark))",
          },
          gold: {
            DEFAULT: "hsl(var(--bltz-gold))",
            light: "hsl(var(--bltz-gold-light))",
            dark: "hsl(var(--bltz-gold-dark))",
          },
          black: "hsl(var(--bltz-black))",
          gray: {
            dark: "hsl(var(--bltz-gray-dark))",
            DEFAULT: "hsl(var(--bltz-gray))",
            light: "hsl(var(--bltz-gray-light))",
          },
          white: "hsl(var(--bltz-white))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;