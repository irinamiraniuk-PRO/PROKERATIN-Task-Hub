import type { CSSProperties } from 'react';
import logoSrc from '../assets/prokeratin-logo.svg';

interface BrandLogoProps {
  width: number;
  height: number;
  style?: CSSProperties;
}

export default function BrandLogo({ width, height, style }: BrandLogoProps) {
  return (
    <div style={{ width, height, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...style }}>
      <img
        src={logoSrc}
        alt="PROKERATIN"
        style={{ height: '100%', width: 'auto', display: 'block' }}
      />
    </div>
  );
}
