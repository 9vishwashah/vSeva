import React from 'react';

// Single shared loading-placeholder primitive. Every page should build its
// loading state out of this (sized/shaped to match the real content it
// stands in for) instead of a full-page spinner or ad-hoc bg-gray-200 divs —
// keeps the page shell visible immediately and avoids layout jumps once
// data arrives.
const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => (
  <div className={`animate-pulse rounded-md bg-gray-200/80 ${className}`} style={style} />
);

export default Skeleton;
