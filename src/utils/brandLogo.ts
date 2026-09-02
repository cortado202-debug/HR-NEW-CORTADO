// Cortado Cafe Official Brand Logo (High-resolution SVG Data URI)
export const DEFAULT_CORTADO_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="cortadoGreen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%2310b981" />
      <stop offset="100%" stop-color="%23047857" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="%23064e3b" flood-opacity="0.25" />
    </filter>
  </defs>
  
  <!-- Outer Circle with Gold/White Ring -->
  <circle cx="100" cy="100" r="94" fill="url(%23cortadoGreen)" filter="url(%23shadow)" />
  <circle cx="100" cy="100" r="86" fill="none" stroke="%23ffffff" stroke-width="3.5" stroke-dasharray="8 4" opacity="0.85" />
  <circle cx="100" cy="100" r="80" fill="none" stroke="%23ffffff" stroke-width="1.5" opacity="0.6" />

  <!-- Coffee Cup Outline & Steam -->
  <g transform="translate(100, 78) scale(1.15)">
    <!-- Steam -->
    <path d="M-10,-24 Q-6,-32 -10,-40 M0,-26 Q4,-34 0,-42 M10,-24 Q14,-32 10,-40" 
          fill="none" stroke="%23ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.9" />
    
    <!-- Cup Body -->
    <path d="M-28,-14 L28,-14 C28,12 18,24 0,24 C-18,24 -28,12 -28,-14 Z" 
          fill="%23ffffff" />
    
    <!-- Coffee Surface -->
    <ellipse cx="0" cy="-14" rx="28" ry="6" fill="%23d1fae5" />
    <ellipse cx="0" cy="-14" rx="24" ry="4" fill="%23065f46" />
    <ellipse cx="0" cy="-14" rx="14" ry="2.2" fill="%23fef3c7" opacity="0.8" />
    
    <!-- Cup Handle -->
    <path d="M25,-8 C34,-8 36,10 23,12" 
          fill="none" stroke="%23ffffff" stroke-width="5" stroke-linecap="round" />
    
    <!-- Saucer / Plate -->
    <path d="M-36,28 L36,28 C36,32 24,34 0,34 C-24,34 -36,32 -36,28 Z" 
          fill="%23ffffff" />
  </g>

  <!-- Typography: CORTADO CAFE -->
  <text x="100" y="148" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-weight="900" 
        font-size="20" 
        fill="%23ffffff" 
        text-anchor="middle" 
        letter-spacing="2">CORTADO</text>
        
  <text x="100" y="168" 
        font-family="system-ui, -apple-system, sans-serif" 
        font-weight="700" 
        font-size="12" 
        fill="%23d1fae5" 
        text-anchor="middle" 
        letter-spacing="4">CAFÉ</text>
</svg>`;
