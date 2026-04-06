import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

const d = (size = 18, color = 'currentColor') => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const IconMap = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    <line x1="9" y1="3" x2="9" y2="18"/>
    <line x1="15" y1="6" x2="15" y2="21"/>
  </svg>
);

export const IconLeaf = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
);

export const IconChart = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);

export const IconStore = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <path d="M3 9l1-6h16l1 6"/>
    <path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0"/>
    <path d="M5 9v12h14V9"/>
    <line x1="9" y1="21" x2="9" y2="15"/>
    <line x1="15" y1="21" x2="15" y2="15"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
);

export const IconCalendar = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

export const IconClipboard = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);

export const IconUsers = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

export const IconPackage = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

export const IconKey = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
);

export const IconLogOut = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export const IconPin = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

export const IconSearch = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

export const IconLoader = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={{ ...style, animation: 'spin 1s linear infinite' }}>
    <line x1="12" y1="2" x2="12" y2="6"/>
    <line x1="12" y1="18" x2="12" y2="22"/>
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
    <line x1="2" y1="12" x2="6" y2="12"/>
    <line x1="18" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
  </svg>
);

export const IconCheck = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export const IconAlert = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export const IconStar = ({ size, color, style, filled }: IconProps & { filled?: boolean }) => (
  <svg {...d(size, color)} style={style} fill={filled ? color || 'currentColor' : 'none'}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

export const IconShoppingCart = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <circle cx="9" cy="21" r="1"/>
    <circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

export const IconZap = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style} fill="currentColor">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

export const IconUtensilsCrossed = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <path d="M16 2l6 6-6 6"/>
    <path d="M8.93 6.34l-1.6 4.27-4.27-1.6L2 12l6 6 1.06-1.06-1.6-4.27 4.27-1.6L12 10z"/>
    <line x1="2" y1="22" x2="22" y2="2"/>
  </svg>
);

export const IconJar = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <path d="M8 2h8"/>
    <path d="M7 4h10a1 1 0 0 1 1 1v2a6 6 0 0 1-6 6 6 6 0 0 1-6-6V5a1 1 0 0 1 1-1z"/>
    <path d="M6 13v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5"/>
    <line x1="9" y1="17" x2="15" y2="17"/>
  </svg>
);

export const IconSprout = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <path d="M7 20h10"/>
    <path d="M10 20c5.5-2.5.8-6.4 3-10"/>
    <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
    <path d="M14.1 6a7 7 0 0 1 1.3 4.3c-1.6.7-3 .7-4.4.3-1.3-.4-2.5-1.4-3.6-3.1 1.8-1.7 3.6-2.1 6.7-1.5z"/>
  </svg>
);

export const IconDollar = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

export const IconTrash = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

export const IconEdit = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export const IconSave = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

export const IconCamera = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

export const IconClock = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

export const IconRefresh = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

export const IconArrowLeft = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);

export const IconExternalLink = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

export const IconX = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export const IconPlus = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

export const IconChevronRight = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export const IconInfo = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

export const IconQrCode = ({ size, color, style }: IconProps) => (
  <svg {...d(size, color)} style={style}>
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
    <rect x="14" y="14" width="3" height="3"/>
    <line x1="21" y1="14" x2="21" y2="21"/>
    <line x1="14" y1="21" x2="21" y2="21"/>
  </svg>
);
