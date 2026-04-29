import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AsteroidsProps {
  timeScale: number;
}

export function Asteroids({ timeScale }: AsteroidsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const NUM_ASTEROIDS = 3000;

  // Main asteroid belt: between Mars (17) and Jupiter (25)
  const MIN_RADIUS = 19.5;
  const MAX_RADIUS = 22.5;

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Pre-calculate initial positions, rotations, speeds, and sizes
  const particles = useMemo(() => {
    return Array.from({ length: NUM_ASTEROIDS }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
      const y = (Math.random() - 0.5) * 1.5;
      const scale = 0.015 + Math.random() * 0.045;
      return {
        angle,
        radius,
        y,
        scale,
        rotSpeed: (Math.random() - 0.5) * 2.0,
        orbitSpeed: 0.005 + Math.random() * 0.008,
        rotX: Math.random() * Math.PI,
        rotY: Math.random() * Math.PI,
        rotZ: Math.random() * Math.PI,
      };
    });
  }, []);

  // Track accumulated angle per asteroid
  const anglesRef = useRef<number[]>(particles.map(p => p.angle));

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const scaledDelta = delta * timeScale;

    particles.forEach((p, i) => {
      anglesRef.current[i] += scaledDelta * p.orbitSpeed;
      const a = anglesRef.current[i];

      dummy.position.set(Math.cos(a) * p.radius, p.y, Math.sin(a) * p.radius);
      dummy.rotation.set(
        p.rotX + anglesRef.current[i] * p.rotSpeed,
        p.rotY,
        p.rotZ
      );
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, NUM_ASTEROIDS]} castShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#5a6478" roughness={0.92} metalness={0.08} />
    </instancedMesh>
  );
}
