import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Box, Grid3x3, Maximize, Move, RotateCw, Thermometer, Upload, ZoomIn } from "lucide-react";
import { BackendGuardNote, Btn, PageHeader, Panel, StateView } from "@/components/nexus/primitives";
import { api } from "@/services/api";
import type { MeshMetadata } from "@/types/api";
import { cn } from "@/lib/utils";
import { pageMeta } from "@/lib/meta";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export const Route = createFileRoute("/geometry")({
  validateSearch: (search: Record<string, unknown>): { import?: "stl" | "csv" } => {
    const kind = search["import"];
    return kind === "stl" || kind === "csv" ? { import: kind } : {};
  },
  head: () => pageMeta("Geometry Workbench", "Inspect STL geometry and CSV temperature point clouds."),
  component: Geometry,
});

type Tool = "rotate" | "pan" | "zoom";
type Mode = "solid" | "wireframe" | "pointcloud";

export function Geometry() {
  const { import: importKind } = Route.useSearch();
  const stlButton = useRef<HTMLButtonElement>(null);
  const csvButton = useRef<HTMLButtonElement>(null);
  const stlRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);

  const [tool, setTool] = useState<Tool>("rotate");
  const [mode, setMode] = useState<Mode>("solid");
  const [file, setFile] = useState<string | null>(null);
  const [meta, setMeta] = useState<MeshMetadata | null>(null);
  const [status, setStatus] = useState<"empty" | "loading" | "success" | "error" | "disconnected">("empty");
  const [msg, setMsg] = useState<string>();
  const [hasModel, setHasModel] = useState(false);

  useEffect(() => {
    if (importKind === "csv") csvButton.current?.focus();
    if (importKind === "stl") stlButton.current?.focus();
  }, [importKind]);

  // Initialize Three.js viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e17);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(60, 60, 60);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(100, 150, 100);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x60a5fa, 0.6);
    dirLight2.position.set(-100, -80, -100);
    scene.add(dirLight2);

    // Subtle ground grid
    const grid = new THREE.GridHelper(100, 20, 0x2563eb, 0x1e293b);
    grid.position.y = -0.1;
    scene.add(grid);
    gridRef.current = grid;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update controls based on active tool
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (tool === "rotate") {
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
    } else if (tool === "pan") {
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      };
    } else if (tool === "zoom") {
      controls.mouseButtons = {
        LEFT: THREE.MOUSE.DOLLY,
        MIDDLE: THREE.MOUSE.ROTATE,
        RIGHT: THREE.MOUSE.PAN,
      };
    }
  }, [tool]);

  // Fit camera to current model
  const fitToView = useCallback(() => {
    const geom = geometryRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!geom || !camera || !controls) return;

    geom.computeBoundingSphere();
    const sphere = geom.boundingSphere;
    if (!sphere) return;

    const radius = Math.max(sphere.radius, 1);
    const dist = radius * 2.6;
    camera.position.set(dist * 0.8, dist * 0.7, dist * 0.9);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
  }, []);

  // Re-build 3D object when mode changes
  const applyDisplayMode = useCallback((geom: THREE.BufferGeometry, currentMode: Mode) => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (modelRef.current) {
      scene.remove(modelRef.current);
      if ("geometry" in modelRef.current && modelRef.current.geometry !== geom) {
        (modelRef.current.geometry as THREE.BufferGeometry).dispose();
      }
      modelRef.current = null;
    }

    let obj: THREE.Object3D;
    if (currentMode === "wireframe") {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        wireframe: true,
        roughness: 0.3,
        metalness: 0.2,
      });
      obj = new THREE.Mesh(geom, mat);
    } else if (currentMode === "pointcloud") {
      const mat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: Math.max((geom.boundingSphere?.radius ?? 10) * 0.02, 0.8),
      });
      obj = new THREE.Points(geom, mat);
    } else {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x2563eb,
        roughness: 0.35,
        metalness: 0.3,
        flatShading: true,
      });
      obj = new THREE.Mesh(geom, mat);
    }

    scene.add(obj);
    modelRef.current = obj;
  }, []);

  useEffect(() => {
    if (geometryRef.current) {
      applyDisplayMode(geometryRef.current, mode);
    }
  }, [mode, applyDisplayMode]);

  async function onStl(f: File) {
    setFile(f.name);
    setStatus("loading");

    // 1. Send to backend for official C++ engineering calculations
    const r = await api.geometry.uploadStl(f);
    if (r.ok) {
      const parsedMeta = { ...r.data, fileName: f.name };
      setMeta(parsedMeta);
      setStatus("success");
    } else {
      setMeta(null);
      setMsg(r.error.message);
      setStatus(r.error.code === "BACKEND_UNAVAILABLE" ? "disconnected" : "error");
    }

    // 2. Parse in browser with Three.js STLLoader for real-time 3D rendering
    try {
      const buffer = await f.arrayBuffer();
      const loader = new STLLoader();
      const geom = loader.parse(buffer);
      geom.center();
      geom.computeVertexNormals();
      geom.computeBoundingSphere();

      geometryRef.current = geom;
      applyDisplayMode(geom, mode);

      // Adjust grid size to fit model
      if (gridRef.current && geom.boundingSphere) {
        const r = geom.boundingSphere.radius;
        const gridPos = -r * 1.1;
        gridRef.current.position.y = gridPos;
      }

      fitToView();
      setHasModel(true);
    } catch (err) {
      console.error("Three.js STL parse error:", err);
    }
  }

  async function onCsv(f: File) {
    setFile(f.name);
    setStatus("loading");
    setMode("pointcloud");

    try {
      const text = await f.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) throw new Error("CSV has no data rows");

      const header = lines[0].toLowerCase().split(",").map((s) => s.trim());
      const ix = header.indexOf("x");
      const iy = header.indexOf("y");
      const iz = header.indexOf("z");
      const it = header.indexOf("temperature");

      if (ix < 0 || iy < 0 || iz < 0) throw new Error("CSV must have x, y, z columns");

      const positions: number[] = [];
      const colors: number[] = [];
      let minT = Infinity, maxT = -Infinity;
      const temps: number[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => parseFloat(c.trim()));
        if (cols.length <= Math.max(ix, iy, iz)) continue;
        positions.push(cols[ix], cols[iy], cols[iz]);
        const t = it >= 0 && !isNaN(cols[it]) ? cols[it] : 25;
        temps.push(t);
        if (t < minT) minT = t;
        if (t > maxT) maxT = t;
      }

      const count = temps.length;
      const range = maxT - minT || 1;
      const color = new THREE.Color();

      for (let i = 0; i < count; i++) {
        const norm = (temps[i] - minT) / range;
        // Blue (cold) -> Cyan -> Yellow -> Red (hot)
        color.setHSL(0.66 * (1 - norm), 1.0, 0.5);
        colors.push(color.r, color.g, color.b);
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geom.center();
      geom.computeBoundingSphere();

      geometryRef.current = geom;

      const scene = sceneRef.current;
      if (scene) {
        if (modelRef.current) scene.remove(modelRef.current);
        const mat = new THREE.PointsMaterial({
          size: Math.max((geom.boundingSphere?.radius ?? 10) * 0.02, 1.5),
          vertexColors: true,
        });
        const pts = new THREE.Points(geom, mat);
        scene.add(pts);
        modelRef.current = pts;
      }

      fitToView();
      setHasModel(true);
      setStatus("success");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to parse CSV";
      setMsg(errMsg);
      setStatus("error");
    }
  }

  const tools: { id: Tool; icon: typeof RotateCw; label: string }[] = [
    { id: "rotate", icon: RotateCw, label: "Rotate (Left drag)" },
    { id: "pan", icon: Move, label: "Pan (Left drag)" },
    { id: "zoom", icon: ZoomIn, label: "Zoom (Left drag / Scroll)" },
  ];
  const modes: { id: Mode; icon: typeof Box; label: string }[] = [
    { id: "solid", icon: Box, label: "Solid" },
    { id: "wireframe", icon: Grid3x3, label: "Wireframe" },
    { id: "pointcloud", icon: Thermometer, label: "Point cloud" },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Geometry Workbench"
        subtitle="STL mesh inspection · CSV temperature point-cloud overlay"
        actions={
          <>
            <input ref={stlRef} type="file" accept=".stl" hidden onChange={(e) => e.target.files?.[0] && onStl(e.target.files[0])} />
            <input ref={csvRef} type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])} />
            <Btn ref={csvButton} variant={importKind === "csv" ? "primary" : "outline"} onClick={() => csvRef.current?.click()}>
              <Thermometer /> Load CSV
            </Btn>
            <Btn ref={stlButton} variant={importKind === "csv" ? "outline" : "primary"} onClick={() => stlRef.current?.click()}>
              <Upload /> Upload STL
            </Btn>
          </>
        }
      />
      <BackendGuardNote />
      <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]">
        <Panel
          title="Viewport"
          bodyClassName="p-0"
          actions={
            <div className="flex items-center gap-2">
              <div className="flex border border-border rounded-sm">
                {tools.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id)}
                    title={t.label}
                    className={cn(
                      "flex h-6 w-7 items-center justify-center transition-colors",
                      tool === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                  </button>
                ))}
                <button
                  onClick={fitToView}
                  title="Fit to view"
                  className="flex h-6 w-7 items-center justify-center border-l border-border text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <Maximize className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex border border-border rounded-sm">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={cn(
                      "flex h-6 items-center gap-1 px-2 text-[11px] transition-colors",
                      mode === m.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    <m.icon className="h-3 w-3" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          }
        >
          <div className="relative h-[560px] w-full overflow-hidden bg-viewport grid-bg">
            {/* Three.js canvas container */}
            <div ref={containerRef} className="absolute inset-0 h-full w-full" />

            {/* Viewport HUD Overlays */}
            <div className="pointer-events-none absolute left-3 top-3 font-mono text-[10px] text-muted-foreground">
              TOOL: {tool.toUpperCase()} · MODE: {mode.toUpperCase()}
            </div>
            <div className="pointer-events-none absolute bottom-3 left-3 flex items-end gap-1 font-mono text-[10px]">
              <span className="text-destructive font-semibold">X</span>
              <span className="text-success font-semibold">Y</span>
              <span className="text-primary font-semibold">Z</span>
            </div>

            {mode === "pointcloud" && (
              <div className="pointer-events-none absolute bottom-3 right-3 w-40">
                <div
                  className="h-2 rounded-sm"
                  style={{
                    background:
                      "linear-gradient(90deg, #3b82f6, #06b6d4, #eab308, #ef4444)",
                  }}
                />
                <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                  <span>T min (Cold)</span>
                  <span>T max (Hot)</span>
                </div>
              </div>
            )}

            {/* Empty state placeholder when no geometry is loaded */}
            {!hasModel && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Box className="mx-auto h-10 w-10 text-border" strokeWidth={1} />
                  <p className="mt-2 text-xs text-muted-foreground">{file ? `Loaded: ${file}` : "No geometry loaded"}</p>
                  <p className="text-[11px] text-muted-foreground/70">Upload an STL file to render the mesh in 3D</p>
                </div>
              </div>
            )}
          </div>
        </Panel>

        <div className="flex flex-col gap-3">
          <Panel title="Model metadata">
            <StateView state={status} message={status === "empty" ? "Upload an STL to parse metadata." : msg}>
              {meta && (
                <dl className="space-y-1 font-mono text-[11px]">
                  {[
                    ["File", meta.fileName],
                    ["Triangles", meta.triangles.toLocaleString()],
                    ["Vertices", meta.vertices.toLocaleString()],
                    ["Surface area", `${meta.surfaceArea} mm²`],
                    ["Volume", `${meta.volume} mm³`],
                    ["Watertight", meta.watertight ? "yes" : "no"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </StateView>
          </Panel>
          <Panel title="Point cloud (CSV)">
            <p className="text-[11px] text-muted-foreground">
              Expected columns: <span className="font-mono text-foreground">x, y, z, temperature</span>. Points are colour-mapped onto the viewport.
            </p>
            <Btn className="mt-2 w-full" onClick={() => csvRef.current?.click()}>
              <Thermometer /> Select CSV file
            </Btn>
          </Panel>
        </div>
      </div>
    </div>
  );
}
