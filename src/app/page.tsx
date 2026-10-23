'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Volume2, VolumeX, RotateCcw, Sparkles, SunMedium, Paintbrush, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '@/lib/audio';
import { ToolType, StainPoint, ParticleItem, ZeroPartyProfile } from '@/types';

export default function SneakerSpaGamePage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTool, setCurrentTool] = useState<ToolType>('brush');
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);

  // Mascot Speech State
  const [mascotSpeech, setMascotSpeech] = useState(
    'โย่ว! คู่นี้อาการหนักเลยนะ! ใช้แปรงขัดโคลน โคมไฟยูวีฟอกขอบเหลือง และสเปรย์นาโนให้ครบ 100% แล้วรับคูปอง 100.- ไปเล้ย!'
  );

  // Zero-Party Data Form State
  const [selectedSize, setSelectedSize] = useState('US 8.5 - 9.5 (EU 42-43)');
  const [selectedBrand, setSelectedBrand] = useState('Nike & Air Jordan');
  const [selectedFreq, setSelectedFreq] = useState('สลับใส่ 3-5 คู่');
  const [pdpaConsent, setPdpaConsent] = useState(true);
  const [profileResult, setProfileResult] = useState<ZeroPartyProfile | null>(null);

  // Game Engine Internal Refs
  const isPointerDown = useRef(false);
  const pointerPos = useRef({ x: 0, y: 0 });
  const currentToolRef = useRef<ToolType>('brush');
  const isCompletedRef = useRef(false);

  // Sneaker box on canvas (for aspect ratio & hit detection)
  const sneakerBoxRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Restoration States
  const stainsRef = useRef<StainPoint[]>([]);
  const totalStainsRef = useRef(24);
  const midsoleOxidationRef = useRef(100); // 100% yellow -> 0% clean white
  const nanoSprayRef = useRef(0); // 0% -> 100%
  const particlesRef = useRef<ParticleItem[]>([]);

  // Image Asset Refs
  const sneakerImgRef = useRef<HTMLImageElement | null>(null);
  const soleTextureRef = useRef<HTMLImageElement | null>(null);
  const decalImgsRef = useRef<HTMLImageElement[]>([]);
  const assetsLoadedRef = useRef(false);

  // Initialize stains with photographic mud decal assignments
  const initStains = useCallback(() => {
    const list: StainPoint[] = [];

    // Pre-defined natural mud accumulation zones across the shoe upper
    // (mudguard, toe box, eyelet stays, quarter, swoosh, and heel counter)
    const zones = [
      // Toe Box & Front Mudguard (Heavy dirt)
      { minX: 0.62, maxX: 0.88, minY: 0.44, maxY: 0.64, minS: 0.08, maxS: 0.14 },
      { minX: 0.68, maxX: 0.86, minY: 0.48, maxY: 0.62, minS: 0.09, maxS: 0.15 },
      { minX: 0.58, maxX: 0.78, minY: 0.46, maxY: 0.60, minS: 0.07, maxS: 0.12 },
      // Quarter Panel & Swoosh (Splash streaks)
      { minX: 0.35, maxX: 0.62, minY: 0.35, maxY: 0.56, minS: 0.08, maxS: 0.13 },
      { minX: 0.38, maxX: 0.58, minY: 0.40, maxY: 0.58, minS: 0.07, maxS: 0.11 },
      // Heel & Collar (Splash drops)
      { minX: 0.14, maxX: 0.34, minY: 0.32, maxY: 0.55, minS: 0.08, maxS: 0.13 },
      { minX: 0.16, maxX: 0.30, minY: 0.40, maxY: 0.60, minS: 0.07, maxS: 0.12 },
      // Lower upper boundary above midsole (Road grime)
      { minX: 0.18, maxX: 0.85, minY: 0.55, maxY: 0.65, minS: 0.08, maxS: 0.14 },
    ];

    let idCounter = 0;
    zones.forEach((zone) => {
      // 3 stains per zone = 24 realistic stains total
      for (let j = 0; j < 3; j++) {
        list.push({
          id: idCounter++,
          normX: zone.minX + Math.random() * (zone.maxX - zone.minX),
          normY: zone.minY + Math.random() * (zone.maxY - zone.minY),
          normSize: zone.minS + Math.random() * (zone.maxS - zone.minS),
          rotation: Math.random() * Math.PI * 2,
          opacity: 0.90 + Math.random() * 0.10,
          decalIndex: Math.floor(Math.random() * 6), // Picks 1 of 6 authentic decals
        });
      }
    });

    stainsRef.current = list;
    totalStainsRef.current = list.length;
    midsoleOxidationRef.current = 100;
    nanoSprayRef.current = 0;
    isCompletedRef.current = false;
    setProgress(0);
    setIsCompleted(false);
    setShowModal(false);
    setShowIdCard(false);
    setProfileResult(null);
  }, []);

  // Update speech & ref when switching tools (preserves progress!)
  const handleToolChange = (tool: ToolType) => {
    setCurrentTool(tool);
    currentToolRef.current = tool;
    if (tool === 'brush') {
      setMascotSpeech('แปรงขนม้าพร้อมแล้ว! คลิกลากถูบริเวณคราบโคลนบนตัวรองเท้าให้ฟองฟู่ออกมาเลย!');
    } else if (tool === 'uv') {
      setMascotSpeech('ลำแสง UV De-Oxidation พร้อมฉาย! ลากแสงตามขอบโฟมรองเท้าด้านล่างเพื่อแก้ขอบเหลือง!');
    } else if (tool === 'spray') {
      setMascotSpeech('สเปรย์นาโนชิลด์ขั้นสุดท้าย! พ่นเคลือบแก้วกันน้ำให้ขึ้นประกายเงาวับทั้งคู่!');
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
    setMascotSpeech('ว้าววว! สปาเสร็จสมบูรณ์ 100% สภาพเหมือนแกะกล่องวันแรก! กรอกข้อมูลเพื่อรับบัตรสมาชิก + Voucher ได้เลย!');
    setTimeout(() => {
      setShowModal(true);
    }, 1200);
  }, []);

  // Tool logic application with bounding-box scaling
  const applyToolAt = useCallback((canvasX: number, canvasY: number) => {
    if (isCompletedRef.current) return;
    const tool = currentToolRef.current;
    const box = sneakerBoxRef.current;
    if (!box.width || !box.height) return;

    // Hit coordinates normalized to sneaker bounding box (0..1)
    const relX = (canvasX - box.x) / box.width;
    const relY = (canvasY - box.y) / box.height;

    // Tool 1: Brush cleans mud decals
    if (tool === 'brush') {
      soundManager.playScrub();
      for (let p = 0; p < 3; p++) {
        particlesRef.current.push({
          x: canvasX + (Math.random() - 0.5) * 24,
          y: canvasY + (Math.random() - 0.5) * 24,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4 - 1.5,
          size: Math.random() * 8 + 3,
          alpha: 1,
          decay: Math.random() * 0.03 + 0.02,
          color: '#ffffff',
          type: 'foam',
        });
      }

      // Hit radius in normalized sneaker units (~50px on canvas)
      const hitRadiusNorm = 52 / box.width;
      stainsRef.current.forEach((stain) => {
        const dist = Math.hypot(relX - stain.normX, relY - stain.normY);
        if (dist < hitRadiusNorm + stain.normSize * 0.45) {
          stain.opacity = Math.max(0, stain.opacity - 0.16);
        }
      });
    }
    // Tool 2: UV bleaches aged yellow midsole
    else if (tool === 'uv') {
      soundManager.playUV();
      // Midsole hit area on the shoe: relX: 0.06 - 0.94, relY: 0.58 - 0.84
      if (relX >= 0.06 && relX <= 0.94 && relY >= 0.58 && relY <= 0.84) {
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
        midsoleOxidationRef.current = Math.max(0, midsoleOxidationRef.current - 2.8);
      }
    }
    // Tool 3: Nano Spray applies protective water-repellent layer
    else if (tool === 'spray') {
      soundManager.playSpray();
      if (relX >= 0.06 && relX <= 0.94 && relY >= 0.20 && relY <= 0.88) {
        for (let p = 0; p < 4; p++) {
          particlesRef.current.push({
            x: canvasX + (Math.random() - 0.5) * 35,
            y: canvasY + (Math.random() - 0.5) * 35,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: Math.random() * 4 + 2,
            alpha: 1,
            decay: 0.03,
            color: '#67e8f9',
            type: 'spray',
          });
        }
        nanoSprayRef.current = Math.min(100, nanoSprayRef.current + 2.5);
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

  // Handle dynamic canvas sizing for mobile and tablet with Device Pixel Ratio
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  }, []);

  // Preload all photographic image assets on mount
  useEffect(() => {
    // 1. Clean Sneaker Cutout
    const sneakerImg = new window.Image();
    sneakerImg.src = '/assets/sneakers/sneaker_clean_cutout.png';
    sneakerImg.onload = () => {
      sneakerImgRef.current = sneakerImg;
    };

    // 2. Aged Midsole Rubber Texture
    const soleImg = new window.Image();
    soleImg.src = '/assets/sneakers/midsole_yellow_texture.png';
    soleImg.onload = () => {
      soleTextureRef.current = soleImg;
    };

    // 3. Photographic Mud Decals 1-6
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // The sneaker natural aspect ratio: 1200 / 896 ≈ 1.339
      const naturalW = 1200;
      const naturalH = 896;
      const imgRatio = naturalW / naturalH;

      // Fit inside canvas preserving exact aspect ratio with padding
      let drawW = w * 0.90;
      let drawH = drawW / imgRatio;

      if (drawH > h * 0.80) {
        drawH = h * 0.80;
        drawW = drawH * imgRatio;
      }

      const drawX = (w - drawW) / 2;
      const drawY = (h - drawH) / 2 + 6;

      sneakerBoxRef.current = { x: drawX, y: drawY, width: drawW, height: drawH };

      // 1. Soft Realistic Drop Shadow beneath the shoe
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(drawX + drawW * 0.50, drawY + drawH * 0.88, drawW * 0.44, drawH * 0.08, -0.015, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Draw Clean Sneaker Cutout
      if (sneakerImgRef.current && sneakerImgRef.current.complete) {
        ctx.drawImage(sneakerImgRef.current, drawX, drawY, drawW, drawH);
      }

      // 3. Draw Aged Vintage Midsole Texture ("ขอบเหลือง")
      if (midsoleOxidationRef.current > 0 && soleTextureRef.current && soleTextureRef.current.complete) {
        const soleX = drawX + drawW * 0.075;
        const soleY = drawY + drawH * 0.635;
        const soleW = drawW * 0.85;
        const soleH = drawH * 0.165;

        // Multiply authentic rubber grain & yellow patina
        ctx.save();
        ctx.globalAlpha = (midsoleOxidationRef.current / 100) * 0.88;
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(soleTextureRef.current, soleX, soleY, soleW, soleH);
        ctx.restore();

        // Warm yellow aging color layer
        ctx.save();
        ctx.globalAlpha = (midsoleOxidationRef.current / 100) * 0.35;
        ctx.fillStyle = '#b47814';
        ctx.globalCompositeOperation = 'color';
        ctx.fillRect(soleX, soleY, soleW, soleH);
        ctx.restore();
      }

      // 4. Draw Photographic Mud & Dust Decals
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
        ctx.globalAlpha = (nanoSprayRef.current / 100) * 0.32;
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
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(px, py, 30, 0, Math.PI * 2);
          ctx.stroke();
        } else if (activeTool === 'uv') {
          const grad = ctx.createRadialGradient(px, py, 5, px, py, 48);
          grad.addColorStop(0, 'rgba(192, 132, 252, 0.75)');
          grad.addColorStop(1, 'rgba(192, 132, 252, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, 48, 0, Math.PI * 2);
          ctx.fill();
        } else if (activeTool === 'spray') {
          const grad = ctx.createRadialGradient(px, py, 8, px, py, 55);
          grad.addColorStop(0, 'rgba(103, 232, 249, 0.65)');
          grad.addColorStop(1, 'rgba(103, 232, 249, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, 55, 0, Math.PI * 2);
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
  }, []);

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

  // Submit Zero-Party Data & Claim Voucher
  const handleClaimVoucher = () => {
    setShowModal(false);
    setShowIdCard(true);

    let persona = 'THE HYPEBEAST MASTER';
    if (selectedBrand.includes('New Balance')) persona = 'THE TIMELESS ARCHIVIST';
    else if (selectedBrand.includes('Salomon')) persona = 'THE GORPCORE EXPLORER';
    else if (selectedBrand.includes('Adidas')) persona = 'THE TERRACE RETRO ICON';

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const code = `MBS-BLUE-${randomNum}`;

    setProfileResult({
      shoeSize: selectedSize,
      favoriteBrand: selectedBrand,
      wearFrequency: selectedFreq,
      pdpaConsent: pdpaConsent,
      personaName: persona,
      voucherCode: code,
      completedAt: new Date().toISOString(),
    });

    setMascotSpeech(`ยินดีด้วยครับ! คุณได้รับฉายา ${persona} บันทึกรสนิยมและไซส์เรียบร้อย นำรหัส Voucher ไปแสดงที่ LINE ได้เลย!`);
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen pb-12 select-none">
      {/* Header */}
      <header className="w-full max-w-4xl px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between glass-panel sticky top-0 z-30">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden border border-cyan-400">
            <Image src="/assets/branding/mbs_logo.png" alt="MBS Logo" fill className="object-cover" priority />
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              MOONBLUES SNEAKER SPA
            </h1>
            <p className="text-[9px] sm:text-[10px] text-cyan-400 font-semibold tracking-wider">
              SNEAKER DOCTOR SIMULATOR
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={toggleSound}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            {soundEnabled ? <Volume2 size={13} className="text-cyan-400" /> : <VolumeX size={13} className="text-gray-400" />}
            <span className="hidden xs:inline">เสียง: {soundEnabled ? 'เปิด' : 'ปิด'}</span>
          </button>
          <button
            onClick={initStains}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <RotateCcw size={13} />
            <span>เริ่มใหม่</span>
          </button>
        </div>
      </header>

      {/* Main Container - Mobile & Tablet Optimized */}
      <main className="w-full max-w-2xl sm:max-w-4xl px-3 sm:px-4 mt-3 sm:mt-4 flex flex-col gap-3 sm:gap-4">
        {/* Mascot HUD */}
        <section className="flex items-center gap-2.5 sm:gap-3.5 p-2.5 sm:p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900/80 border border-blue-500/30 shadow-lg">
          <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 border-cyan-400 flex-shrink-0 animate-mascot-bob">
            <Image src="/assets/mascot/nong_blue_avatar.png" alt="Nong Blue" fill className="object-cover object-top" priority />
          </div>
          <div className="flex-grow min-w-0">
            <div className="text-[10px] sm:text-[11px] font-bold tracking-wider text-cyan-400 uppercase truncate">
              หมอน้องบลู • CHIEF SNEAKER DOCTOR
            </div>
            <p className="text-xs sm:text-sm font-medium text-white/95 leading-snug mt-0.5 line-clamp-2 sm:line-clamp-none">
              {mascotSpeech}
            </p>
          </div>
        </section>

        {/* Workbench Card */}
        <section className="rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl flex flex-col">
          {/* Progress Bar */}
          <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-black/40 border-b border-white/5 flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
              <Sparkles size={14} className="text-cyan-400 flex-shrink-0" />
              <span className="text-[11px] sm:text-xs">ระดับการฟื้นฟู (RESTORATION):</span>
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

          {/* Interactive Canvas Container with Workshop Background (Mobile responsive height) */}
          <div
            ref={containerRef}
            className="w-full h-[310px] sm:h-[380px] md:h-[430px] relative cursor-crosshair flex items-center justify-center bg-cover bg-center overflow-hidden"
            style={{
              backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.78), rgba(11, 15, 25, 0.90)), url('/assets/mascot/nong_blue_workshop.jpg')`,
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

          {/* Tools Shelf - 3 Column Grid for Mobile & Tablets */}
          <div className="p-2.5 sm:p-3.5 bg-slate-950/90 border-t border-white/10 grid grid-cols-3 gap-2 sm:gap-3">
            {/* Tool 1: Brush */}
            <button
              onClick={() => handleToolChange('brush')}
              className={`flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1.5 sm:gap-2.5 p-2 sm:px-4 sm:py-2.5 rounded-xl border transition-all ${
                currentTool === 'brush'
                  ? 'bg-blue-600/30 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)] -translate-y-0.5'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-black/40 text-blue-400 flex-shrink-0">
                <Paintbrush size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-bold text-white truncate">1. แปรงขัดโคลน</div>
                <div className="text-[9px] sm:text-[10px] text-gray-400 hidden sm:block">ลากขัดคราบฝุ่นโคลน</div>
              </div>
            </button>

            {/* Tool 2: UV */}
            <button
              onClick={() => handleToolChange('uv')}
              className={`flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1.5 sm:gap-2.5 p-2 sm:px-4 sm:py-2.5 rounded-xl border transition-all ${
                currentTool === 'uv'
                  ? 'bg-purple-600/30 border-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.35)] -translate-y-0.5'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-black/40 text-purple-400 flex-shrink-0">
                <SunMedium size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-bold text-white truncate">2. ลำแสงยูวี</div>
                <div className="text-[9px] sm:text-[10px] text-gray-400 hidden sm:block">ลากฟอกขอบยางเหลือง</div>
              </div>
            </button>

            {/* Tool 3: Spray */}
            <button
              onClick={() => handleToolChange('spray')}
              className={`flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1.5 sm:gap-2.5 p-2 sm:px-4 sm:py-2.5 rounded-xl border transition-all ${
                currentTool === 'spray'
                  ? 'bg-emerald-600/30 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.35)] -translate-y-0.5'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-black/40 text-emerald-400 flex-shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-bold text-white truncate">3. สเปรย์นาโน</div>
                <div className="text-[9px] sm:text-[10px] text-gray-400 hidden sm:block">พ่นเคลือบเงากันน้ำ</div>
              </div>
            </button>
          </div>
        </section>

        {/* Sneakerhead Member ID Card Result Display */}
        {showIdCard && profileResult && (
          <section className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-amber-400/80 shadow-2xl flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div>
                <div className="text-[10px] font-bold text-amber-400 tracking-wider">
                  MOONBLUES SNEAKER MEMBER CARD
                </div>
                <div className="text-lg sm:text-xl font-black text-yellow-200">{profileResult.personaName}</div>
              </div>
              <div className="text-right text-[11px] sm:text-xs text-gray-400">MBS VERIFIED MEMBER</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 sm:p-2.5 rounded-lg bg-white/5">
                <span className="text-[10px] text-gray-400 block">SHOE SIZE</span>
                <strong className="text-white text-xs">{profileResult.shoeSize}</strong>
              </div>
              <div className="p-2 sm:p-2.5 rounded-lg bg-white/5">
                <span className="text-[10px] text-gray-400 block">FAVORITE BRAND</span>
                <strong className="text-white text-xs">{profileResult.favoriteBrand}</strong>
              </div>
              <div className="p-2 sm:p-2.5 rounded-lg bg-white/5">
                <span className="text-[10px] text-gray-400 block">PRESCRIBED CARE</span>
                <strong className="text-white text-xs">Deep Foam Clean + UV De-Yellowing</strong>
              </div>
              <div className="p-2 sm:p-2.5 rounded-lg bg-white/5">
                <span className="text-[10px] text-gray-400 block">ROTATION FREQUENCY</span>
                <strong className="text-white text-xs">{profileResult.wearFrequency}</strong>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-center shadow-lg">
              <div className="text-[10px] font-bold uppercase tracking-wider text-orange-100">
                EXCLUSIVE VOUCHER CODE (ส่วนลด 100 บาท)
              </div>
              <div className="font-mono text-xl sm:text-2xl font-black tracking-widest text-white my-0.5">
                {profileResult.voucherCode}
              </div>
              <div className="text-[10px] text-orange-200">
                แคปหน้าจอเพื่อใช้เป็นส่วนลดบริการซักสปาที่ LINE OA @moonbluesstore
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Zero-Party Preference & ID Card Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border-2 border-cyan-400 rounded-3xl w-full max-w-lg p-5 sm:p-6 flex flex-col gap-3.5 sm:gap-4 shadow-2xl my-auto">
            <div className="text-center border-b border-white/10 pb-2.5">
              <h2 className="text-lg sm:text-xl font-extrabold text-white">ภารกิจฟื้นฟูสำเร็จ 100%!</h2>
              <p className="text-xs text-cyan-400 mt-0.5">
                ระบุไซส์และแบรนด์โปรดเพื่อรับ Sneakerhead Member ID และ Voucher 100.-
              </p>
            </div>

            {/* Q1: Size */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-blue-300">1. คุณใส่รองเท้าไซส์มาตรฐานเท่าไหร่? (Shoe Size)</label>
              <div className="grid grid-cols-2 gap-1.5">
                {['US 7.0 - 8.0 (EU 40-41)', 'US 8.5 - 9.5 (EU 42-43)', 'US 10.0 - 11.0 (EU 44-45)', 'ไซส์พิเศษอื่นๆ'].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium border text-center transition ${
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

            {/* Q2: Brand */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-blue-300">2. แบรนด์สนีกเกอร์ลูกรักในดวงใจของคุณ?</label>
              <div className="grid grid-cols-2 gap-1.5">
                {['Nike & Air Jordan', 'New Balance', 'Asics & Salomon', 'Adidas & Yeezy'].map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setSelectedBrand(brand)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium border text-center transition ${
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

            {/* Q3: Frequency */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-blue-300">3. ความถี่ในการสวมใส่สนีกเกอร์?</label>
              <div className="grid grid-cols-3 gap-1.5">
                {['ใส่ลุยทุกวัน', 'สลับใส่ 3-5 คู่', 'สะสม 10 คู่ขึ้น'].map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setSelectedFreq(freq)}
                    className={`py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-medium border text-center transition ${
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

            {/* PDPA Box */}
            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950 border border-emerald-500/40 text-[10px] sm:text-[11px] text-gray-300 leading-relaxed">
              <span className="font-bold text-emerald-400 block mb-0.5">นโยบายความเป็นส่วนตัว (PDPA Notice)</span>
              Moonbluesstore จัดเก็บไซส์และแบรนด์โปรดเพื่อวิเคราะห์สูตรสปาเฉพาะบุคคลและแจ้งเตือนพรีออเดอร์ตรงไซส์เท่านั้น ข้อมูลถูกจัดเก็บปลอดภัย และขอดูหรือขอลบได้ตลอดเวลาผ่าน LINE OA @moonbluesstore
              <label className="flex items-center gap-2 mt-2 cursor-pointer font-semibold text-white">
                <input
                  type="checkbox"
                  checked={pdpaConsent}
                  onChange={(e) => setPdpaConsent(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span>ฉันเข้าใจและยินยอมให้ Moonbluesstore นำรสนิยมนี้ไปปรับปรุงการดูแลรองเท้า</span>
              </label>
            </div>

            <button
              type="button"
              disabled={!pdpaConsent}
              onClick={handleClaimVoucher}
              className="w-full py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              สร้าง SNEAKERHEAD ID CARD และรับ VOUCHER
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full max-w-4xl text-center text-xs text-gray-500 mt-auto pt-6 px-3">
        <div>วิชา 1301418 Identity of Top Digital Marketer | Phase 4 Project</div>
        <div>Solo Consultant: TANAKORN JONGKEA (นายธนกร จงเกื้อ) | ร้าน Moonbluesstore</div>
      </footer>
    </div>
  );
}
