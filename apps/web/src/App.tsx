import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const api = (path: string, init?: RequestInit) =>
  fetch(`/api/v1${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const message = data.error || data.message || r.statusText;
      console.error("[trs]", path, r.status, data);
      throw new Error(message);
    }
    return data;
  });

function Badge({ children }: { children: string }) {
  return <span className="badge">{children}</span>;
}

function Dashboard() {
  const [health, setHealth] = useState<any>(null);
  useEffect(() => {
    api("/health").then(setHealth).catch((e) => {
      console.error("[trs] health", e);
      setHealth({ ok: false });
    });
  }, []);
  return (
    <div>
      <h2>Dashboard</h2>
      <p>Local-first travel Reels. AI directs the storyboard. FFmpeg renders the file.</p>
      {health?.offline ? <Badge>Offline Mode</Badge> : <Badge>Hybrid available</Badge>}
      <div className="grid">
        <Link className="card" to="/library">Scan library</Link>
        <Link className="card" to="/search">Search a place</Link>
        <Link className="card" to="/projects">Make a reel</Link>
      </div>
      <pre>{JSON.stringify(health, null, 2)}</pre>
    </div>
  );
}

function Library() {
  const [items, setItems] = useState<any[]>([]);
  const [scan, setScan] = useState<any>(null);
  const load = () => api("/media").then((d) => setItems(d.items || []));
  useEffect(() => { load(); }, []);
  return (
    <div>
      <h2>Library</h2>
      <button onClick={() => api("/media/scan", { method: "POST" }).then(setScan).then(load)}>Scan MEDIA_ROOT</button>
      <button onClick={load}>Refresh</button>
      {scan && <p>{scan.upserted} upserted · {scan.skipped} skipped · {scan.duplicates} dups</p>}
      <div className="grid">
        {items.map((m) => (
          <div className="card" key={m.id}>
            <strong>{(m.filePath || m.providerMediaId || m.id).split(/[/\\]/).pop()}</strong>
            <div>{m.provider} · {m.locationName || "no place"} · q {Number(m.qualityScore || 0).toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Search() {
  const [q, setQ] = useState("Green Gate Resort, Mulshi");
  const [items, setItems] = useState<any[]>([]);
  return (
    <div>
      <h2>Search</h2>
      <input value={q} onChange={(e) => setQ(e.target.value)} style={{ width: "min(480px, 80%)" }} />
      <button onClick={() => api(`/media/search?q=${encodeURIComponent(q)}`).then((d) => setItems(d.items || []))}>Search</button>
      <p>{items.length} matches</p>
      <div className="grid">
        {items.map((m) => (
          <div className="card" key={m.id}>{m.filePath || m.id}<div>{m.provider} · {m.locationName}</div></div>
        ))}
      </div>
    </div>
  );
}

function Trips() {
  const [items, setItems] = useState<any[]>([]);
  const load = () => api("/trips").then((d) => setItems(d.items || []));
  useEffect(() => { load(); }, []);
  return (
    <div>
      <h2>Trips</h2>
      <button onClick={() => api("/trips/detect", { method: "POST" }).then(load)}>Detect trips</button>
      {items.map((t) => (
        <div className="card" key={t.id}>
          <strong>{t.title}</strong>
          <div>{t.media?.length ?? 0} clips</div>
        </div>
      ))}
    </div>
  );
}

function Projects() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("Mulshi weekend reel");
  const [destination, setDestination] = useState("Green Gate Resort, Mulshi");
  const load = () => api("/projects").then((d) => setItems(d.items || []));
  useEffect(() => { load(); }, []);
  return (
    <div>
      <h2>Projects</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <input value={destination} onChange={(e) => setDestination(e.target.value)} />
      <button onClick={async () => {
        const p = await api("/projects", { method: "POST", body: JSON.stringify({ title, destination, templateId: "viral-travel" }) });
        nav(`/projects/${p.id}`);
      }}>Create</button>
      {items.map((p) => (
        <div className="card" key={p.id}>
          <Link to={`/projects/${p.id}`}>{p.title}</Link>
          <div>{p.destination} · {p.templateId}</div>
        </div>
      ))}
    </div>
  );
}

function ProjectStudio() {
  const id = location.pathname.split("/").pop() || "";
  const [project, setProject] = useState<any>(null);
  const [storyboard, setStoryboard] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [err, setErr] = useState("");
  const load = () => api(`/projects/${id}`).then(setProject);
  useEffect(() => { load(); }, [id]);
  return (
    <div>
      <h2>{project?.title || "Project"}</h2>
      {err && <p className="err">{err}</p>}
      <button onClick={() => api(`/projects/${id}/storyboard`, { method: "POST", body: "{}" }).then((d) => { setStoryboard(d.storyboard); setProject(d.project); }).catch((e) => setErr(e.message))}>Generate storyboard</button>
      <button onClick={() => api(`/projects/${id}/render-plan`).then(setPlan).catch((e) => setErr(e.message))}>Build RenderPlan</button>
      <button onClick={async () => {
        try {
          const d = await api("/render", { method: "POST", body: JSON.stringify({ projectId: id }) });
          setJob(d.job);
        } catch (e: any) { setErr(e.message); }
      }}>Render</button>
      {job && <button onClick={() => api(`/render/${job.id}`).then(setJob)}>Poll job</button>}
      {storyboard && <pre>{JSON.stringify(storyboard, null, 2)}</pre>}
      {plan && <pre>{JSON.stringify(plan, null, 2)}</pre>}
      {job && <pre>{JSON.stringify(job, null, 2)}</pre>}
    </div>
  );
}

function Integrations() {
  const [photos, setPhotos] = useState<any>(null);
  const [places, setPlaces] = useState<any>(null);
  const [gemini, setGemini] = useState<any>(null);
  const [err, setErr] = useState("");
  const params = new URLSearchParams(window.location.search);
  const photosFlag = params.get("photos");
  const reason = params.get("reason") || "";
  const load = () => {
    api("/integrations/google-photos").then((d) => {
      setPhotos(d);
      if (d.errors) console.error("[trs] photos status errors", d.errors);
    }).catch((e) => {
      console.error("[trs] photos status", e);
      setErr(e.message);
    });
    api("/integrations/places").then(setPlaces);
    api("/integrations/gemini").then(setGemini);
  };
  useEffect(() => {
    if (photosFlag === "error") console.error("[trs] photos callback error", reason || "missing_code_or_denied");
    if (photosFlag === "connected") console.log("[trs] photos connected");
    load();
  }, []);
  return (
    <div>
      <h2>Integrations</h2>
      {photosFlag === "connected" && <p className="badge">Google Photos connected</p>}
      {photosFlag === "error" && <p className="err">Photos error: {reason || "missing_code or denied"}</p>}
      {err && <p className="err">{err}</p>}
      <div className="card">
        <strong>Google Photos</strong>
        <div>status: {photos?.status} · connected: {String(photos?.connected)}</div>
        <div>lastSync: {photos?.lastSync || "never"} · items: {photos?.itemsProcessed ?? 0}</div>
        {photos?.errors && <pre className="err">{photos.errors}</pre>}
        <button onClick={async () => {
          try {
            const d = await api("/integrations/google-photos/connect");
            console.log("[trs] photos login URL", d.authorizationUrl);
            if (d.authorizationUrl) window.location.href = d.authorizationUrl;
            else setErr("no authorizationUrl");
          } catch (e: any) {
            console.error("[trs] photos connect", e);
            setErr(e.message);
          }
        }}>Connect Google Photos</button>
        <button onClick={() => api("/integrations/google-photos/sync", { method: "POST" }).then((d) => {
          console.log("[trs] photos sync", d);
          setPhotos(d);
          load();
        }).catch((e) => {
          console.error("[trs] photos sync", e);
          setErr(e.message);
        })}>Sync library</button>
      </div>
      <div className="card">Places: {places?.status}</div>
      <div className="card">Gemini: {gemini?.status}</div>
    </div>
  );
}

function Usage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api("/usage").then(setData); }, []);
  return (
    <div>
      <h2>Usage budgets</h2>
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
          <Route path="/trips" element={<Trips />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectStudio />} />
          <Route path="/settings" element={<Integrations />} />
          <Route path="/usage" element={<Usage />} />
        </Routes>
      </main>
    </div>
  );
}
