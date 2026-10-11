import { useState } from "react";
import { api } from "./services/api";

export default function App() {
  const [apiStatus, setApiStatus] = useState("Not checked");

  async function checkApi() {
    setApiStatus("Checking...");
    try {
      await api.get("/");
      setApiStatus("API responded successfully");
    } catch {
      setApiStatus("API is not available yet");
    }
  }

  return (
    <main className="page-shell">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <p className="eyebrow">React + Vite</p>
        <h1 id="welcome-title">Welcome to {{projectName}}</h1>
        <p className="intro">
          Your application is ready. Start building from <code>src/App.jsx</code>.
        </p>
        <div className="actions">
          <button type="button" onClick={() => void checkApi()}>
            Check API connection
          </button>
          <span className="status" role="status" aria-live="polite">
            {apiStatus}
          </span>
        </div>
        <p className="hint">
          Set <code>VITE_API_URL</code> in <code>.env</code> to connect your API.
        </p>
      </section>
    </main>
  );
}
