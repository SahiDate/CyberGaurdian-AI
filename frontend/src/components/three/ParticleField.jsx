import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

export default function ParticleField({ count = 320, boundingBox = 12 }) {
  const meshRef = useRef();
  const groupRef = useRef();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const { isDark } = useTheme();

  // Check prefers-reduced-motion once on mount
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

  // Generate random positions, rotations, scales and vibrant colors
  const { dummy, particles } = useMemo(() => {
    const dummyObj = new THREE.Object3D();
    const items = [];
    const darkColors = ['#3b82f6', '#06b6d4', '#60a5fa', '#0ea5e9', '#38bdf8', '#818cf8'];
    const lightColors = ['#3b82f6', '#0284c7', '#6366f1', '#06b6d4', '#2563eb', '#8b5cf6'];
    const colors = isDark ? darkColors : lightColors;

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * boundingBox * 2;
      const y = (Math.random() - 0.5) * boundingBox * 2;
      const z = (Math.random() - 0.5) * boundingBox * 1.5 - 2;
      const scale = (isDark ? 0.035 : 0.05) + Math.random() * (isDark ? 0.08 : 0.12);
      const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
      const speed = 0.2 + Math.random() * 0.5;
      const initialRotY = Math.random() * Math.PI * 2;

      items.push({ x, y, z, scale, color, speed, initialRotY, currentY: y });
    }
    return { dummy: dummyObj, particles: items };
  }, [count, boundingBox, isDark]);

  // Set initial instance matrices and colors
  useEffect(() => {
    if (!meshRef.current) return;

    particles.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(p.scale, p.scale, p.scale);
      dummy.rotation.set(Math.random() * Math.PI, p.initialRotY, 0);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, p.color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [dummy, particles]);

  // Animate slow rotation of the whole group
  useFrame((state, delta) => {
    if (groupRef.current && !prefersReducedMotion) {
      groupRef.current.rotation.y += delta * 0.02;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={meshRef}
        args={[null, null, count]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          roughness={isDark ? 0.2 : 0.25}
          metalness={isDark ? 0.8 : 0.6}
          emissive={isDark ? '#0284c7' : '#3b82f6'}
          emissiveIntensity={isDark ? 0.6 : 0.45}
          transparent
          opacity={isDark ? 0.75 : 0.65}
        />
      </instancedMesh>
    </group>
  );
}
