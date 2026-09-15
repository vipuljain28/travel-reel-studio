import { Link, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
const api = (path: string, init?: RequestInit) => fetch(`/api/v1${path}`, init).then((r) => r.json());
function Dashboard() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { api("/health").then(setHealth).catch(() => setHealth({ ok: false })); }, []);
  return (
    <div>
      <h2>Dashboard</h2>
      <p>Local-first Reel studio. AI directs; FFmpeg renders.</p>
      {health?.offline ? <span className="badge">Offline Mode</span> : <span className="badge">Online integrations optional</span>}
      <pre>{JSON.stringify(health, null, 2)}</pre>
    </div>
  );
}
function Library() {
  const [data, setData] = useState<unknown>(null);
  return (
    <div>
      <h2>Media Library</h2>
      <button onClick={() => api("/media/scan", { method: "POST" }).then(setData)}>Scan Media</button>
      <button onClick={() => api("/media").then(setData)}>Refresh</button>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
function Search() {
  const [q, setQ] = useState("Green Gate Resort, Mulshi");
  const [data, setData] = useState<unknown>(null);
  return (
    <div>
      <h2>Search</h2>
      <input value={q} onChange={(e) => setQ(e.target.value)} />
      <button onClick={() => api(`/media/search?q=${encodeURIComponent(q)}`).then(setData)}>Search</button>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
function JsonPage({ title, path }: { title: string; path: string }) {
  const [data, setData] = useState<unknown>(null);
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={() => api(path).then(setData)}>Load</button>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
export default function App() {
  return (
    <div className="layout">
      <nav>
        <h1>Travel Reel Studio</h1>
        <Link to="/">Dashboard</Link>
        <Link to="/library">Library</Link>
        <Link to="/search">Search</Link>
        <Link to="/trips">Trips</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/settings">Integrations</Link>
        <Link to="/usage">Usage</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/library" element={<Library />} />
          <Route path="/search" element={<Search />} />
          <Route path="/trips" element={<JsonPage title="Trips" path="/trips" />} />
          <Route path="/projects" element={<JsonPage title="Projects" path="/projects" />} />
          <Route path="/settings" element={<JsonPage title="Google Photos" path="/integrations/google-photos" />} />
          <Route path="/usage" element={<JsonPage title="Usage budgets" path="/usage" />} />
        </Routes>
      </main>
    </div>
  );
}
