/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            color: "#334155",
            p: {
              marginTop: "1em",
              marginBottom: "1em",
            },
            "ul > li": {
              position: "relative",
              paddingLeft: "1.5em",
              marginTop: "0.5em",
              marginBottom: "0.5em",
            },
            "ul > li::before": {
              content: '""',
              position: "absolute",
              backgroundColor: "#94a3b8",
              borderRadius: "50%",
              width: "0.375em",
              height: "0.375em",
              top: "calc(0.875em - 0.1875em)",
              left: "0.25em",
            },
            "ol > li": {
              position: "relative",
              paddingLeft: "0.5em",
              marginTop: "0.5em",
              marginBottom: "0.5em",
            },
            "ol > li::marker": {
              color: "#64748b",
            },
            blockquote: {
              fontStyle: "normal",
              borderLeftWidth: "0.25rem",
              borderLeftColor: "#e2e8f0",
              quotes: "none",
              marginTop: "1.6em",
              marginBottom: "1.6em",
              paddingLeft: "1em",
            },
            code: {
              color: "#0f172a",
              backgroundColor: "#f1f5f9",
              borderRadius: "0.25rem",
              padding: "0.2em 0.4em",
              fontWeight: "400",
            },
            "code::before": {
              content: "none",
            },
            "code::after": {
              content: "none",
            },
            h2: {
              color: "#0f172a",
              fontWeight: "600",
              fontSize: "1.5em",
              marginTop: "2em",
              marginBottom: "1em",
              lineHeight: "1.3333333",
            },
            h3: {
              color: "#0f172a",
              fontWeight: "600",
              fontSize: "1.25em",
              marginTop: "1.6em",
              marginBottom: "0.6em",
              lineHeight: "1.6",
            },
            pre: {
              backgroundColor: "#1e293b",
              color: "#e2e8f0",
              padding: "1em",
              borderRadius: "0.375rem",
              overflowX: "auto",
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
