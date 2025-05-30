import { useEffect, useLayoutEffect } from 'react';

/**
 * A hook that resolves to useLayoutEffect on client-side and useEffect on server-side
 * This avoids warnings when server-side rendering React components that use useLayoutEffect
 */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' 
  ? useLayoutEffect 
  : useEffect;

export { useIsomorphicLayoutEffect }; 