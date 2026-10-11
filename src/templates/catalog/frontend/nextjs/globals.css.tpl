:root {
  color-scheme: light;
  font-family:
    Arial, Helvetica, sans-serif;
  color: #172033;
  background: #f4f7fb;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
}

button,
code {
  font: inherit;
}

.page-shell {
  display: grid;
  min-height: 100vh;
  padding: 2rem;
  place-items: center;
}

.welcome-card {
  width: min(100%, 42rem);
  padding: clamp(2rem, 6vw, 4rem);
  border: 1px solid #e2e8f0;
  border-radius: 1.25rem;
  background: #fff;
  box-shadow: 0 1.5rem 4rem rgb(30 41 59 / 8%);
}

.eyebrow {
  margin: 0 0 1rem;
  color: #4f46e5;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.25rem);
  letter-spacing: -0.05em;
}

.intro {
  margin: 1rem 0 2rem;
  color: #526078;
  line-height: 1.7;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

button {
  padding: 0.8rem 1rem;
  border: 0;
  border-radius: 0.65rem;
  color: #fff;
  background: #4f46e5;
  cursor: pointer;
  font-weight: 650;
}

button:hover {
  background: #4338ca;
}

button:focus-visible {
  outline: 3px solid #a5b4fc;
  outline-offset: 3px;
}

.status,
.hint {
  color: #526078;
  font-size: 0.9rem;
}

.hint {
  margin: 2rem 0 0;
}

code {
  padding: 0.15rem 0.35rem;
  border-radius: 0.3rem;
  background: #f1f5f9;
  color: #334155;
  font-size: 0.9em;
}
