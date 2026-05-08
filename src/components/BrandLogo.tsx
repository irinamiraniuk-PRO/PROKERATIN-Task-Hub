import type { CSSProperties } from 'react';

const LOGO_URL = 'https://github.com/user-attachments/assets/0efecf7c-fcf9-471c-9f7e-cc61b47505c4';

interface BrandLogoProps {
  width: number;
  height: number;
  style?: CSSProperties;
}

export default function BrandLogo({ width, height, style }: BrandLogoProps) {
  return (
    <div style={{ width, height, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      <img
        src={LOGO_URL}
        alt="PROKERATIN"
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  );
}
