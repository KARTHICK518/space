import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface PlanetProps {
  bodyData: any;
  onClick: (body: any, position: THREE.Vector3) => void;
  timeScale: number;
  onRegisterMesh?: (id: number, mesh: THREE.Mesh | null) => void;
  isSelected?: boolean;
  isHovered?: boolean;
  onHover?: (body: any | null) => void;
  isMissionStart?: boolean;
  isMissionEnd?: boolean;
}

export function Planet({
  bodyData, onClick, timeScale, onRegisterMesh,
  isSelected = false, isHovered = false, onHover,
  isMissionStart = false, isMissionEnd = false,
}: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const orbitGroupRef = useRef<THREE.Group>(null);
  const moonsGroupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const isSun = bodyData.distance_from_sun === 0;
  const isSaturn = bodyData.name === 'Saturn';
  const hasRing = isSaturn || bodyData.name === 'Uranus';

  const textureUrl = bodyData.texture ? `/textures/${bodyData.texture}` : null;
  const textureMap = textureUrl ? useTexture(textureUrl) : null;

  const startAngle = useMemo(() => isSun ? 0 : Math.random() * Math.PI * 2, [isSun]);

  // Register live mesh ref with parent (for tour tracking)
  useEffect(() => {
    return () => { onRegisterMesh?.(bodyData.id, null); };
  }, [bodyData.id, onRegisterMesh]);

  const setMeshRef = (mesh: THREE.Mesh | null) => {
    (meshRef as React.MutableRefObject<THREE.Mesh | null>).current = mesh;
    onRegisterMesh?.(bodyData.id, mesh);
  };

  const orbitAngleRef = useRef(startAngle);
  const axisAngleRef = useRef(0);
  const entryRef = useRef(0);
  const moonAnglesRef = useRef<number[]>((bodyData.moons || []).map(() => Math.random() * Math.PI * 2));

  // Orbit path
  const orbitPoints = useMemo(() => {
    if (isSun) return [];
    return Array.from({ length: 129 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2;
      return new THREE.Vector3(
        Math.cos(a) * bodyData.distance_from_sun,
        0,
        Math.sin(a) * bodyData.distance_from_sun
      );
    });
  }, [isSun, bodyData.distance_from_sun]);

  // Moon orbit paths
  const moonOrbitPoints = useMemo(() => {
    if (!bodyData.moons) return [];
    return bodyData.moons.map((moon: any) =>
      Array.from({ length: 33 }, (_, i) => {
        const a = (i / 32) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(a) * moon.distance_from_planet,
          0,
          Math.sin(a) * moon.distance_from_planet
        );
      })
    );
  }, [bodyData.moons]);

  useFrame((_, delta) => {
    const scaledDelta = delta * timeScale;

    // Entry pop
    if (entryRef.current < 1) {
      entryRef.current = Math.min(1, entryRef.current + delta * 1.5);
    }

    if (meshRef.current) {
      axisAngleRef.current += scaledDelta * 0.5;
      meshRef.current.rotation.y = axisAngleRef.current;

      const entryScale = entryRef.current;
      // Hover: 1.15x, Selected: 1.08x (subtle so it doesn't look broken)
      const hoverScale = isHovered ? 1.15 : isSelected ? 1.08 : 1.0;
      const targetScale = entryScale * hoverScale;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.14);
    }

    if (orbitGroupRef.current && !isSun) {
      orbitAngleRef.current += scaledDelta * bodyData.orbital_speed;
      orbitGroupRef.current.rotation.y = orbitAngleRef.current;
    }

    if (ringRef.current && isSaturn) {
      ringRef.current.rotation.x = Math.PI / 2.5;
    }

    if (moonsGroupRef.current && bodyData.moons?.length > 0) {
      moonsGroupRef.current.children.forEach((moonGroup, index) => {
        moonAnglesRef.current[index] += scaledDelta * bodyData.moons[index].orbital_speed;
        moonGroup.rotation.y = moonAnglesRef.current[index];
      });
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (meshRef.current) {
      const worldPosition = new THREE.Vector3();
      meshRef.current.getWorldPosition(worldPosition);
      onClick(bodyData, worldPosition);
    }
  };

  // Orbit line: mission colors override selection colors
  const orbitColor = isMissionStart ? '#10b981'
    : isMissionEnd   ? '#f97316'
    : isSelected     ? '#4a6aaa'
    : '#1e2d4a';
  const orbitOpacity = (isMissionStart || isMissionEnd) ? 0.85
    : isSelected ? 0.7 : 0.35;
  const orbitWidth = (isMissionStart || isMissionEnd) ? 1.6
    : isSelected ? 1.2 : 0.7;

  return (
    <group>
      {/* Orbit Path */}
      {!isSun && orbitPoints.length > 0 && (
        <Line
          points={orbitPoints}
          color={orbitColor}
          lineWidth={orbitWidth}
          transparent
          opacity={orbitOpacity}
        />
      )}

      {/* Orbit Group */}
      <group ref={orbitGroupRef}>
        <group position={[bodyData.distance_from_sun, 0, 0]}>

          {/* Planet Mesh */}
          <mesh
            ref={setMeshRef}
            scale={[0, 0, 0]}
            onClick={handleClick}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover?.(bodyData);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              onHover?.(null);
              document.body.style.cursor = 'auto';
            }}
          >
            <sphereGeometry args={[bodyData.radius, 48, 48]} />
            <meshStandardMaterial
              map={textureMap}
              color={textureMap ? '#ffffff' : bodyData.color}
              roughness={0.75}
              metalness={0.05}
              emissive={bodyData.color}
              emissiveIntensity={0.06}
            />

            {/* ── Hover glow (bright additive) ── */}
            {isHovered && !isSelected && (
              <mesh scale={[1.10, 1.10, 1.10]}>
                <sphereGeometry args={[bodyData.radius, 32, 32]} />
                <meshBasicMaterial
                  color={bodyData.color}
                  transparent
                  opacity={0.45}
                  side={THREE.BackSide}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            )}

            {/* ── Selection glow ring (persistent, layered) ── */}
            {isSelected && (
              <>
                {/* Inner tight glow */}
                <mesh scale={[1.06, 1.06, 1.06]}>
                  <sphereGeometry args={[bodyData.radius, 32, 32]} />
                  <meshBasicMaterial
                    color={bodyData.color}
                    transparent
                    opacity={0.55}
                    side={THREE.BackSide}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </mesh>
                {/* Outer soft halo */}
                <mesh scale={[1.22, 1.22, 1.22]}>
                  <sphereGeometry args={[bodyData.radius, 32, 32]} />
                  <meshBasicMaterial
                    color={bodyData.color}
                    transparent
                    opacity={0.18}
                    side={THREE.BackSide}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                  />
                </mesh>
              </>
            )}

            {/* Mission START glow - emerald green */}
            {isMissionStart && (
              <>
                <mesh scale={[1.07, 1.07, 1.07]}>
                  <sphereGeometry args={[bodyData.radius, 32, 32]} />
                  <meshBasicMaterial color="#10b981" transparent opacity={0.65}
                    side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
                </mesh>
                <mesh scale={[1.28, 1.28, 1.28]}>
                  <sphereGeometry args={[bodyData.radius, 32, 32]} />
                  <meshBasicMaterial color="#10b981" transparent opacity={0.20}
                    side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
                </mesh>
              </>
            )}

            {/* Mission END glow - orange */}
            {isMissionEnd && (
              <>
                <mesh scale={[1.07, 1.07, 1.07]}>
                  <sphereGeometry args={[bodyData.radius, 32, 32]} />
                  <meshBasicMaterial color="#f97316" transparent opacity={0.65}
                    side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
                </mesh>
                <mesh scale={[1.28, 1.28, 1.28]}>
                  <sphereGeometry args={[bodyData.radius, 32, 32]} />
                  <meshBasicMaterial color="#f97316" transparent opacity={0.20}
                    side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
                </mesh>
              </>
            )}

          </mesh>

          {/* Saturn / Uranus Rings */}
          {hasRing && (
            <mesh ref={ringRef} rotation={[Math.PI / 2.5, 0, 0]}>
              <ringGeometry args={[
                bodyData.radius * 1.4,
                bodyData.radius * (isSaturn ? 2.4 : 2.0),
                64
              ]} />
              <meshBasicMaterial
                color={isSaturn ? '#c2a56e' : '#7fb8c8'}
                side={THREE.DoubleSide}
                transparent
                opacity={isSaturn ? 0.75 : 0.45}
              />
            </mesh>
          )}

          {/* Moons */}
          {bodyData.moons && bodyData.moons.length > 0 && (
            <group ref={moonsGroupRef}>
              {bodyData.moons.map((moon: any, idx: number) => (
                <group key={moon.id}>
                  <Line
                    points={moonOrbitPoints[idx]}
                    color="#2a3a5a"
                    lineWidth={0.4}
                    transparent
                    opacity={0.22}
                  />
                  <mesh position={[moon.distance_from_planet, 0, 0]}>
                    <sphereGeometry args={[moon.radius, 16, 16]} />
                    <meshStandardMaterial color={moon.color} roughness={0.95} />
                  </mesh>
                </group>
              ))}
            </group>
          )}

        </group>
      </group>
    </group>
  );
}
