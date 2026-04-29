import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls, Stars, useTexture } from '@react-three/drei';
import { Planet } from './Planet';
import { Asteroids } from './Asteroids';
import { MissionTrajectory } from './MissionTrajectory';
import type { ScreenLabel } from './PlanetLabelsOverlay';
import * as THREE from 'three';

interface SolarSystemProps {
  bodies: any[];
  selectedBody: any | null;
  setSelectedBody: (body: any | null) => void;
  timeScale: number;
  tourTarget: any | null;
  hoveredBody: any | null;
  setHoveredBody: (body: any | null) => void;
  onResetView: (fn: () => void) => void;
  labelsMapRef: React.MutableRefObject<Map<number, ScreenLabel>>;
  // Mission
  missionMode: boolean;
  missionStart: any | null;
  missionEnd: any | null;
  onMissionPlanetClick: (body: any) => void;
  missionLaunched: boolean;
  onMissionProgress: (t: number, dist: number) => void;
  onMissionComplete: () => void;

}

export function SolarSystem({
  bodies, selectedBody, setSelectedBody, timeScale,
  tourTarget, hoveredBody, setHoveredBody, onResetView, labelsMapRef,
  missionMode, missionStart, missionEnd, onMissionPlanetClick,
  missionLaunched, onMissionProgress, onMissionComplete,
}: SolarSystemProps) {
  const cameraControlsRef = useRef<any>(null);

  // Auto-focus Sun on first load
  const didAutoFocus = useRef(false);
  useEffect(() => {
    if (didAutoFocus.current || !cameraControlsRef.current) return;
    if (bodies.length === 0) return;
    didAutoFocus.current = true;
    cameraControlsRef.current.setLookAt(0, 200, 200, 0, 0, 0, false);
    setTimeout(() => {
      cameraControlsRef.current?.setLookAt(0, 55, 75, 0, 0, 0, true);
    }, 150);
  }, [bodies]);

  // Register reset-view
  useEffect(() => {
    onResetView(() => {
      if (!cameraControlsRef.current) return;
      setSelectedBody(null);
      cameraControlsRef.current.setLookAt(0, 55, 75, 0, 0, 0, true);
    });
  }, [onResetView, setSelectedBody]);




  const handlePlanetClick = (body: any, worldPosition: THREE.Vector3) => {
    if (missionMode) {
      onMissionPlanetClick(body);
      return; // Don't change selectedBody or move camera in mission mode
    }
    setSelectedBody(body);
    if (!cameraControlsRef.current) return;
    const off = body.radius * 6 + 4;
    const dir = worldPosition.clone().normalize();
    if (dir.lengthSq() === 0) dir.set(0, 0, 1);
    cameraControlsRef.current.setLookAt(
      worldPosition.x + dir.x * off,
      worldPosition.y + body.radius * 2.5,
      worldPosition.z + dir.z * off + off * 0.5,
      worldPosition.x, worldPosition.y, worldPosition.z, true
    );
  };

  const sunGlowRef     = useRef<THREE.Mesh>(null);
  const starsGroupRef  = useRef<THREE.Group>(null);
  const planetMeshRefs = useRef<Record<number, THREE.Mesh>>({});
  const tourLookingAt  = useRef<THREE.Vector3>(new THREE.Vector3());

  const registerPlanetMesh = useCallback((id: number, mesh: THREE.Mesh | null) => {
    if (mesh) planetMeshRefs.current[id] = mesh;
    else delete planetMeshRefs.current[id];
  }, []);



  const sunBody       = bodies.find(b => b.distance_from_sun === 0);
  const sunTextureUrl = sunBody?.texture ? `/textures/${sunBody.texture}` : null;
  const sunTextureMap = sunTextureUrl ? useTexture(sunTextureUrl) : null;

  useFrame(({ clock, camera, size }) => {
    const t = clock.getElapsedTime();

    // Sun corona pulse
    if (sunGlowRef.current) {
      const s = 1.0 + Math.sin(t * 0.8) * 0.02;
      sunGlowRef.current.scale.set(s, s, s);
      (sunGlowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.13 + Math.sin(t * 0.8) * 0.04;
    }

    // Starfield drift
    if (starsGroupRef.current) starsGroupRef.current.rotation.y = t * 0.008;

    // Tour tracking
    if (tourTarget && cameraControlsRef.current) {
      const mesh = planetMeshRefs.current[tourTarget.id];
      if (mesh) {
        const wp = new THREE.Vector3();
        mesh.getWorldPosition(wp);
        tourLookingAt.current.lerp(wp, 0.04);
        const od = tourTarget.radius * 6 + 4;
        cameraControlsRef.current.setLookAt(
          wp.x + od * 0.7, wp.y + tourTarget.radius * 3, wp.z + od * 0.7,
          tourLookingAt.current.x, tourLookingAt.current.y, tourLookingAt.current.z, false
        );
      }
    }



    // ── Project all planet positions → screen space ──
    const map = labelsMapRef.current;

    // Sun
    if (sunBody) {
      const sp   = new THREE.Vector3(0, 0, 0).project(camera);
      const dist = camera.position.length();
      map.set(sunBody.id, {
        id: sunBody.id, name: sunBody.name, type: sunBody.type,
        color: '#fbbf24',
        x: (sp.x *  0.5 + 0.5) * size.width,
        y: (sp.y * -0.5 + 0.5) * size.height,
        dist, behind: sp.z > 1,
      });
    }

    // Planets
    Object.entries(planetMeshRefs.current).forEach(([idStr, mesh]) => {
      const id   = Number(idStr);
      const body = bodies.find(b => b.id === id);
      if (!body || !mesh) return;
      const wp   = new THREE.Vector3();
      mesh.getWorldPosition(wp);
      const sp   = wp.clone().project(camera);
      const dist = camera.position.distanceTo(wp);
      map.set(id, {
        id, name: body.name, type: body.type, color: body.color,
        x: (sp.x *  0.5 + 0.5) * size.width,
        y: (sp.y * -0.5 + 0.5) * size.height,
        dist, behind: sp.z > 1,
      });
    });
  });

  return (
    <>
      <CameraControls ref={cameraControlsRef} makeDefault />
      <color attach="background" args={['#060818']} />
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 0, 0]} intensity={1.8} color="#fff5d6" distance={180} decay={2.0} />

      {/* Parallax star layers */}
      <group ref={starsGroupRef}>
        <Stars radius={90}  depth={40} count={5000} factor={4} saturation={0} fade speed={0.2} />
        <Stars radius={160} depth={80} count={3000} factor={6} saturation={0} fade speed={0.1} />
      </group>

      {/* Sun corona */}
      <mesh ref={sunGlowRef} position={[0, 0, 0]}>
        <sphereGeometry args={[4.6, 32, 32]} />
        <meshBasicMaterial color="#ffcc55" transparent opacity={0.13}
          depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Sun core */}
      <mesh
        position={[0, 0, 0]}
        onClick={() => { if (sunBody) { setSelectedBody(sunBody); cameraControlsRef.current?.setLookAt(8, 6, 10, 0, 0, 0, true); } }}
        onPointerOver={() => { if (sunBody) setHoveredBody(sunBody); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHoveredBody(null); document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[4.0, 32, 32]} />
        <meshBasicMaterial map={sunTextureMap} color={sunTextureMap ? '#ffffff' : '#fbbf24'} />
        {selectedBody?.id === sunBody?.id && (
          <mesh>
            <sphereGeometry args={[4.3, 32, 32]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.18}
              side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        )}
      </mesh>

      <Asteroids timeScale={timeScale} />



      {/* Mission trajectory + spacecraft */}
      {missionStart && missionEnd && (
        <MissionTrajectory
          planetMeshRefs={planetMeshRefs}
          startId={missionStart.id}
          endId={missionEnd.id}
          launched={missionLaunched}
          onProgress={onMissionProgress}
          onComplete={onMissionComplete}
        />
      )}

      {bodies.map(body =>
        body.distance_from_sun !== 0 && (
          <Planet
            key={body.id}
            bodyData={body}
            onClick={handlePlanetClick}
            timeScale={timeScale}
            onRegisterMesh={registerPlanetMesh}
            isSelected={selectedBody?.id === body.id}
            isHovered={hoveredBody?.id === body.id}
            onHover={setHoveredBody}
            isMissionStart={missionStart?.id === body.id}
            isMissionEnd={missionEnd?.id === body.id}
          />
        )
      )}
    </>
  );
}
