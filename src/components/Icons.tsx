import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const BookIcon = (p: P) => (<svg {...base} {...p}><path d="M2 5c4-2 7-2 10 1 3-3 6-3 10-1v14c-4-2-7-2-10 1-3-3-6-3-10-1z" /><path d="M12 6v14" /></svg>);
export const PlayIcon = (p: P) => (<svg {...base} {...p}><path d="M7 4v16l13-8z" fill="currentColor" /></svg>);
export const PauseIcon = (p: P) => (<svg {...base} {...p}><path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor" /></svg>);
export const SkipBackIcon = (p: P) => (<svg {...base} {...p}><path d="M19 20 9 12l10-8zM5 19V5" /></svg>);
export const SkipFwdIcon = (p: P) => (<svg {...base} {...p}><path d="m5 4 10 8-10 8zM19 5v14" /></svg>);
export const SearchIcon = (p: P) => (<svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>);
export const SunIcon = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>);
export const MoonIcon = (p: P) => (<svg {...base} {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>);
export const MenuIcon = (p: P) => (<svg {...base} {...p}><path d="M3 6h18M3 12h18M3 18h18" /></svg>);
export const XIcon = (p: P) => (<svg {...base} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>);
export const HeadphonesIcon = (p: P) => (<svg {...base} {...p}><path d="M3 14v-2a9 9 0 0 1 18 0v2" /><path d="M21 15a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z" /></svg>);
export const LanguagesIcon = (p: P) => (<svg {...base} {...p}><path d="M4 5h7M7.5 3v2M5 9c1 3 4 5 6 6M10 5c-1 5-4 8-7 10" /><path d="m13 21 4-10 4 10M14.5 17h5" /></svg>);
export const SparkIcon = (p: P) => (<svg {...base} {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>);
export const UpIcon = (p: P) => (<svg {...base} {...p}><path d="m6 15 6-6 6 6" /></svg>);
export const DownloadIcon = (p: P) => (<svg {...base} {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>);
export const HeartIcon = ({ filled, ...p }: P & { filled?: boolean }) => (<svg {...base} {...p}><path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" fill={filled ? 'currentColor' : 'none'} /></svg>);
