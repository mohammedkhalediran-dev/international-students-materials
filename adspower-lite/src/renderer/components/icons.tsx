import type { ReactNode } from 'react';

function Svg({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconPlay = () => <Svg size={16}><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" /></Svg>;
export const IconStop = () => <Svg size={16}><rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" /></Svg>;
export const IconEdit = () => <Svg><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Svg>;
export const IconTrash = () => <Svg><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="m19 6-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></Svg>;
export const IconSearch = () => <Svg><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Svg>;
export const IconPlus = () => <Svg><path d="M12 5v14M5 12h14" /></Svg>;
export const IconFolder = () => <Svg><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></Svg>;
export const IconLayers = () => <Svg><path d="m12 3 9 5-9 5-9-5Z" /><path d="m3 13 9 5 9-5" /></Svg>;
export const IconClose = () => <Svg><path d="M18 6 6 18M6 6l12 12" /></Svg>;
export const IconShield = () => <Svg size={22}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" /></Svg>;
export const IconBack = () => <Svg><path d="M9 6l6 6-6 6" /></Svg>;
export const IconForward = () => <Svg><path d="M15 6l-6 6 6 6" /></Svg>;
export const IconReload = () => <Svg><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></Svg>;
