/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 🎨 SUAS CORES
        moss: {
          900: 'hsl(152 51% 21%)',
          800: 'hsl(152 51% 28%)',
          700: 'hsl(152 51% 35%)',
          600: 'hsl(152 51% 42%)'
        },
        creme: 'hsl(45 92% 97%)',
        'soft-orange': 'hsl(32 95% 60%)',
        'earth-brown': 'hsl(20 15% 20%)',
      
        // 🎯 CORES DO SISTEMA (shadcn)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
      
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
    
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
      },
    
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
}
