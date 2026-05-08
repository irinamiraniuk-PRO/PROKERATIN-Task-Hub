import type { CSSProperties } from 'react';
import logoSrc from '../assets/prokeratin-logo.svg';

interface BrandLogoProps {
  width: number;
  height: number;
  style?: CSSProperties;
}

export default function BrandLogo({ width, height, style }: BrandLogoProps) {
  return (
    <div style={{ width, height, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      <img
        src={logoSrc}
        alt="PROKERATIN"
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  );
}
