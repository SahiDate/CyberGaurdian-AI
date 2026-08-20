import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import ParticleField from './ParticleField';

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight color="#3b82f6" intensity={2} position={[5, 5, 5]} />
      <Suspense fallback={null}>
        <Environment preset="night" />
        <ParticleField count={300} />
      </Suspense>
    </>
  );
}

export default function Scene3D() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const handler = (e) => setPrefersReducedMotion(e.matches);
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      }
    }
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <Suspense fallback={<div className="loading-spinner" style={{ display: 'none' }} />}>
        <Canvas
          camera={{ position: [0, 0, 8], fov: 60 }}
          style={{ width: '100%', height: '100%' }}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        >
          <SceneContent prefersReducedMotion={prefersReducedMotion} />
        </Canvas>
      </Suspense>
    </div>
  );
}
