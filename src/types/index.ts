export type ToolType = 'brush' | 'uv' | 'spray';

export interface StainPoint {
  id: number;
  normX: number;
  normY: number;
  radius: number;
  opacity: number;
  color: string;
}

export interface ParticleItem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
  type: 'foam' | 'uv' | 'spray' | 'confetti';
}

export interface ZeroPartyProfile {
  shoeSize: string;
  favoriteBrand: string;
  wearFrequency: string;
  pdpaConsent: boolean;
  personaName: string;
  voucherCode: string;
  completedAt: string;
}
