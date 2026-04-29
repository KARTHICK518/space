import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SEGS = 80;
const SPACECRAFT_SPEED = 0.09; // t-units per second

function buildCurve(start: THREE.Vector3, end: THREE.Vector3) {
  const up = new THREE.Vector3(0, 1, 0);
  
  // Compute CCW tangents for orbital motion
  let tStart = new THREE.Vector3().crossVectors(up, start);
  if (tStart.lengthSq() < 0.001) tStart.crossVectors(up, end);
  if (tStart.lengthSq() < 0.001) tStart.set(1, 0, 0);
  tStart.normalize();

  let tEnd = new THREE.Vector3().crossVectors(up, end);
  if (tEnd.lengthSq() < 0.001) tEnd.crossVectors(up, start);
  if (tEnd.lengthSq() < 0.001) tEnd.set(1, 0, 0);
  tEnd.normalize();
  
  const dist = start.distanceTo(end);
  
  // Scale defines how "wide" the trajectory bows out.
  // This creates a majestic Hohmann-like transfer or slingshot arc.
  const scale = dist * 0.6;
  
  // Depart forward along orbit
  const cp1 = start.clone().add(tStart.multiplyScalar(scale));
  
  // Arrive along orbit (control point is behind the target)
  const cp2 = end.clone().sub(tEnd.multiplyScalar(scale));
  
  // Arc up slightly to give it a 3D feel and avoid clipping the Sun
  const yBoost = dist * 0.2;
  cp1.y += yBoost;
  cp2.y += yBoost;

  return new THREE.CubicBezierCurve3(start, cp1, cp2, end);
}

interface Props {
  planetMeshRefs: React.MutableRefObject<Record<number, THREE.Mesh>>;
  startId: number;
  endId: number;
  launched: boolean;
  onProgress?: (t: number, dist: number) => void;
  onComplete?: () => void;
}

export function MissionTrajectory({ planetMeshRefs, startId, endId, launched, onProgress, onComplete }: Props) {
  const progressRef   = useRef(0);
  const completedRef  = useRef(false);
  const snappedCurve  = useRef<THREE.CubicBezierCurve3 | null>(null);

  // ── Imperative THREE objects (never recreated) ───────────────────────────
  const pathLine = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEGS + 1) * 3), 3));
    const mat = new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    return new THREE.Line(geo, mat);
  }, []);

  const trailLine = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEGS + 1) * 3), 3));
    const mat = new THREE.LineBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    return new THREE.Line(geo, mat);
  }, []);

  const spacecraft = useMemo(() => {
    const g = new THREE.Group();
    // Cone body pointing forward
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.55, 6),
      new THREE.MeshBasicMaterial({ color: '#e2e8f0' })
    );
    body.rotation.x = Math.PI / 2;
    g.add(body);
    // Engine glow
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 8, 8),
      new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    g.add(glow);
    g.visible = false;
    return g;
  }, []);

  // Snapshot curve on launch
  useEffect(() => {
    if (launched) {
      const sm = planetMeshRefs.current[startId];
      const em = planetMeshRefs.current[endId];
      if (sm && em) {
        const s = new THREE.Vector3(); sm.getWorldPosition(s);
        const e = new THREE.Vector3(); em.getWorldPosition(e);
        snappedCurve.current = buildCurve(s, e);
        progressRef.current = 0;
        completedRef.current = false;
      }
    } else {
      snappedCurve.current = null;
      progressRef.current = 0;
      completedRef.current = false;
      spacecraft.visible = false;
    }
  }, [launched, startId, endId]);

  useFrame((_, delta) => {
    const sm = planetMeshRefs.current[startId];
    const em = planetMeshRefs.current[endId];
    if (!sm || !em) return;

    // Pick curve
    let curve: THREE.CubicBezierCurve3;
    if (launched && snappedCurve.current) {
      curve = snappedCurve.current;
    } else if (!launched) {
      const s = new THREE.Vector3(); sm.getWorldPosition(s);
      const e = new THREE.Vector3(); em.getWorldPosition(e);
      curve = buildCurve(s, e);
    } else return;

    // Update full path line
    const allPts = curve.getPoints(SEGS);
    const pathPos = pathLine.geometry.attributes.position as THREE.BufferAttribute;
    allPts.forEach((p, i) => pathPos.setXYZ(i, p.x, p.y, p.z));
    pathPos.needsUpdate = true;
    pathLine.geometry.computeBoundingSphere();

    // Spacecraft + trail
    if (launched && !completedRef.current) {
      spacecraft.visible = true;
      progressRef.current = Math.min(1, progressRef.current + delta * SPACECRAFT_SPEED);
      const eased = 0.5 - Math.cos(progressRef.current * Math.PI) / 2;
      const pt = curve.getPointAt(Math.min(eased, 0.9999));
      spacecraft.position.copy(pt);
      if (progressRef.current < 0.99) {
        const ahead = curve.getPointAt(Math.min(eased + 0.015, 0.9999));
        spacecraft.lookAt(ahead);
      }

      // Trail: redraw traveled portion
      const trailSegCount = Math.floor(progressRef.current * SEGS);
      const trailPos = trailLine.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i <= trailSegCount; i++) {
        const tp = curve.getPointAt(i / SEGS);
        trailPos.setXYZ(i, tp.x, tp.y, tp.z);
      }
      // Pad remaining with last point
      const last = curve.getPointAt(Math.min(eased, 0.9999));
      for (let i = trailSegCount + 1; i <= SEGS; i++) trailPos.setXYZ(i, last.x, last.y, last.z);
      trailPos.needsUpdate = true;
      trailLine.geometry.setDrawRange(0, trailSegCount + 1);
      trailLine.geometry.computeBoundingSphere();

      const s = new THREE.Vector3(); sm.getWorldPosition(s);
      const e = new THREE.Vector3(); em.getWorldPosition(e);
      onProgress?.(progressRef.current, s.distanceTo(e));

      if (progressRef.current >= 1 && !completedRef.current) {
        completedRef.current = true;
        spacecraft.visible = false;
        onComplete?.();
      }
    } else {
      trailLine.geometry.setDrawRange(0, 0);
    }
  });

  return (
    <>
      <primitive object={pathLine} />
      <primitive object={trailLine} />
      <primitive object={spacecraft} />
    </>
  );
}
