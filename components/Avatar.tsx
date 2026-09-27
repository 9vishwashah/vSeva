import React, { useState, useEffect } from 'react';

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: number;
  /** 'pale' matches the existing bg-[#FCE6D8]/text-[#C05A2C] initials chip used
   *  across entry cards, contacts, sidebars, etc. 'gradient' matches the
   *  tangerine hero gradient used on Profile & Settings and the bottom nav. */
  variant?: 'pale' | 'gradient';
  className?: string;
}

const getInitials = (name: string) => {
  if (!name) return 'VS';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

// Single place that knows how to show "a person": their uploaded photo if
// they have one, falling back to initials in the existing app styles if not
// (or if the image fails to load). Swap any bare initials-circle for this.
const Avatar: React.FC<AvatarProps> = ({ name, url, size = 40, variant = 'pale', className = '' }) => {
  const [errored, setErrored] = useState(false);
  useEffect(() => { setErrored(false); }, [url]);

  const dim: React.CSSProperties = { width: size, height: size, minWidth: size };

  if (url && !errored) {
    return (
      <img
        src={url}
        alt={name}
        style={dim}
        className={`rounded-full object-cover shrink-0 ${className}`}
        onError={() => setErrored(true)}
      />
    );
  }

  const initials = getInitials(name);
  const isGradient = variant === 'gradient';

  return (
    <div
      style={{
        ...dim,
        fontSize: Math.max(9, Math.round(size * 0.38)),
        background: isGradient ? 'linear-gradient(150deg,#FF9947 0%,#DE6B38 100%)' : '#FCE6D8',
        color: isGradient ? '#fff' : '#C05A2C',
      }}
      className={`rounded-full flex items-center justify-center font-extrabold shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
};

export default Avatar;
