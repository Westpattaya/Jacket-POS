import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown) {
    console.error("Root render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", padding: 24, background: "#111827", color: "#fff", fontFamily: "ui-sans-serif, system-ui" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>App failed to load</h1>
          <p style={{ opacity: 0.85, marginBottom: 8 }}>Please check Vercel environment variables:</p>
          <code style={{ display: "block", whiteSpace: "pre-wrap", background: "#1f2937", padding: 12, borderRadius: 8, marginBottom: 12 }}>
            VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
          </code>
          <p style={{ opacity: 0.9 }}>Error: {this.state.errorMessage}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>
);
