"use client";

import { useState } from "react";
import { api } from "@/services/api";

export default function ApiStatus() {
  const [status, setStatus] = useState("Not checked");

  async function checkApi() {
    setStatus("Checking...");
    try {
      await api.get("/health");
      setStatus("Backend responded successfully");
    } catch {
      setStatus("Backend is not available yet");
    }
  }

  return (
    <div className="actions">
      <button type="button" onClick={() => void checkApi()}>
        Check backend connection
      </button>
      <span className="status" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
