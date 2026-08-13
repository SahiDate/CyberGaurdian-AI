import { useState, useEffect } from 'react';

/**
 * Counts up from 0 to target value on mount.
 * Parses formatted strings like "42", "1,204", "14/15" or raw numbers.
 * Respects prefers-reduced-motion.
 */
export function useAnimatedCount(target, duration = 1200) {
  const [displayValue, setDisplayValue] = useState(typeof target === 'number' ? 0 : '0');

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayValue(target);
      return;
    }

    if (target === undefined || target === null) return;

    // Handle fraction strings like "14/15"
    if (typeof target === 'string' && target.includes('/')) {
      const parts = target.split('/');
      const numPart = parseInt(parts[0].replace(/,/g, ''), 10);
      const denomPart = parts[1];

      if (isNaN(numPart)) {
        setDisplayValue(target);
        return;
      }

      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Critically damped spring/ease-out curve
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(easeOut * numPart);

        setDisplayValue(`${current.toLocaleString()}/${denomPart}`);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(target);
        }
      };

      requestAnimationFrame(animate);
      return;
    }

    // Handle standard numeric values (or strings with commas like "1,204")
    const numericTarget = typeof target === 'number' 
      ? target 
      : parseInt(String(target).replace(/,/g, ''), 10);

    if (isNaN(numericTarget)) {
      setDisplayValue(target);
      return;
    }

    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeOut * numericTarget);

      setDisplayValue(current.toLocaleString());

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(typeof target === 'number' ? numericTarget : target);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  return displayValue;
}
