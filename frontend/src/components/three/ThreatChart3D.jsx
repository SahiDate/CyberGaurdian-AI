import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Line, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

function Chart3DContent({ data }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const { isDark } = useTheme();

  const labels = data?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const datasets = data?.datasets || [];

  // Normalize dataset points into 3D coordinates
  const { lines, points } = useMemo(() => {
    const linesList = [];
    const pointsList = [];

    const numPoints = labels.length;
    const xSpacing = 1.0;
    const xOffset = -((numPoints - 1) * xSpacing) / 2;

    datasets.forEach((ds, dsIndex) => {
      const rawData = ds.data || [];
      const maxVal = Math.max(...rawData, 1);
      const isCritical = ds.label?.toLowerCase().includes('critical');
      const zPlane = dsIndex === 0 ? 0.4 : -0.4;
      const color = isDark
        ? (isCritical ? '#f85149' : '#58a6ff')
        : (isCritical ? '#dc2626' : '#2563eb');

      const pts = rawData.map((val, idx) => {
        const x = xOffset + idx * xSpacing;
        // Normalize Y between -0.9 and 1.1
        const y = -0.9 + (val / maxVal) * 2.0;
        const z = zPlane;

        pointsList.push({
          x,
          y,
          z,
          val,
          label: labels[idx],
          datasetLabel: ds.label,
          color,
          id: `${dsIndex}-${idx}`
        });

        return [x, y, z];
      });

      linesList.push({
        points: pts,
        color,
        label: ds.label,
        zPlane
      });
    });

    return { lines: linesList, points: pointsList };
  }, [data, labels, datasets, isDark]);

  return (
    <>
      <ambientLight intensity={isDark ? 0.4 : 0.7} />
      <directionalLight position={[5, 10, 7]} intensity={isDark ? 1.5 : 1.8} color="#ffffff" />
      <pointLight position={[-5, 5, -5]} intensity={isDark ? 0.6 : 0.4} color="#38bdf8" />
      <pointLight position={[5, -5, 5]} intensity={isDark ? 0.8 : 0.4} color="#f43f5e" />

      {/* Grid Floor in 3D */}
      <gridHelper
        args={[8, 8, isDark ? '#334155' : '#cbd5e1', isDark ? '#1e293b' : '#e2e8f0']}
        position={[0, -1.1, 0]}
      />

      {/* Lines */}
      {lines.map((line, idx) => (
        <group key={idx}>
          <Line
            points={line.points}
            color={line.color}
            lineWidth={isDark ? 3.5 : 4}
            dashed={false}
          />
        </group>
      ))}

      {/* Data Point Spheres with Hover Tooltips */}
      {points.map((pt) => {
        const isHovered = hoveredPoint?.id === pt.id;
        return (
          <group key={pt.id} position={[pt.x, pt.y, pt.z]}>
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredPoint(pt);
              }}
              onPointerOut={() => setHoveredPoint(null)}
              scale={isHovered ? 1.6 : 1}
            >
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshStandardMaterial
                color={pt.color}
                emissive={pt.color}
                emissiveIntensity={isHovered ? (isDark ? 1.2 : 0.8) : (isDark ? 0.6 : 0.3)}
                roughness={0.2}
                metalness={0.8}
              />
            </mesh>

            {isHovered && (
              <Html distanceFactor={8} position={[0, 0.25, 0]} center>
                <div style={{
                  background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                  border: `1px solid ${pt.color}`,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  boxShadow: `0 4px 14px ${isDark ? pt.color + '40' : 'rgba(0,0,0,0.1)'}`,
                  color: isDark ? '#fff' : '#0f172a',
                  fontSize: '11px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}>
                  <div>{pt.datasetLabel}</div>
                  <div style={{ color: pt.color }}>{pt.label}: <strong>{pt.val}</strong></div>
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* X-Axis Labels */}
      {labels.map((lbl, idx) => {
        const xSpacing = 1.0;
        const xOffset = -((labels.length - 1) * xSpacing) / 2;
        const x = xOffset + idx * xSpacing;
        return (
          <Html
            key={lbl}
            position={[x, -1.3, 0]}
            center
            style={{
              color: isDark ? '#94a3b8' : '#64748b',
              fontSize: '12px',
              fontWeight: '600',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          >
            {lbl}
          </Html>
        );
      })}

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 2.5}
        maxPolarAngle={Math.PI / 1.8}
        minAzimuthAngle={-0.3}
        maxAzimuthAngle={0.3}
      />
    </>
  );
}

export default function ThreatChart3D({ data }) {
  const { isDark } = useTheme();

  return (
    <div style={{ width: '100%', height: '360px', position: 'relative' }}>
      {/* Legend Badge Header */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '16px',
        zIndex: 10,
        display: 'flex',
        gap: '12px',
        background: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)',
        padding: '6px 12px',
        borderRadius: '8px',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
        boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
        backdropFilter: 'blur(6px)'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: isDark ? '#f85149' : '#dc2626', fontWeight: '600' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isDark ? '#f85149' : '#dc2626' }} />
          Critical Threats
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: isDark ? '#58a6ff' : '#2563eb', fontWeight: '600' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isDark ? '#58a6ff' : '#2563eb' }} />
          Blocked Requests
        </span>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '16px',
        zIndex: 10,
        fontSize: '0.75rem',
        color: isDark ? '#64748b' : '#94a3b8'
      }}>
        Interactive 3D View: Drag slightly to tilt / Hover nodes for data
      </div>

      <Canvas
        camera={{ position: [0, 1.2, 5.5], fov: 45 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ alpha: true, antialias: true }}
      >
        <Chart3DContent data={data} />
      </Canvas>
    </div>
  );
}
