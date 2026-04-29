import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, Play, Pause, FastForward, Navigation, RotateCcw, MousePointer2, Rocket, XCircle, Eye, EyeOff } from 'lucide-react';

interface HUDProps {
  selectedBody: any | null;
  onClose: () => void;
  timeScale: number;
  setTimeScale: (val: number) => void;
  isTouring: boolean;
  setIsTouring: (val: boolean) => void;
  onResetView: () => void;
  // Mission
  missionMode: boolean;
  missionStart: any | null;
  missionEnd: any | null;
  onEnterMission: () => void;
  onResetMission: () => void;
  missionLaunched: boolean;
  missionProgress: number;
  missionDistance: number;
  missionComplete: boolean;
  onLaunchMission: () => void;

}

const MISSION_STATUS = (start: any, end: any, launched: boolean, complete: boolean) => {
  if (complete)  return { text: 'Mission complete!', step: 3, done: true };
  if (launched)  return { text: 'En route...', step: 3, done: false };
  if (!start)    return { text: 'Select ORIGIN planet', step: 1, done: false };
  if (!end)      return { text: 'Select DESTINATION planet', step: 2, done: false };
  return         { text: 'Ready to launch', step: 3, done: false };
};

function PlanetSlot({ label, body, color }: { label: string; body: any | null; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span style={{ color }} className="text-[9px] font-bold tracking-[0.2em] uppercase opacity-70">{label}</span>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-300"
        style={{
          borderColor: body ? color : 'rgba(255,255,255,0.1)',
          background: body ? `${color}12` : 'rgba(255,255,255,0.03)',
          boxShadow: body ? `0 0 14px -4px ${color}` : 'none',
        }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: body ? color : '#333', boxShadow: body ? `0 0 6px ${color}` : 'none' }}
        />
        <span
          className="text-sm font-bold tracking-wider uppercase"
          style={{ color: body ? color : '#444' }}
        >
          {body?.name ?? '---'}
        </span>
      </div>
    </div>
  );
}

