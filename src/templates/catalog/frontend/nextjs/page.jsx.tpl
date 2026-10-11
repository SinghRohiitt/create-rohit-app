import ApiStatus from "@/components/api-status";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <p className="eyebrow">Next.js App Router</p>
        <h1 id="welcome-title">Welcome to {{projectName}}</h1>
        <p className="intro">
          Your application is ready. Start building from <code>app/page.js</code>.
        </p>
        <ApiStatus />
        <p className="hint">
          Set <code>NEXT_PUBLIC_API_URL</code> in <code>.env</code> to connect a
          separately running backend.
        </p>
      </section>
    </main>
  );
}
