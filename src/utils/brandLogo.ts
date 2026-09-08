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

// Modern Luxury Gold & Dark Emerald Cortado Cafe Emblem
export const LUXURY_GOLD_CORTADO_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <radialGradient id="bgDark" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="%230f291e" />
      <stop offset="100%" stop-color="%23061711" />
    </radialGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23fde68a" />
      <stop offset="50%" stop-color="%23d97706" />
      <stop offset="100%" stop-color="%23b45309" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="40" fill="url(%23bgDark)" />
  <circle cx="100" cy="100" r="88" fill="none" stroke="url(%23goldGrad)" stroke-width="2.5" />
  <circle cx="100" cy="100" r="82" fill="none" stroke="%23d97706" stroke-width="1" stroke-dasharray="4 3" opacity="0.6" />
  <g transform="translate(100, 75)">
    <path d="M-8,-26 Q-4,-34 -8,-42 M0,-28 Q4,-36 0,-44 M8,-26 Q12,-34 8,-42" 
          fill="none" stroke="url(%23goldGrad)" stroke-width="2.5" stroke-linecap="round" />
    <path d="M-26,-12 L26,-12 C26,14 16,24 0,24 C-16,24 -26,14 -26,-12 Z" 
          fill="none" stroke="url(%23goldGrad)" stroke-width="3.5" />
    <ellipse cx="0" cy="-12" rx="26" ry="6" fill="url(%23goldGrad)" opacity="0.3" stroke="url(%23goldGrad)" stroke-width="2" />
    <path d="M24,-6 C33,-6 35,8 23,10" fill="none" stroke="url(%23goldGrad)" stroke-width="3.5" stroke-linecap="round" />
    <path d="M-34,26 L34,26" stroke="url(%23goldGrad)" stroke-width="3" stroke-linecap="round" />
  </g>
  <text x="100" y="142" font-family="system-ui, sans-serif" font-weight="900" font-size="20" fill="url(%23goldGrad)" text-anchor="middle" letter-spacing="3">CORTADO</text>
  <text x="100" y="162" font-family="system-ui, sans-serif" font-weight="700" font-size="11" fill="%23fde68a" text-anchor="middle" letter-spacing="4">SPECIALTY COFFEE</text>
</svg>`;

// Minimalist Modern Cortado Emblem
export const MINIMAL_MODERN_CORTADO_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="minGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23059669" />
      <stop offset="100%" stop-color="%23064e3b" />
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="36" fill="url(%23minGrad)" />
  <circle cx="100" cy="100" r="76" fill="%23ffffff" />
  <g transform="translate(100, 80) scale(1.1)">
    <path d="M-22,-10 L22,-10 C22,12 14,20 0,20 C-14,20 -22,12 -22,-10 Z" fill="%23047857" />
    <ellipse cx="0" cy="-10" rx="22" ry="5" fill="%2310b981" />
    <path d="M20,-4 C28,-4 29,8 19,9" fill="none" stroke="%23047857" stroke-width="3.5" stroke-linecap="round" />
    <path d="M-28,23 L28,23" stroke="%23047857" stroke-width="3" stroke-linecap="round" />
  </g>
  <text x="100" y="146" font-family="system-ui, sans-serif" font-weight="900" font-size="18" fill="%23064e3b" text-anchor="middle" letter-spacing="2">CORTADO</text>
  <text x="100" y="163" font-family="system-ui, sans-serif" font-weight="800" font-size="10" fill="%23059669" text-anchor="middle" letter-spacing="3">COFFEE &amp; MORE</text>
</svg>`;

export const LOGO_PRESETS = [
  { id: 'classic_emerald', name: 'الشعار الكلاسيكي الأخضر', url: DEFAULT_CORTADO_LOGO },
  { id: 'luxury_gold', name: 'الشعار الذهبي الفاخر', url: LUXURY_GOLD_CORTADO_LOGO },
  { id: 'minimal_modern', name: 'الشعار العصري المينيمال', url: MINIMAL_MODERN_CORTADO_LOGO },
];

