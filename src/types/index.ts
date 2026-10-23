export type ToolType = 'brush' | 'uv' | 'spray';

export interface StainPoint {
  id: number;
  normX: number; // relative to sneaker bounding box (0..1)
  normY: number; // relative to sneaker bounding box (0..1)
  normSize: number; // relative to sneaker width
  rotation: number; // radians
  opacity: number; // 0..1
  decalIndex: number; // index of mud decal image (0..5)
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
