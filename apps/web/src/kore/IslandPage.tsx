import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

import { SidebarInset } from "../components/ui/sidebar";

const ISLAND_BACKGROUND = "#0A0B0E";
const BOX_COLOR = "#D4AF37";

function SpinningBox() {
  const mesh = useRef<Mesh>(null);
  useFrame((_state, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.x += delta * 0.2;
    mesh.current.rotation.y += delta * 0.3;
  });
  return (
    <mesh ref={mesh}>
      <boxGeometry args={[1.4, 1.4, 1.4]} />
      <meshStandardMaterial color={BOX_COLOR} />
    </mesh>
  );
}

export function IslandPage() {
  return (
    <SidebarInset className="h-dvh">
      <div
        className="size-full"
        style={{ background: ISLAND_BACKGROUND }}
        data-testid="kore-island"
      >
        <Canvas camera={{ position: [3, 2, 4], fov: 50 }}>
          <color attach="background" args={[ISLAND_BACKGROUND]} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <SpinningBox />
        </Canvas>
      </div>
    </SidebarInset>
  );
}