export function HUD({
  selectedBody, onClose, timeScale, setTimeScale,
  isTouring, setIsTouring, onResetView,
  missionMode, missionStart, missionEnd, onEnterMission, onResetMission,
  missionLaunched, missionProgress, missionDistance, missionComplete, onLaunchMission,

}: HUDProps) {
  const status = MISSION_STATUS(missionStart, missionEnd, missionLaunched, missionComplete);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-10 flex flex-col justify-between p-8">

      {/* Top Header */}
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold text-white mb-1 tracking-widest drop-shadow-lg">SOLAR SYSTEM</h1>
          <p className="text-gray-500 max-w-md uppercase tracking-wider text-xs flex items-center gap-2">
            <Info size={13} /> 3D Interactive Explorer
          </p>
        </div>

        {/* Hover hint */}
        <AnimatePresence>
          {!selectedBody && !missionMode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="flex items-center gap-2 bg-space-800/60 backdrop-blur-sm border border-space-700/40 rounded-xl px-4 py-2 text-xs text-gray-400 tracking-wider"
            >
              <MousePointer2 size={14} className="text-accent-blue" />
              Hover to explore · Click to focus
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Mission Planner Panel (top-center) */}
      <AnimatePresence>
        {missionMode && (
          <motion.div
            initial={{ y: -40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 200 }}
            className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-auto"
            style={{ zIndex: 20 }}
          >
            <div
              className="bg-space-800/92 backdrop-blur-xl border rounded-2xl p-5 shadow-2xl"
              style={{
                borderColor: 'rgba(16,185,129,0.35)',
                boxShadow: '0 0 40px -10px rgba(16,185,129,0.25)',
                minWidth: 360,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Rocket size={15} className="text-emerald-400" />
                  <span className="text-xs font-bold tracking-[0.2em] uppercase text-emerald-400">
                    Mission Planner
                  </span>
                </div>
                <button
                  onClick={onResetMission}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                  title="Cancel mission"
                >
                  <XCircle size={17} />
                </button>
              </div>

              {/* Planet slots */}
              <div className="flex items-center gap-3">
                <PlanetSlot label="Origin" body={missionStart} color="#10b981" />
                <div className="flex flex-col items-center mt-3 flex-shrink-0">
                  <div className="w-8 h-px bg-gradient-to-r from-emerald-500/40 to-orange-500/40" />
                  <span className="text-gray-600 text-xs mt-0.5">&#8594;</span>
                </div>
                <PlanetSlot label="Destination" body={missionEnd} color="#f97316" />
              </div>

              {/* Mission data (visible once launched) */}
              {(missionLaunched || missionComplete) && (
                <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-widest text-gray-500 w-16">Progress</span>
                    <div className="flex-1 h-1 bg-space-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.round(missionProgress * 100)}%`, background: missionComplete ? '#10b981' : 'linear-gradient(90deg,#38bdf8,#7dd3fc)' }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-gray-400 w-8 text-right">{Math.round(missionProgress * 100)}%</span>
                  </div>
                  {/* Distance */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-widest text-gray-500 w-16">Distance</span>
                    <span className="text-xs font-mono text-sky-400">{missionDistance.toFixed(1)} AU</span>
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    missionComplete ? 'bg-emerald-400' : status.step === 3 ? 'bg-yellow-400 animate-pulse' : 'bg-yellow-400 animate-pulse'
                  }`} />
                  <span className="text-xs text-gray-400 tracking-wide">{status.text}</span>
                </div>
                {/* Launch / Reset button */}
                {missionStart && missionEnd && !missionLaunched && !missionComplete && (
                  <button
                    onClick={onLaunchMission}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/35 transition-all flex items-center gap-1.5"
                  >
                    <Rocket size={11} /> Launch
                  </button>
                )}
                {missionComplete && (
                  <button
                    onClick={onResetMission}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/35 transition-all"
                  >
                    New Mission
                  </button>
                )}
              </div>

              {/* Step indicators */}
              <div className="flex gap-1.5 mt-3">
                {[1, 2, 3].map(s => (
                  <div
                    key={s}
                    className="h-0.5 flex-1 rounded-full transition-all duration-500"
                    style={{ background: s <= status.step ? '#10b981' : '#1e2d4a' }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        className="pointer-events-auto flex items-end justify-between w-full"
        style={{ paddingRight: selectedBody ? 420 : 0, transition: 'padding-right 0.4s ease' }}
      >
        {/* Time controls */}
        <div className="bg-space-800/80 backdrop-blur-md border border-space-700/50 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase tracking-widest text-gray-400 font-bold min-w-[90px]">Time Scale</span>
            <div className="flex items-center gap-2">
              {[
                { icon: <Pause size={15} />, val: 0, active: timeScale === 0, title: 'Pause' },
                { icon: <Play size={15} />, val: 1, active: timeScale === 1, title: 'Normal' },
                { icon: <FastForward size={15} />, val: 10, active: timeScale > 1, title: 'Fast' },
              ].map(({ icon, val, active, title }) => (
                <button
                  key={val}
                  onClick={() => setTimeScale(val)}
                  title={title}
                  className={`p-2 rounded-full transition-all duration-150 ${
                    active
                      ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/30'
                      : 'text-gray-400 hover:text-white hover:bg-space-700'
                  }`}
                >{icon}</button>
              ))}
            </div>
            <input type="range" min="0" max="50" step="0.5" value={timeScale}
              onChange={e => setTimeScale(parseFloat(e.target.value))}
              className="w-40 accent-accent-blue cursor-pointer" />
            <span className="font-mono text-sm text-white w-12 text-right">{timeScale}x</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button onClick={onResetView}
            className="px-4 py-4 rounded-xl font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl border text-gray-300 border-space-700/60 bg-space-800/70 hover:bg-space-700 hover:text-white backdrop-blur-md text-sm">
            <RotateCcw size={17} /> Reset View
          </button>

          {/* Mission button */}
          <button
            onClick={missionMode ? onResetMission : onEnterMission}
            className={`px-5 py-4 rounded-xl font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl border backdrop-blur-md text-sm ${
              missionMode
                ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
            }`}
          >
            <Rocket size={17} />
            {missionMode ? 'Cancel Mission' : 'Plan Mission'}
          </button>

          {/* Tour button */}
          <button
            onClick={() => setIsTouring(!isTouring)}
            disabled={missionMode}
            className={`px-6 py-4 rounded-xl font-bold uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl border backdrop-blur-md disabled:opacity-40 disabled:cursor-not-allowed ${
              isTouring
                ? 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30'
                : 'bg-accent-blue/20 text-accent-blue border-accent-blue/50 hover:bg-accent-blue/30'
            }`}
          >
            {isTouring ? <Pause size={18} /> : <Navigation size={18} />}
            {isTouring ? 'Stop Tour' : 'Start Tour'}
          </button>
        </div>
      </motion.div>



      {/* Info Panel */}
      <AnimatePresence>
        {selectedBody && !missionMode && (
          <motion.div
            key={selectedBody.id}
            initial={{ x: '110%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '110%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="absolute right-8 top-8 bottom-8 w-96 bg-space-800/85 backdrop-blur-xl border border-space-700/50 rounded-2xl p-6 pointer-events-auto flex flex-col shadow-2xl"
            style={{ boxShadow: `0 0 60px -10px ${selectedBody.color}30` }}
          >
            <div className="flex justify-between items-start mb-5 border-b border-space-700/50 pb-4">
              <div>
                <h2 className="text-3xl font-bold mb-1 drop-shadow-lg" style={{ color: selectedBody.color }}>
                  {selectedBody.name}
                </h2>
                <span className="text-xs uppercase tracking-widest text-gray-400 bg-space-900/60 px-2 py-1 rounded-md">
                  {selectedBody.type}
                </span>
              </div>
              <button onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors bg-space-900/50 p-2 rounded-full hover:bg-space-700 active:scale-90">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
              <p className="text-gray-300 leading-relaxed text-sm">{selectedBody.description}</p>
              <div className="space-y-3">
                {[
                  { label: 'Equatorial Radius', value: selectedBody.radius, unit: 'units' },
                  { label: 'Distance from Sun', value: selectedBody.distance_from_sun, unit: 'AU' },
                  { label: 'Orbital Speed', value: selectedBody.orbital_speed, unit: 'units/s' },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="bg-space-900/50 p-4 rounded-xl border border-space-700/30 hover:border-space-700/70 transition-colors">
                    <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">{label}</span>
                    <span className="text-xl font-mono text-white">{value} <span className="text-sm text-gray-400">{unit}</span></span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-5 h-5 rounded-full border border-white/20 shadow-lg"
                  style={{ background: selectedBody.color, boxShadow: `0 0 12px ${selectedBody.color}` }} />
                <span className="text-xs text-gray-500 font-mono">{selectedBody.color}</span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-space-700/40 flex items-center justify-between">
              <span className="text-xs text-gray-600">Database Entry #{selectedBody.id}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
