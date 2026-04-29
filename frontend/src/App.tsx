import { useState, useEffect, Suspense, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { SolarSystem } from './components/SolarSystem'
import { HUD } from './components/HUD'
import { PlanetLabelsOverlay } from './components/PlanetLabelsOverlay'
import type { ScreenLabel } from './components/PlanetLabelsOverlay'
import './index.css'

interface CelestialBody {
  id: number;
  name: string;
  type: string;
  radius: number;
  distance_from_sun: number;
  orbital_speed: number;
  color: string;
  texture?: string;
  description: string;
}

function App() {
  const [bodies, setBodies] = useState<CelestialBody[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBody, setSelectedBody] = useState<CelestialBody | null>(null)
  const [hoveredBody, setHoveredBody] = useState<CelestialBody | null>(null)

  // Mission simulation state
  const [missionMode, setMissionMode] = useState(false);
  const [missionStart, setMissionStart] = useState<CelestialBody | null>(null);
  const [missionEnd, setMissionEnd]     = useState<CelestialBody | null>(null);

  const handleMissionPlanetClick = useCallback((body: CelestialBody) => {
    if (!missionStart) {
      setMissionStart(body);
    } else if (!missionEnd && body.id !== missionStart.id) {
      setMissionEnd(body);
    } else if (body.id === missionStart.id) {
      // Clicking start again deselects it
      setMissionStart(null);
      setMissionEnd(null);
    }
  }, [missionStart, missionEnd]);

  const resetMission = useCallback(() => {
    setMissionStart(null);
    setMissionEnd(null);
    setMissionMode(false);
    setMissionLaunched(false);
    setMissionProgress(0);
    setMissionComplete(false);
  }, []);

  const enterMissionMode = useCallback(() => {
    setMissionMode(true);
    setMissionStart(null);
    setMissionEnd(null);
    setMissionLaunched(false);
    setMissionProgress(0);
    setMissionComplete(false);
    setSelectedBody(null);   // close info panel
    setIsTouring(false);     // stop tour if running
  }, []);

  const [missionLaunched, setMissionLaunched] = useState(false);
  const [missionProgress, setMissionProgress] = useState(0);
  const [missionDistance, setMissionDistance] = useState(0);
  const [missionComplete, setMissionComplete] = useState(false);

  const handleLaunchMission = useCallback(() => {
    if (!missionStart || !missionEnd) return;
    setMissionLaunched(true);
    setMissionProgress(0);
    setMissionComplete(false);
  }, [missionStart, missionEnd]);

  const handleMissionProgress = useCallback((t: number, dist: number) => {
    setMissionProgress(t);
    setMissionDistance(dist);
  }, []);

  const handleMissionComplete = useCallback(() => {
    setMissionComplete(true);
    setMissionLaunched(false);
  }, []);



  const labelsMapRef = useRef<Map<number, ScreenLabel>>(new Map());


  // Controls
  const [timeScale, setTimeScale] = useState(1);
  const [isTouring, setIsTouring] = useState(false);
  const [tourTarget, setTourTarget] = useState<CelestialBody | null>(null);
  const tourIndexRef = useRef(0);

  // Reset view function — SolarSystem registers the actual impl
  const resetViewFnRef = useRef<() => void>(() => {});
  const handleResetView = useCallback(() => resetViewFnRef.current(), []);
  const onResetView = useCallback((fn: () => void) => {
    resetViewFnRef.current = fn;
  }, []);

  useEffect(() => {
    fetch('http://localhost:5000/api/bodies')
      .then(res => res.json())
      .then(data => {
        setBodies(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching bodies:', err)
        setLoading(false)
      })
  }, [])

  // Tour Mode
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTouring && bodies.length > 0) {
      const planets = bodies.filter(b => b.distance_from_sun !== 0);
      if (planets.length === 0) return;
      tourIndexRef.current = 0;
      const first = planets[0];
      setSelectedBody(first);
      setTourTarget(first);

      interval = setInterval(() => {
        tourIndexRef.current = (tourIndexRef.current + 1) % planets.length;
        const next = planets[tourIndexRef.current];
        setSelectedBody(next);
        setTourTarget(next);
      }, 7000);
    } else {
      setTourTarget(null);
    }
    return () => clearInterval(interval);
  }, [isTouring, bodies]);

  return (
    <div className="w-full h-screen relative bg-space-900 overflow-hidden">
      <HUD
        selectedBody={selectedBody}
        onClose={() => { setSelectedBody(null); setIsTouring(false); }}
        timeScale={timeScale}
        setTimeScale={setTimeScale}
        isTouring={isTouring}
        setIsTouring={setIsTouring}
        onResetView={handleResetView}
        missionMode={missionMode}
        missionStart={missionStart}
        missionEnd={missionEnd}
        onEnterMission={enterMissionMode}
        onResetMission={resetMission}
        missionLaunched={missionLaunched}
        missionProgress={missionProgress}
        missionDistance={missionDistance}
        missionComplete={missionComplete}
        onLaunchMission={handleLaunchMission}

      />

      {/* 3D Scene */}
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center text-white z-20">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-14 h-14 border-4 border-accent-blue border-t-transparent rounded-full animate-spin" />
            <p className="tracking-widest uppercase text-sm text-gray-400">Initializing Solar System…</p>
          </div>
        </div>
      ) : (
        <>
          <Canvas camera={{ position: [0, 200, 200], fov: 45 }}>
            <Suspense fallback={null}>
              <SolarSystem
                bodies={bodies}
                selectedBody={selectedBody}
                setSelectedBody={setSelectedBody}
                timeScale={timeScale}
                tourTarget={tourTarget}
                hoveredBody={hoveredBody}
                setHoveredBody={setHoveredBody}
                onResetView={onResetView}
                labelsMapRef={labelsMapRef}
                missionMode={missionMode}
                missionStart={missionStart}
                missionEnd={missionEnd}
                onMissionPlanetClick={handleMissionPlanetClick}
                missionLaunched={missionLaunched}
                onMissionProgress={handleMissionProgress}
                onMissionComplete={handleMissionComplete}

              />
            </Suspense>
          </Canvas>

          {/* 2D sci-fi label overlay - lives outside Canvas for crisp rendering */}
          <PlanetLabelsOverlay
            labelsMapRef={labelsMapRef}
            selectedBodyId={selectedBody?.id ?? null}
            hoveredBodyId={hoveredBody?.id ?? null}
          />
        </>
      )}

      {/* Texture loading overlay */}
      {!loading && bodies.length > 0 && (
        <Suspense fallback={
          <div className="absolute inset-0 flex items-center justify-center text-white z-20 pointer-events-none bg-space-900/80 backdrop-blur-sm">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <div className="w-14 h-14 border-4 border-accent-blue border-t-transparent rounded-full animate-spin" />
              <p className="tracking-widest uppercase text-sm text-gray-400">Loading Textures…</p>
            </div>
          </div>
        }>
          <></>
        </Suspense>
      )}
    </div>
  )
}

export default App
