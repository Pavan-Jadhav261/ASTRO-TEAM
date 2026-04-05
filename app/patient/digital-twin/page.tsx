"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AbhaLogo } from "@/components/neo/abha-logo";
import { ThemeToggle } from "@/components/neo/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const annotations = [
  { id: "shoulder", label: "Shoulder strain detected", pos: [0.35, 0.95, 0.15], side: "right" },
  { id: "lower-back", label: "Lower back discomfort", pos: [-0.2, 0.35, 0.2], side: "left" },
  { id: "leg", label: "Leg injury (left)", pos: [-0.15, -0.85, 0.12], side: "right" },
] as const;

export default function DigitalTwinPage() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const calloutRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [insights, setInsights] = useState<{
    predictedOutcomes: string;
    measuresToTake: string;
    visitDoctor: string;
  } | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#000000");
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    const spot = new THREE.SpotLight(0x88ccff, 1.1);
    spot.position.set(3, 6, 2);
    scene.add(ambient, spot);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;

    const loader = new GLTFLoader();
    let model: THREE.Object3D | null = null;
    let modelBox: THREE.Box3 | null = null;

    loader.load("/human_body_base_mesh_male.glb", (gltf) => {
      model = gltf.scene;
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = new THREE.MeshStandardMaterial({ color: "#ffffff" });
        }
      });
      model.scale.set(1.05, 1.05, 1.05);
      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center);
      modelBox = new THREE.Box3().setFromObject(model);
      scene.add(model);

      if (modelBox) {
        const size = new THREE.Vector3();
        const boxCenter = new THREE.Vector3();
        modelBox.getSize(size);
        modelBox.getCenter(boxCenter);
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2)) * 1.8;
        camera.position.set(boxCenter.x, boxCenter.y, cameraZ + size.z * 0.35);
        controls.target.copy(boxCenter);
        controls.minDistance = cameraZ * 0.8;
        controls.maxDistance = cameraZ * 2.2;
        controls.update();
      }
    });

    const localPoints = annotations.map((item) => ({
      ...item,
      vec: new THREE.Vector3(item.pos[0], item.pos[1], item.pos[2]),
    }));

    const updateCallouts = () => {
      if (!model) return;
      const canvas = renderer.domElement;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      const placed: { x: number; y: number; w: number; h: number }[] = [];

      localPoints.forEach((item) => {
        const callout = calloutRefs.current[item.id];
        if (!callout) return;
        const world = item.vec.clone();
        model.localToWorld(world);
        world.project(camera);
        if (world.z < -1 || world.z > 1) {
          callout.style.opacity = "0";
          return;
        }

        const anchorX = (world.x * 0.5 + 0.5) * w;
        const anchorY = (-world.y * 0.5 + 0.5) * h;

        const boxW = callout.offsetWidth;
        const boxH = callout.offsetHeight;
        const baseOffset = item.side === "right" ? 28 : -boxW - 28;

        let x = anchorX + baseOffset;
        let y = anchorY - boxH / 2;

        const minX = 8;
        const maxX = w - boxW - 8;
        const minY = 8;
        const maxY = h - boxH - 8;

        x = Math.max(minX, Math.min(maxX, x));
        y = Math.max(minY, Math.min(maxY, y));

        // Simple collision resolution
        for (let i = 0; i < placed.length; i += 1) {
          const p = placed[i];
          const overlapX = x < p.x + p.w && x + boxW > p.x;
          const overlapY = y < p.y + p.h && y + boxH > p.y;
          if (overlapX && overlapY) {
            y = Math.min(maxY, p.y + p.h + 8);
          }
        }

        placed.push({ x, y, w: boxW, h: boxH });

        const dx = anchorX - (x + boxW / 2);
        const dy = anchorY - (y + boxH / 2);
        const distance = Math.max(24, Math.sqrt(dx * dx + dy * dy));
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

        callout.style.transform = `translate(${x}px, ${y}px)`;
        callout.style.opacity = "1";
        callout.style.setProperty("--callout-distance", `${distance}px`);
        callout.style.setProperty("--callout-angle", `${angle}deg`);
      });
    };

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      updateCallouts();
      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const newWidth = mountRef.current.clientWidth;
      const newHeight = mountRef.current.clientHeight;
      renderer.setSize(newWidth, newHeight);
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      if (modelBox) {
        const size = new THREE.Vector3();
        const boxCenter = new THREE.Vector3();
        modelBox.getSize(size);
        modelBox.getCenter(boxCenter);
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const cameraZ = Math.abs((maxDim / 2) / Math.tan(fov / 2)) * 1.8;
        camera.position.set(boxCenter.x, boxCenter.y, cameraZ + size.z * 0.35);
        controls.target.copy(boxCenter);
        controls.update();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        setInsightError(null);
        const patientId = localStorage.getItem("abha_patient_id") || "";
        const res = await fetch("/api/patient/digital-twin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load insights.");
        }
        setInsights(data.insights || null);
      } catch (err: any) {
        setInsightError(err?.message || "Failed to load insights.");
      } finally {
        setLoadingInsights(false);
      }
    };
    loadInsights();
  }, []);

  return (
    <div className="min-h-screen abha-mesh neo-bg px-6 py-6">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <AbhaLogo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/patient/dashboard" className="text-sm text-[color:var(--text-secondary)]">
            <ArrowLeft size={14} className="mr-2 inline-block" />
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto mt-8 grid w-full max-w-6xl gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <Card className="neo-card">
          <CardHeader>
            <CardTitle>Digital Twin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[30rem] w-full rounded-3xl border border-[color:var(--border)] bg-black sm:h-[34rem] lg:h-[38rem]">
              <div className="absolute inset-0" ref={mountRef} />
              <div className="pointer-events-none absolute inset-0">
                {annotations.map((item) => (
                  <div
                    key={item.id}
                    ref={(el) => {
                      calloutRefs.current[item.id] = el;
                    }}
                    className="absolute left-0 top-0 flex items-center gap-3 rounded-2xl border border-[color:var(--accent-secondary)]/30 bg-black/70 px-3 py-2 text-[11px] text-[color:var(--text-primary)] shadow-[0_14px_40px_-24px_rgba(59,130,246,0.5)]"
                  >
                    <span>{item.label}</span>
                    <span
                      className="pointer-events-none absolute left-1/2 top-1/2 h-px bg-[color:var(--accent-secondary)]/80"
                      style={{
                        width: "var(--callout-distance)",
                        transformOrigin: "left center",
                        transform: "translate(-50%, -50%) rotate(var(--callout-angle))",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-xs text-[color:var(--text-secondary)]">
              Drag to orbit - Scroll to zoom
            </p>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="neo-card">
            <CardHeader>
              <CardTitle>Predicted Outcomes</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-[color:var(--text-secondary)] sm:text-sm">
              {loadingInsights
                ? "Analyzing your recent summaries..."
                : insightError
                  ? insightError
                  : insights?.predictedOutcomes || "No predictions available yet."}
            </CardContent>
          </Card>
          <Card className="neo-card">
            <CardHeader>
              <CardTitle>Measures to Take</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-[color:var(--text-secondary)] sm:text-sm">
              {loadingInsights
                ? "Preparing recommendations..."
                : insightError
                  ? "Unable to load recommendations."
                  : insights?.measuresToTake || "No recommendations available yet."}
            </CardContent>
          </Card>
          <Card className="neo-card">
            <CardHeader>
              <CardTitle>When to Visit a Doctor</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-[color:var(--text-secondary)] sm:text-sm">
              {loadingInsights
                ? "Summarizing triggers..."
                : insightError
                  ? "Unable to load doctor guidance."
                  : insights?.visitDoctor || "No guidance available yet."}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
