'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  SunMedium,
  Paintbrush,
  ShieldCheck,
  Play,
  CheckCircle2,
  ChevronRight,
  Copy,
  Download,
  MessageCircle,
  ArrowRight,
  Film,
  Gamepad2,
  FileEdit,
  Ticket,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '@/lib/audio';
import { ToolType, GameStep, StainPoint, ParticleItem, ZeroPartyProfile } from '@/types';

export default function SneakerSpaGamePage() {
  // Stepper State: 1 = Video, 2 = Game, 3 = Intake Form, 4 = VIP Voucher Card
  const [currentStep, setCurrentStep] = useState<GameStep>(1);

  // Sound & Tool States
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTool, setCurrentTool] = useState<ToolType>('brush');
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [copyToast, setCopyToast] = useState(false);

  // Step 1: Video State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(21);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);

  // Mascot Speech State
  const [mascotSpeech, setMascotSpeech] = useState(
    'โย่ว! คู่นี้อาการหนักเลยนะ! ใช้แปรงขัดโคลน โคมไฟยูวีฟอกขอบเหลือง และสเปรย์นาโนให้ครบ 100% แล้วรับคูปอง 100.- ไปเล้ย!'
  );

  // Step 3: Zero-Party Form State
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [selectedSize, setSelectedSize] = useState('US 8.5-9.5 (EU 42-43)');
  const [selectedBrand, setSelectedBrand] = useState('Nike & Air Jordan');
  const [selectedFreq, setSelectedFreq] = useState('สลับใส่ 3-5 คู่');
  const [pdpaConsent, setPdpaConsent] = useState(true);
  const [profileResult, setProfileResult] = useState<ZeroPartyProfile | null>(null);

  // Canvas Engine Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPointerDown = useRef(false);
  const pointerPos = useRef({ x: 0, y: 0 });
  const currentToolRef = useRef<ToolType>('brush');
  const isCompletedRef = useRef(false);

  // Sneaker box on canvas (aspect ratio & touch mapping)
  const sneakerBoxRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Restoration State Refs
  const stainsRef = useRef<StainPoint[]>([]);
  const totalStainsRef = useRef(15);
  const midsoleOxidationRef = useRef(100); // 100% yellow -> 0% crisp white
  const nanoSprayRef = useRef(0); // 0% -> 100%
  const particlesRef = useRef<ParticleItem[]>([]);

  // Image Asset Refs
  const sneakerImgRef = useRef<HTMLImageElement | null>(null);
  const midsoleMaskRef = useRef<HTMLImageElement | null>(null);
  const decalImgsRef = useRef<HTMLImageElement[]>([]);
  const assetsLoadedRef = useRef(false);

  // Format 10-digit Thai phone number as 08X-XXX-XXXX
  const formatPhoneNumber = (phone: string) => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 10) {
      return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
    }
    return phone;
  };

  // Initialize stains with photographic mud decal assignments
  const initStains = useCallback(() => {
    const list: StainPoint[] = [];

    // 15 realistic, crisp dirt splatter locations matching actual wear patterns
    const zones = [
      // Mudguard & Toe Cap
      { minX: 0.65, maxX: 0.85, minY: 0.52, maxY: 0.64, minS: 0.055, maxS: 0.085 },
      { minX: 0.72, maxX: 0.89, minY: 0.55, maxY: 0.66, minS: 0.050, maxS: 0.075 },
      { minX: 0.78, maxX: 0.90, minY: 0.58, maxY: 0.68, minS: 0.055, maxS: 0.080 },
      // Quarter Panel & Swoosh
      { minX: 0.38, maxX: 0.55, minY: 0.44, maxY: 0.56, minS: 0.055, maxS: 0.085 },
      { minX: 0.45, maxX: 0.62, minY: 0.48, maxY: 0.58, minS: 0.050, maxS: 0.080 },
      { minX: 0.32, maxX: 0.48, minY: 0.50, maxY: 0.62, minS: 0.055, maxS: 0.080 },
      // Heel Counter & Collar
      { minX: 0.16, maxX: 0.28, minY: 0.44, maxY: 0.58, minS: 0.055, maxS: 0.085 },
      { minX: 0.22, maxX: 0.34, minY: 0.48, maxY: 0.62, minS: 0.050, maxS: 0.075 },
      // Upper Sole Seam
      { minX: 0.25, maxX: 0.45, minY: 0.58, maxY: 0.66, minS: 0.055, maxS: 0.080 },
      { minX: 0.52, maxX: 0.72, minY: 0.59, maxY: 0.67, minS: 0.050, maxS: 0.075 },
      // Eyestay & Laces
      { minX: 0.48, maxX: 0.68, minY: 0.36, maxY: 0.48, minS: 0.045, maxS: 0.070 },
      { minX: 0.55, maxX: 0.75, minY: 0.38, maxY: 0.50, minS: 0.045, maxS: 0.070 },
      // Subtle edge splatters
      { minX: 0.68, maxX: 0.84, minY: 0.46, maxY: 0.58, minS: 0.050, maxS: 0.075 },
      { minX: 0.28, maxX: 0.42, minY: 0.40, maxY: 0.52, minS: 0.045, maxS: 0.070 },
      { minX: 0.82, maxX: 0.91, minY: 0.62, maxY: 0.70, minS: 0.050, maxS: 0.075 },
    ];

    let idCounter = 0;
    zones.forEach((zone) => {
      list.push({
        id: idCounter++,
        normX: zone.minX + Math.random() * (zone.maxX - zone.minX),
        normY: zone.minY + Math.random() * (zone.maxY - zone.minY),
        normSize: zone.minS + Math.random() * (zone.maxS - zone.minS),
        rotation: Math.random() * Math.PI * 2,
        opacity: 0.85 + Math.random() * 0.12,
        decalIndex: Math.floor(Math.random() * 6),
      });
    });

    stainsRef.current = list;
    totalStainsRef.current = list.length;
    midsoleOxidationRef.current = 100;
    nanoSprayRef.current = 0;
    isCompletedRef.current = false;
    setProgress(0);
    setIsCompleted(false);
  }, []);

  // Tool switch handler (preserves progress!)
  const handleToolChange = (tool: ToolType) => {
    setCurrentTool(tool);
    currentToolRef.current = tool;
    if (tool === 'brush') {
      setMascotSpeech('แปรงขนม้าพร้อมแล้ว! ลากถูคราบโคลนบนตัวรองเท้าให้ฟองฟู่ออกมาเลย!');
    } else if (tool === 'uv') {
      setMascotSpeech('ลำแสง UV ฟอกขอบยางเหลืองพร้อมแล้ว! ลากแสงตามขอบโฟมรองเท้าเพื่อแก้ขอบเหลือง!');
    } else if (tool === 'spray') {
      setMascotSpeech('สเปรย์นาโนชิลด์ขั้นสุดท้าย! พ่นเคลือบเงากันน้ำให้ขึ้นประกายเงาวับทั้งคู่!');
    }
  };

  // Sound toggle
  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    soundManager.enabled = nextState;
  };

  // Victory celebration trigger
  const triggerVictory = useCallback(() => {
    isCompletedRef.current = true;
    setIsCompleted(true);
    soundManager.playVictory();
    confetti({
      particleCount: 110,
      spread: 75,
      origin: { y: 0.55 },
    });
    setMascotSpeech('ว้าววว! สปาเสร็จสมบูรณ์ 100% สภาพเหมือนแกะกล่องวันแรก! กดปุ่มเพื่อไปกรอกข้อมูลรับ VIP Card ได้เล้ย!');
  }, []);

  // Tool logic application with bounding-box scaling
  const applyToolAt = useCallback((canvasX: number, canvasY: number) => {
    if (isCompletedRef.current) return;
    const tool = currentToolRef.current;
    const box = sneakerBoxRef.current;
    if (!box.width || !box.height) return;

    const relX = (canvasX - box.x) / box.width;
    const relY = (canvasY - box.y) / box.height;

    // Tool 1: Brush cleans mud decals
    if (tool === 'brush') {
      soundManager.playScrub();
      for (let p = 0; p < 3; p++) {
        particlesRef.current.push({
          x: canvasX + (Math.random() - 0.5) * 22,
          y: canvasY + (Math.random() - 0.5) * 22,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4 - 1.5,
          size: Math.random() * 7 + 3,
          alpha: 1,
          decay: Math.random() * 0.03 + 0.02,
          color: '#ffffff',
          type: 'foam',
        });
      }

      const hitRadiusNorm = 50 / box.width;
      stainsRef.current.forEach((stain) => {
        const dist = Math.hypot(relX - stain.normX, relY - stain.normY);
        if (dist < hitRadiusNorm + stain.normSize * 0.45) {
          stain.opacity = Math.max(0, stain.opacity - 0.18);
        }
      });
    }
    // Tool 2: UV bleaches aged yellow midsole
    else if (tool === 'uv') {
      soundManager.playUV();
      // Midsole is located at relY 0.58 .. 0.78 across relX 0.08 .. 0.94
      if (relX >= 0.08 && relX <= 0.94 && relY >= 0.58 && relY <= 0.80) {
        for (let p = 0; p < 2; p++) {
          particlesRef.current.push({
            x: canvasX + (Math.random() - 0.5) * 18,
            y: canvasY + (Math.random() - 0.5) * 18,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            size: Math.random() * 5 + 2,
            alpha: 1,
            decay: 0.035,
            color: '#c084fc',
            type: 'uv',
          });
        }
        midsoleOxidationRef.current = Math.max(0, midsoleOxidationRef.current - 3.2);
      }
    }
    // Tool 3: Nano Spray applies protective water-repellent layer
    else if (tool === 'spray') {
      soundManager.playSpray();
      if (relX >= 0.08 && relX <= 0.94 && relY >= 0.18 && relY <= 0.82) {
        for (let p = 0; p < 4; p++) {
          particlesRef.current.push({
            x: canvasX + (Math.random() - 0.5) * 32,
            y: canvasY + (Math.random() - 0.5) * 32,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: Math.random() * 4 + 2,
            alpha: 1,
            decay: 0.03,
            color: '#67e8f9',
            type: 'spray',
          });
        }
        nanoSprayRef.current = Math.min(100, nanoSprayRef.current + 2.8);
      }
    }

    // Calculate restoration progress
    const remainingStains = stainsRef.current.filter((s) => s.opacity > 0.05).length;
    const mudScore = ((totalStainsRef.current - remainingStains) / totalStainsRef.current) * 100;
    const uvScore = 100 - midsoleOxidationRef.current;
    const sprayScore = nanoSprayRef.current;
    const totalPct = Math.min(100, Math.round(mudScore * 0.45 + uvScore * 0.35 + sprayScore * 0.2));

    setProgress(totalPct);

    if (totalPct >= 100 && !isCompletedRef.current) {
      triggerVictory();
    }
  }, [triggerVictory]);

  // Handle dynamic canvas sizing for mobile and tablet with high DPR
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  }, []);

  // Preload all photographic image assets on mount
  useEffect(() => {
    const sneakerImg = new window.Image();
    sneakerImg.src = '/assets/sneakers/sneaker_clean_cutout.png';
    sneakerImg.onload = () => {
      sneakerImgRef.current = sneakerImg;
    };

    const midsoleImg = new window.Image();
    midsoleImg.src = '/assets/sneakers/midsole_mask.png';
    midsoleImg.onload = () => {
      midsoleMaskRef.current = midsoleImg;
    };

    const decals: HTMLImageElement[] = [];
    for (let i = 1; i <= 6; i++) {
      const img = new window.Image();
      img.src = `/assets/sneakers/mud_decal_${i}.png`;
      decals.push(img);
    }
    decalImgsRef.current = decals;

    assetsLoadedRef.current = true;
    initStains();
  }, [initStains]);

  // Window resize & global pointer release listeners
  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleGlobalUp = () => {
      isPointerDown.current = false;
    };
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [resizeCanvas]);

  // Main Canvas Render & Animation Loop (Zero distortion, 100% aspect ratio preserved)
  useEffect(() => {
    if (currentStep !== 2) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Enable high-quality sub-pixel anti-aliasing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.clearRect(0, 0, w, h);

      // The sneaker natural aspect ratio: 1200 / 896 ≈ 1.339
      const naturalW = 1200;
      const naturalH = 896;
      const imgRatio = naturalW / naturalH;

      let drawW = w * 0.92;
      let drawH = drawW / imgRatio;

      if (drawH > h * 0.82) {
        drawH = h * 0.82;
        drawW = drawH * imgRatio;
      }

      const drawX = (w - drawW) / 2;
      const drawY = (h - drawH) / 2 + 4;

      sneakerBoxRef.current = { x: drawX, y: drawY, width: drawW, height: drawH };

      // 1. Soft Realistic Drop Shadow beneath the shoe
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(drawX + drawW * 0.51, drawY + drawH * 0.80, drawW * 0.44, drawH * 0.065, -0.015, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Draw Crystal-Clear Sneaker Cutout (Original 4K Nike AF1 Quality)
      if (sneakerImgRef.current && sneakerImgRef.current.complete) {
        ctx.drawImage(sneakerImgRef.current, drawX, drawY, drawW, drawH);
      }

      // 3. Draw Aged Vintage Yellow Midsole Tint (Only on Midsole Rubber, Zero Box Overflow)
      if (midsoleOxidationRef.current > 0 && midsoleMaskRef.current && midsoleMaskRef.current.complete) {
        ctx.save();
        ctx.globalAlpha = (midsoleOxidationRef.current / 100) * 0.82;
        ctx.drawImage(midsoleMaskRef.current, drawX, drawY, drawW, drawH);
        ctx.restore();
      }

      // 4. Draw Photographic Mud & Dust Splatters (Crisp & Well-Positioned)
      stainsRef.current.forEach((stain) => {
        if (stain.opacity <= 0.02) return;
        const sx = drawX + stain.normX * drawW;
        const sy = drawY + stain.normY * drawH;
        const sSize = stain.normSize * drawW;
        const decal = decalImgsRef.current[stain.decalIndex];

        if (decal && decal.complete) {
          ctx.save();
          ctx.globalAlpha = stain.opacity;
          ctx.translate(sx, sy);
          ctx.rotate(stain.rotation);
          ctx.drawImage(decal, -sSize / 2, -sSize / 2, sSize, sSize);
          ctx.restore();
        }
      });

      // 5. Draw Hydrophobic Nano Protective Sheen (Tool 3)
      if (nanoSprayRef.current > 5) {
        ctx.save();
        ctx.globalAlpha = (nanoSprayRef.current / 100) * 0.30;
        const grad = ctx.createLinearGradient(drawX, drawY, drawX + drawW, drawY + drawH);
        grad.addColorStop(0, 'rgba(103, 232, 249, 0)');
        grad.addColorStop(0.45, 'rgba(103, 232, 249, 0.40)');
        grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.60)');
        grad.addColorStop(1, 'rgba(103, 232, 249, 0)');
        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillRect(drawX, drawY, drawW, drawH);
        ctx.restore();
      }

      // 6. Update & Draw Particles (Foam bubbles, UV rays, Spray mist)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }

      // 7. Active Pointer Glow / Reticle
      if (isPointerDown.current) {
        ctx.save();
        const px = pointerPos.current.x;
        const py = pointerPos.current.y;
        const activeTool = currentToolRef.current;

        if (activeTool === 'brush') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.70)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(px, py, 28, 0, Math.PI * 2);
          ctx.stroke();
        } else if (activeTool === 'uv') {
          const grad = ctx.createRadialGradient(px, py, 5, px, py, 45);
          grad.addColorStop(0, 'rgba(192, 132, 252, 0.75)');
          grad.addColorStop(1, 'rgba(192, 132, 252, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, 45, 0, Math.PI * 2);
          ctx.fill();
        } else if (activeTool === 'spray') {
          const grad = ctx.createRadialGradient(px, py, 8, px, py, 50);
          grad.addColorStop(0, 'rgba(103, 232, 249, 0.65)');
          grad.addColorStop(1, 'rgba(103, 232, 249, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, 50, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentStep]);

  // Pointer event handlers with accurate device scaling
  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isPointerDown.current = true;
    updatePointer(e);
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isPointerDown.current) return;
    updatePointer(e);
  };

  const handlePointerUp = () => {
    isPointerDown.current = false;
  };

  const updatePointer = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent<HTMLCanvasElement>).clientX;
      clientY = (e as React.MouseEvent<HTMLCanvasElement>).clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    pointerPos.current = { x, y };
    applyToolAt(x, y);
  };

  // Step 1: Video Controls
  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const toggleVideoMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setVideoMuted(vid.muted);
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setVideoCurrentTime(vid.currentTime);
    setVideoDuration(vid.duration || 21);
    setVideoProgress((vid.currentTime / (vid.duration || 21)) * 100);
  };

  // Step 3 -> Step 4: Submit Intake Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdpaConsent) return;

    // Strict validation: must be exactly 10 digits starting with 0
    const cleanPhone = memberPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setPhoneError('กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก (เฉพาะตัวเลข)');
      return;
    }
    if (!cleanPhone.startsWith('0')) {
      setPhoneError('เบอร์โทรศัพท์มือถือต้องขึ้นต้นด้วยเลข 0 (เช่น 0812345678)');
      return;
    }
    setPhoneError('');

    let persona = 'THE HYPEBEAST MASTER';
    if (selectedBrand.includes('New Balance')) persona = 'THE TIMELESS ARCHIVIST';
    else if (selectedBrand.includes('Salomon') || selectedBrand.includes('Asics')) persona = 'THE GORPCORE EXPLORER';
    else if (selectedBrand.includes('Adidas')) persona = 'THE TERRACE RETRO ICON';

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = `MBS-BLUE-${randomNum}`;

    setProfileResult({
      name: memberName.trim() || 'SNEAKERHEAD VIP',
      phoneNumber: cleanPhone,
      shoeSize: selectedSize,
      favoriteBrand: selectedBrand,
      wearFrequency: selectedFreq,
      pdpaConsent: pdpaConsent,
      personaName: persona,
      voucherCode: code,
      completedAt: new Date().toISOString(),
    });

    // Advance to Step 4
    setCurrentStep(4);
    soundManager.playVictory();
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  // Step 4: Copy Voucher Code to Clipboard
  const handleCopyCode = () => {
    if (!profileResult?.voucherCode) return;
    navigator.clipboard.writeText(profileResult.voucherCode);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2500);
  };

  // Step 4: Download Card as Image (Off-screen Canvas Export)
  const handleDownloadCard = () => {
    if (!profileResult) return;

    const cardCanvas = document.createElement('canvas');
    cardCanvas.width = 1200;
    cardCanvas.height = 760;
    const ctx = cardCanvas.getContext('2d');
    if (!ctx) return;

    // Load background image
    const bgImg = new window.Image();
    bgImg.src = '/assets/branding/vip_card_background.jpg';
    bgImg.onload = () => {
      // 1. Draw Background
      ctx.drawImage(bgImg, 0, 0, 1200, 760);

      // 2. Draw Subtle Dark Overlay for contrast
      ctx.fillStyle = 'rgba(10, 15, 25, 0.45)';
      ctx.fillRect(0, 0, 1200, 760);

      // 3. Header Texts
      ctx.fillStyle = '#67e8f9';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('MOONBLUES SNEAKER SPA • VIP BLACK CARD', 140, 120);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px sans-serif';
      ctx.fillText('MBS VERIFIED MEMBER # ' + profileResult.voucherCode, 140, 150);

      // 4. Member Persona & Name & Phone
      ctx.fillStyle = '#fbbf24';
      ctx.font = '900 48px sans-serif';
      ctx.fillText(profileResult.personaName, 140, 240);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      const formattedPhone = formatPhoneNumber(profileResult.phoneNumber);
      ctx.fillText(`MEMBER: ${profileResult.name.toUpperCase()} • TEL: ${formattedPhone}`, 140, 300);

      // 5. Specs Grid
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('SHOE SIZE: ' + profileResult.shoeSize, 140, 370);
      ctx.fillText('FAVORITE BRAND: ' + profileResult.favoriteBrand, 140, 410);
      ctx.fillText('ROTATION: ' + profileResult.wearFrequency, 140, 450);

      // 6. Draw Mascot Avatar Seal & Finish Export
      const finishExport = () => {
        // 7. Voucher Box
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(140, 500, 920, 130);

        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('EXCLUSIVE VOUCHER ส่วนลด 100 บาท (สำหรับบริการซักสปา)', 180, 545);

        ctx.fillStyle = '#0f172a';
        ctx.font = '900 44px monospace';
        ctx.fillText(profileResult.voucherCode, 180, 600);

        ctx.fillStyle = '#78350f';
        ctx.font = '16px sans-serif';
        ctx.fillText('แสดงรหัสที่ LINE OA @moonbluesstore', 650, 595);

        // Trigger download
        const link = document.createElement('a');
        link.download = `Moonblues_VIP_Card_${profileResult.voucherCode}.png`;
        link.href = cardCanvas.toDataURL('image/png');
        link.click();
      };

      const avatarImg = new window.Image();
      avatarImg.src = '/assets/mascot/nong_blue_avatar.png';
      avatarImg.onload = () => {
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(890, 200, 170, 170, 24);
        } else {
          ctx.rect(890, 200, 170, 170);
        }
        ctx.fill();
        ctx.stroke();
        ctx.drawImage(avatarImg, 900, 210, 150, 150);
        ctx.restore();
        finishExport();
      };
      avatarImg.onerror = finishExport;
    };
  };

  // Restart everything
  const handleRestart = () => {
    initStains();
    setCurrentStep(1);
    setProgress(0);
    setIsCompleted(false);
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen pb-12 select-none bg-slate-950 text-white font-sans antialiased">
      {/* Top Header */}
      <header className="w-full max-w-4xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between glass-panel sticky top-0 z-30">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden border border-cyan-400 flex-shrink-0">
            <Image src="/assets/branding/mbs_logo.png" alt="MBS Logo" fill className="object-cover" priority />
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent whitespace-nowrap">
              MOONBLUES SNEAKER SPA
            </h1>
            <p className="text-[9px] sm:text-[10px] text-cyan-400 font-semibold tracking-wider whitespace-nowrap">
              SNEAKER DOCTOR EXPERIENCE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={toggleSound}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition whitespace-nowrap"
          >
            {soundEnabled ? <Volume2 size={13} className="text-cyan-400" /> : <VolumeX size={13} className="text-gray-400" />}
            <span className="hidden xs:inline">เสียง: {soundEnabled ? 'เปิด' : 'ปิด'}</span>
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition whitespace-nowrap"
          >
            <RotateCcw size={13} />
            <span>เริ่มใหม่</span>
          </button>
        </div>
      </header>

      {/* 4-Step Progress Indicator Bar with Lucide React Icons (No Emojis) */}
      <nav className="w-full max-w-4xl px-3 sm:px-4 mt-3">
        <div className="p-1.5 sm:p-2 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-1 shadow-lg">
          {[
            { step: 1 as GameStep, label: 'วิดีโอ 20s', Icon: Film },
            { step: 2 as GameStep, label: 'สปารองเท้า', Icon: Gamepad2 },
            { step: 3 as GameStep, label: 'กรอกข้อมูล', Icon: FileEdit },
            { step: 4 as GameStep, label: 'บัตร Voucher', Icon: Ticket },
          ].map((item, idx) => {
            const isActive = currentStep === item.step;
            const isPassed = currentStep > item.step;
            const StepIcon = item.Icon;
            return (
              <React.Fragment key={item.step}>
                <button
                  type="button"
                  onClick={() => {
                    if (isPassed || isActive) setCurrentStep(item.step);
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all flex-grow justify-center whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600/30 border border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : isPassed
                      ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-400'
                      : 'bg-white/5 border border-white/5 text-gray-500'
                  }`}
                >
                  <StepIcon
                    size={14}
                    className={`flex-shrink-0 ${
                      isActive ? 'text-cyan-400' : isPassed ? 'text-emerald-400' : 'text-gray-400'
                    }`}
                  />
                  <span className="hidden sm:inline">
                    Step {item.step}: {item.label}
                  </span>
                  <span className="sm:hidden font-mono text-[11px]">S{item.step}</span>
                  {isPassed && <CheckCircle2 size={13} className="text-emerald-400 hidden xs:inline flex-shrink-0" />}
                </button>
                {idx < 3 && <ChevronRight size={13} className="text-gray-600 flex-shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </nav>

      {/* Main Container - 4 Steps */}
      <main className="w-full max-w-2xl sm:max-w-4xl px-3 sm:px-4 mt-3 flex flex-col items-center flex-grow">
        {/* ========================================================= */}
        {/* STEP 1: VERTICAL 9:16 WEB VIDEO (20sec-webvideo)         */}
        {/* ========================================================= */}
        {currentStep === 1 && (
          <section className="w-full flex flex-col items-center gap-3 animate-fadeIn">
            {/* Header Hint - Compact & Zero Line Breaks */}
            <div className="w-full max-w-[340px] sm:max-w-[370px] flex items-center justify-between text-[11px] sm:text-xs text-gray-400 px-1 gap-2">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
                ภารกิจที่ 1: ชมวิดีโอหมอน้องบลู (20s)
              </span>
              <button
                onClick={() => setCurrentStep(2)}
                className="text-gray-400 hover:text-white underline underline-offset-4 transition whitespace-nowrap flex-shrink-0"
              >
                ข้ามไปเล่นเกม ➔
              </button>
            </div>

            {/* Vertical Video 9:16 Card Container */}
            <div className="relative w-full max-w-[340px] sm:max-w-[370px] aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl border-2 border-cyan-500/40 bg-black flex items-center justify-center group">
              <video
                ref={videoRef}
                src="/assets/videos/20sec-webvideo.mp4"
                poster="/assets/videos/video_poster.jpg"
                playsInline
                loop={false}
                muted={videoMuted}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                  setIsPlaying(false);
                }}
                onClick={togglePlay}
                className="w-full h-full object-cover cursor-pointer"
              />

              {/* Big Play Overlay (when paused) */}
              {!isPlaying && (
                <button
                  type="button"
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-black/60 border-2 border-cyan-400 text-cyan-300 flex items-center justify-center backdrop-blur-md shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:scale-105 transition"
                  aria-label="Play Video"
                >
                  <Play size={36} className="ml-1 text-cyan-400" />
                </button>
              )}

              {/* Top Video Badges */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-bold text-cyan-400 tracking-wider">
                  20sec-webvideo
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVideoMute();
                  }}
                  className="pointer-events-auto p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:text-cyan-400 transition"
                  aria-label="Mute Video"
                >
                  {videoMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
              </div>

              {/* Bottom Video Controls Overlay */}
              <div className="absolute bottom-0 inset-x-0 p-3.5 bg-gradient-to-t from-black via-black/70 to-transparent flex flex-col gap-2">
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-100"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-300">
                  <span className="font-mono">
                    {Math.floor(videoCurrentTime)}s / {Math.floor(videoDuration)}s
                  </span>
                  <span className="text-cyan-400 font-semibold whitespace-nowrap">แตะเพื่อ เล่น/หยุด</span>
                </div>
              </div>
            </div>

            {/* Next Step CTA Button */}
            <div className="w-full max-w-[340px] sm:max-w-[370px] flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) videoRef.current.pause();
                  setCurrentStep(2);
                }}
                className="w-full py-3.5 px-4 rounded-2xl font-black text-sm bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 text-white shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>เริ่มเล่นเกมกู้ชีพรองเท้า (Step 2)</span>
                <ArrowRight size={18} />
              </button>
              <p className="text-center text-[11px] text-gray-400 whitespace-nowrap">
                ขัดคราบโคลน & ฟอกขอบเหลืองครบ 100% รับ Voucher 100.-
              </p>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* STEP 2: SNEAKER SPA GAME WORKBENCH                        */}
        {/* ========================================================= */}
        {currentStep === 2 && (
          <section className="w-full flex flex-col gap-3 sm:gap-4 animate-fadeIn">
            {/* Mascot HUD */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900/80 border border-blue-500/30 shadow-lg">
              <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-cyan-400 flex-shrink-0 animate-mascot-bob bg-gradient-to-b from-blue-900/60 to-slate-900 shadow-md">
                <Image src="/assets/mascot/nong_blue_avatar.png" alt="Nong Blue" fill className="object-contain p-1" priority />
              </div>
              <div className="flex-grow min-w-0">
                <div className="text-[10px] sm:text-[11px] font-bold tracking-wider text-cyan-400 uppercase truncate">
                  หมอน้องบลู • CHIEF SNEAKER DOCTOR
                </div>
                <p className="text-xs sm:text-sm font-medium text-white/95 leading-snug mt-0.5 line-clamp-2 sm:line-clamp-none">
                  {mascotSpeech}
                </p>
              </div>
            </div>

            {/* Workbench Card */}
            <div className="rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl flex flex-col">
              {/* Progress Bar */}
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-black/40 border-b border-white/5 flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                  <Sparkles size={14} className="text-cyan-400 flex-shrink-0" />
                  <span className="text-[11px] sm:text-xs whitespace-nowrap">ระดับการฟื้นฟู (RESTORATION):</span>
                </div>
                <div className="flex-grow h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="font-mono text-xs sm:text-sm font-extrabold text-cyan-400 min-w-[40px] text-right">
                  {progress}%
                </span>
              </div>

              {/* Interactive Canvas Container with High-Definition Workshop Background */}
              <div
                ref={containerRef}
                className="w-full h-[310px] sm:h-[380px] md:h-[430px] relative cursor-crosshair flex items-center justify-center bg-cover bg-center overflow-hidden"
                style={{
                  backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.40), rgba(11, 15, 25, 0.60)), url('/assets/mascot/spa_workbench.jpg')`,
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full block touch-none"
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                />
              </div>

              {/* Tools Shelf - 3 Column Grid with Zero Text Wrapping */}
              <div className="p-2 sm:p-3 bg-slate-950/90 border-t border-white/10 grid grid-cols-3 gap-1.5 sm:gap-3">
                {/* Tool 1: Brush */}
                <button
                  onClick={() => handleToolChange('brush')}
                  className={`flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-2.5 p-2 sm:px-3 sm:py-2.5 rounded-xl border transition-all ${
                    currentTool === 'brush'
                      ? 'bg-blue-600/30 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)] -translate-y-0.5'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="p-1 sm:p-1.5 rounded-lg bg-black/40 text-blue-400 flex-shrink-0">
                    <Paintbrush size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-xs font-bold text-white whitespace-nowrap">1. แปรงขัดโคลน</div>
                    <div className="text-[9px] text-gray-400 hidden sm:block whitespace-nowrap">ลากขัดคราบฝุ่นโคลน</div>
                  </div>
                </button>

                {/* Tool 2: UV */}
                <button
                  onClick={() => handleToolChange('uv')}
                  className={`flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-2.5 p-2 sm:px-3 sm:py-2.5 rounded-xl border transition-all ${
                    currentTool === 'uv'
                      ? 'bg-purple-600/30 border-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.35)] -translate-y-0.5'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="p-1 sm:p-1.5 rounded-lg bg-black/40 text-purple-400 flex-shrink-0">
                    <SunMedium size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-xs font-bold text-white whitespace-nowrap">2. ลำแสงยูวี</div>
                    <div className="text-[9px] text-gray-400 hidden sm:block whitespace-nowrap">ลากฟอกขอบยางเหลือง</div>
                  </div>
                </button>

                {/* Tool 3: Spray */}
                <button
                  onClick={() => handleToolChange('spray')}
                  className={`flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-2.5 p-2 sm:px-3 sm:py-2.5 rounded-xl border transition-all ${
                    currentTool === 'spray'
                      ? 'bg-emerald-600/30 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.35)] -translate-y-0.5'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="p-1 sm:p-1.5 rounded-lg bg-black/40 text-emerald-400 flex-shrink-0">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-xs font-bold text-white whitespace-nowrap">3. สเปรย์นาโน</div>
                    <div className="text-[9px] text-gray-400 hidden sm:block whitespace-nowrap">พ่นเคลือบเงากันน้ำ</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Victory / Next Step Banner */}
            {progress >= 100 && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border-2 border-emerald-400/80 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-bounce-short">
                <div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-300 whitespace-nowrap">🎉 สปาเสร็จสมบูรณ์ 100%! สภาพเหมือนแกะกล่อง!</div>
                  <div className="text-[11px] sm:text-xs text-gray-300">กดปุ่มเพื่อไปกรอกข้อมูลรับ Sneakerhead VIP Card & Voucher 100.-</div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-lg hover:scale-105 active:scale-95 transition flex items-center justify-center gap-2 flex-shrink-0 whitespace-nowrap"
                >
                  <span>ไปกรอกข้อมูลรับรางวัล (Step 3)</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </section>
        )}

        {/* ========================================================= */}
        {/* STEP 3: ZERO-PARTY DATA INTAKE FORM                       */}
        {/* ========================================================= */}
        {currentStep === 3 && (
          <section className="w-full max-w-xl flex flex-col gap-3.5 animate-fadeIn">
            {/* Mascot Greeting */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-blue-950/70 to-slate-900 border border-blue-500/30 shadow-lg">
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border-2 border-cyan-400 flex-shrink-0 animate-mascot-bob bg-gradient-to-b from-blue-900/60 to-slate-900 shadow-md">
                <Image src="/assets/mascot/nong_blue_avatar.png" alt="Nong Blue" fill className="object-contain p-1" priority />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] font-bold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                  ขั้นตอนที่ 3: ลงทะเบียน SNEAKERHEAD PROFILE
                </div>
                <p className="text-xs text-gray-200 mt-0.5 leading-snug">
                  ระบุไซส์และแบรนด์โปรดของคุณ เพื่อออกบัตร VIP และรับโค้ด Voucher 100.- ทันที!
                </p>
              </div>
            </div>

            {/* Form Card */}
            <form onSubmit={handleSubmitForm} className="p-4 sm:p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl flex flex-col gap-3.5 sm:gap-4">
              {/* Field 1: Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-blue-300 whitespace-nowrap">
                  1. ชื่อของคุณ หรือชื่อเล่น (สลักลงบนบัตร VIP)
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณธนกร, น้องนนท์ สตรีทแวร์"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-cyan-400 transition"
                />
              </div>

              {/* Field 2: Mobile Phone (Strict 10 Digits Only, No LINE ID) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-blue-300 whitespace-nowrap">
                    2. เบอร์โทรศัพท์มือถือของคุณ (เฉพาะตัวเลข 10 หลัก)
                  </label>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">
                    {memberPhone.length}/10
                  </span>
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                  placeholder="เช่น 0812345678 (กรอกได้เฉพาะตัวเลข 10 หลัก)"
                  value={memberPhone}
                  onChange={(e) => {
                    const onlyNums = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setMemberPhone(onlyNums);
                    if (phoneError) setPhoneError('');
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white placeholder-gray-500 text-xs sm:text-sm font-mono tracking-wider focus:outline-none transition ${
                    phoneError ? 'border-red-500' : 'border-white/10 focus:border-cyan-400'
                  }`}
                />
                {phoneError && (
                  <p className="text-[11px] text-red-400 font-semibold">{phoneError}</p>
                )}
              </div>

              {/* Field 3: Shoe Size - Compact Non-Wrapping Grid */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-blue-300 whitespace-nowrap">
                  3. คุณใส่รองเท้าไซส์มาตรฐานเท่าไหร่? (Shoe Size)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'US 7-8 (EU 40-41)',
                    'US 8.5-9.5 (EU 42-43)',
                    'US 10-11 (EU 44-45)',
                    'ไซส์พิเศษอื่นๆ',
                  ].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-medium border text-center transition whitespace-nowrap overflow-hidden text-ellipsis ${
                        selectedSize === size
                          ? 'bg-blue-600 border-cyan-400 text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 4: Favorite Brand - Compact Non-Wrapping Grid */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-blue-300 whitespace-nowrap">
                  4. แบรนด์สนีกเกอร์ลูกรักในดวงใจของคุณ?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Nike & Air Jordan', 'New Balance', 'Asics & Salomon', 'Adidas & Yeezy'].map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setSelectedBrand(brand)}
                      className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-medium border text-center transition whitespace-nowrap overflow-hidden text-ellipsis ${
                        selectedBrand === brand
                          ? 'bg-blue-600 border-cyan-400 text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 5: Frequency - Compact 3 Columns */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-blue-300 whitespace-nowrap">
                  5. ความถี่ในการสวมใส่สนีกเกอร์ของคุณ?
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {['ใส่ลุยทุกวัน', 'สลับใส่ 3-5 คู่', 'สะสม 10 คู่ขึ้น'].map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setSelectedFreq(freq)}
                      className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-medium border text-center transition whitespace-nowrap overflow-hidden text-ellipsis ${
                        selectedFreq === freq
                          ? 'bg-blue-600 border-cyan-400 text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              {/* PDPA Notice */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950 border border-emerald-500/40 text-[10px] sm:text-[11px] text-gray-300 leading-relaxed">
                <span className="font-bold text-emerald-400 block mb-0.5 whitespace-nowrap">นโยบายความเป็นส่วนตัว (PDPA Notice)</span>
                จัดเก็บข้อมูลไซส์และเบอร์โทรเพื่อวิเคราะห์สูตรสปาเฉพาะบุคคลและแจ้งเตือนพรีออเดอร์ตรงไซส์เท่านั้น ข้อมูลถูกจัดเก็บปลอดภัย และขอดูหรือขอลบได้ตลอดเวลาผ่าน LINE OA @moonbluesstore
                <label className="flex items-center gap-2 mt-2 cursor-pointer font-semibold text-white">
                  <input
                    type="checkbox"
                    checked={pdpaConsent}
                    onChange={(e) => setPdpaConsent(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded flex-shrink-0"
                  />
                  <span className="text-[10px] sm:text-[11px] leading-tight">ฉันเข้าใจและยินยอมให้ Moonbluesstore นำรสนิยมนี้ไปปรับปรุงการดูแลรองเท้า</span>
                </label>
              </div>

              {/* Submit Button - Single Line Responsive */}
              <button
                type="submit"
                disabled={!pdpaConsent}
                className="w-full py-3 sm:py-3.5 px-3 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-[0_0_25px_rgba(52,211,153,0.4)] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <span>ออกบัตร VIP CARD & รับ VOUCHER 100.- (Step 4)</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </section>
        )}

        {/* ========================================================= */}
        {/* STEP 4: LUXURY GRAPHIC VIP VOUCHER CARD                   */}
        {/* ========================================================= */}
        {currentStep === 4 && profileResult && (
          <section className="w-full max-w-xl flex flex-col items-center gap-3.5 animate-fadeIn">
            {/* Header Title */}
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-bold mb-1">
                <Sparkles size={13} />
                <span>STEP 4: SNEAKERHEAD VIP MEMBER PASS</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white whitespace-nowrap">บัตรสมาชิก VIP & VOUCHER CARD</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                ยินดีต้อนรับสู่ครอบครัว Moonbluesstore บัตรสมาชิกพร้อมส่วนลดของคุณเปิดใช้งานแล้ว!
              </p>
            </div>

            {/* Graphic VIP Card Preview Container */}
            <div className="w-full relative aspect-[1.58/1] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.35)] border-2 border-amber-400/80 p-3.5 sm:p-5 flex flex-col justify-between group">
              {/* Card Background Graphic */}
              <Image
                src="/assets/branding/vip_card_background.jpg"
                alt="VIP Card Background"
                fill
                className="object-cover -z-10 brightness-[0.88] group-hover:scale-105 transition-transform duration-700"
                priority
              />

              {/* Holographic light reflection sheen */}
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-amber-400/15 pointer-events-none -z-10" />

              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-cyan-400 shadow-md flex-shrink-0">
                    <Image src="/assets/branding/mbs_logo.png" alt="MBS Logo" fill className="object-cover" />
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs font-black tracking-widest text-cyan-300 uppercase whitespace-nowrap">
                      MOONBLUES SNEAKER SPA
                    </div>
                    <div className="text-[8px] sm:text-[9px] text-amber-400 font-semibold tracking-wider whitespace-nowrap">
                      VIP BLACK CARD • MEMBER PASS
                    </div>
                  </div>
                </div>

                {/* Smart Chip & NFC Graphic */}
                <div className="flex items-center gap-1.5 text-amber-400/90 text-right">
                  <div className="w-6 h-5 rounded-sm bg-gradient-to-r from-amber-300 to-yellow-500 border border-amber-200/50 flex flex-col justify-around p-0.5 shadow-sm">
                    <div className="w-full h-0.5 bg-yellow-700/60" />
                    <div className="w-full h-0.5 bg-yellow-700/60" />
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-mono tracking-widest text-gray-300">NFC</span>
                </div>
              </div>

              {/* Card Body: Persona & Member Info (Strict Phone Only) */}
              <div className="my-auto py-1 flex items-center justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="text-[8px] sm:text-[9px] font-extrabold tracking-widest text-amber-400 uppercase whitespace-nowrap">
                    MEMBER CLASSIFICATION
                  </div>
                  <div className="text-sm sm:text-xl md:text-2xl font-black bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 bg-clip-text text-transparent truncate drop-shadow">
                    {profileResult.personaName}
                  </div>
                  <div className="text-[11px] sm:text-sm font-bold text-white tracking-wide mt-0.5 truncate">
                    {profileResult.name}{' '}
                    <span className="text-cyan-300 font-mono font-medium">
                      (TEL: {formatPhoneNumber(profileResult.phoneNumber)})
                    </span>
                  </div>
                </div>

                {/* Mascot Hologram Avatar Seal */}
                <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-amber-400/90 shadow-[0_0_15px_rgba(251,191,36,0.4)] flex-shrink-0 bg-gradient-to-br from-amber-500/20 via-slate-900 to-amber-400/10">
                  <Image src="/assets/mascot/nong_blue_avatar.png" alt="Nong Blue Seal" fill className="object-contain p-1" />
                </div>
              </div>

              {/* Card Footer: Specs & Voucher Code - 3 Columns with Zero Overflow */}
              <div className="pt-1.5 border-t border-white/20 flex flex-col gap-1.5">
                <div className="grid grid-cols-3 gap-1 text-[8px] xs:text-[9px] sm:text-[10px] text-gray-300">
                  <div className="truncate">
                    <span className="text-gray-400">SIZE:</span>{' '}
                    <strong className="text-white">{profileResult.shoeSize}</strong>
                  </div>
                  <div className="truncate text-center">
                    <span className="text-gray-400">BRAND:</span>{' '}
                    <strong className="text-white">{profileResult.favoriteBrand}</strong>
                  </div>
                  <div className="truncate text-right">
                    <span className="text-gray-400">ROTATION:</span>{' '}
                    <strong className="text-white">{profileResult.wearFrequency}</strong>
                  </div>
                </div>

                {/* Golden Voucher Section */}
                <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 flex items-center justify-between shadow-lg">
                  <div>
                    <div className="text-[7.5px] sm:text-[8.5px] font-black uppercase tracking-wider text-amber-950 whitespace-nowrap">
                      EXCLUSIVE VOUCHER 100.-
                    </div>
                    <div className="font-mono text-xs sm:text-base font-black tracking-widest text-slate-950 whitespace-nowrap">
                      {profileResult.voucherCode}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[7.5px] sm:text-[8.5px] font-semibold text-amber-900 block whitespace-nowrap">
                      ลดทันที 100 บาทที่ LINE OA
                    </span>
                    <span className="text-[8.5px] sm:text-[10px] font-bold text-slate-950 whitespace-nowrap">
                      @moonbluesstore
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Toast Copied Notification */}
            {copyToast && (
              <div className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-lg animate-fadeIn flex items-center gap-1.5">
                <CheckCircle2 size={16} />
                <span>คัดลอกรหัส {profileResult.voucherCode} เรียบร้อยแล้ว!</span>
              </div>
            )}

            {/* Action Buttons Panel */}
            <div className="w-full flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="py-2.5 sm:py-3 px-2 sm:px-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 font-bold text-xs sm:text-sm text-cyan-300 flex items-center justify-center gap-1.5 transition whitespace-nowrap"
                >
                  <Copy size={15} />
                  <span>คัดลอกโค้ดส่วนลด</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadCard}
                  className="py-2.5 sm:py-3 px-2 sm:px-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-1.5 transition whitespace-nowrap"
                >
                  <Download size={15} />
                  <span>บันทึกรูปบัตร VIP</span>
                </button>
              </div>

              <a
                href="https://line.me"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-3 rounded-2xl bg-[#06C755] hover:brightness-110 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition whitespace-nowrap"
              >
                <MessageCircle size={17} />
                <span>ส่งรหัสเพื่อใช้บริการสปาที่ LINE OA @moonbluesstore</span>
              </a>

              <button
                type="button"
                onClick={handleRestart}
                className="text-center text-xs text-gray-400 hover:text-white py-1.5 transition whitespace-nowrap"
              >
                🔄 เริ่มเล่นใหม่อีกครั้ง (ตั้งแต่ Step 1)
              </button>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl text-center text-xs text-gray-500 mt-auto pt-6 px-3">
        <div>วิชา 1301418 Identity of Top Digital Marketer | Phase 4 Project</div>
        <div>Solo Consultant: TANAKORN JONGKEA (นายธนกร จงเกื้อ) | ร้าน Moonbluesstore</div>
      </footer>
    </div>
  );
}
