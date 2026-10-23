'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Volume2, VolumeX, RotateCcw, Sparkles, SunMedium, Paintbrush, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '@/lib/audio';
import { ToolType, StainPoint, ParticleItem, ZeroPartyProfile } from '@/types';

export default function SneakerSpaGamePage() {
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
  const stainsRef = useRef<StainPoint[]>([]);
  const totalStainsRef = useRef(26);
  const midsoleOxidationRef = useRef(100); // 100% yellow -> 0% white
  const nanoSprayRef = useRef(0); // 0% -> 100%
  const particlesRef = useRef<ParticleItem[]>([]);
  const sneakerImgRef = useRef<HTMLImageElement | null>(null);
  const sneakerImgLoadedRef = useRef(false);

  // Initialize stains
  const initStains = useCallback(() => {
    const list: StainPoint[] = [];
    for (let i = 0; i < 26; i++) {
      list.push({
        id: i,
        normX: 0.22 + Math.random() * 0.58,
        normY: 0.38 + Math.random() * 0.34,
        radius: 12 + Math.random() * 16,
        opacity: 0.85 + Math.random() * 0.15,
        color: Math.random() > 0.4 ? 'rgba(78, 52, 46, ' : 'rgba(44, 40, 37, ',
      });
    }
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

  // Update speech when switching tools
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
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    setMascotSpeech('ว้าววว! สปาเสร็จสมบูรณ์ 100% สภาพเหมือนแกะกล่องวันแรก! กรอกข้อมูลเพื่อรับบัตรสมาชิก + Voucher ได้เลย!');
    setTimeout(() => {
      setShowModal(true);
    }, 1200);
  }, []);

  // Tool logic application
  const applyToolAt = useCallback((x: number, y: number, width: number, height: number) => {
    if (isCompletedRef.current) return;
    const tool = currentToolRef.current;

    if (tool === 'brush') {
      soundManager.playScrub();
      for (let p = 0; p < 3; p++) {
        particlesRef.current.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4 - 1.5,
          size: Math.random() * 9 + 2,
          alpha: 1,
          decay: Math.random() * 0.03 + 0.02,
          color: '#ffffff',
          type: 'foam',
        });
      }

      stainsRef.current.forEach((stain) => {
        const sx = stain.normX * width;
        const sy = stain.normY * height;
        const dist = Math.hypot(x - sx, y - sy);
        if (dist < 45) {
          stain.opacity -= 0.12;
          if (stain.opacity < 0.05) stain.opacity = 0;
        }
      });
    } else if (tool === 'uv') {
      soundManager.playUV();
      const normY = y / height;
      const normX = x / width;
      if (normY > 0.64 && normY < 0.82 && normX > 0.18 && normX < 0.82) {
        for (let p = 0; p < 2; p++) {
          particlesRef.current.push({
            x: x + (Math.random() - 0.5) * 15,
            y: y + (Math.random() - 0.5) * 15,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            size: Math.random() * 4 + 2,
            alpha: 1,
            decay: 0.03,
            color: '#c084fc',
            type: 'uv',
          });
        }
        midsoleOxidationRef.current = Math.max(0, midsoleOxidationRef.current - 2.8);
      }
    } else if (tool === 'spray') {
      soundManager.playSpray();
      const normY = y / height;
      const normX = x / width;
      if (normY > 0.32 && normY < 0.82 && normX > 0.18 && normX < 0.85) {
        for (let p = 0; p < 4; p++) {
          particlesRef.current.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 30,
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

    // Calculate progress
    const remainingStains = stainsRef.current.filter((s) => s.opacity > 0.1).length;
    const mudScore = ((totalStainsRef.current - remainingStains) / totalStainsRef.current) * 100;
    const uvScore = 100 - midsoleOxidationRef.current;
    const sprayScore = nanoSprayRef.current;
    const totalPct = Math.min(100, Math.round(mudScore * 0.45 + uvScore * 0.35 + sprayScore * 0.2));

    setProgress(totalPct);

    if (totalPct >= 100 && !isCompletedRef.current) {
      triggerVictory();
    }
  }, [triggerVictory]);

  // Initial stain generation on component mount
  useEffect(() => {
    initStains();
  }, [initStains]);

  // Global window pointer up listener so dragging off-canvas releases cleanly
  useEffect(() => {
    const handleGlobalUp = () => {
      isPointerDown.current = false;
    };
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, []);

  // Main Canvas Render & Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load base sneaker image
    const img = new window.Image();
    img.src = '/assets/sneakers/sneaker_clean.jpg';
    img.onload = () => {
      sneakerImgRef.current = img;
      sneakerImgLoadedRef.current = true;
    };

    let animationFrameId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.82, w * 0.4, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw Sneaker
      if (sneakerImgLoadedRef.current && sneakerImgRef.current) {
        const imgW = w * 0.74;
        const imgH = imgW * (sneakerImgRef.current.naturalHeight / sneakerImgRef.current.naturalWidth);
        const imgX = (w - imgW) / 2;
        const imgY = (h - imgH) / 2 + 10;
        ctx.drawImage(sneakerImgRef.current, imgX, imgY, imgW, imgH);

        // Yellow Midsole Overlay
        if (midsoleOxidationRef.current > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'color';
          ctx.globalAlpha = (midsoleOxidationRef.current / 100) * 0.75;
          ctx.fillStyle = '#ca8a04';
          ctx.beginPath();
          ctx.rect(imgX + imgW * 0.08, imgY + imgH * 0.68, imgW * 0.85, imgH * 0.22);
          ctx.fill();
          ctx.restore();
        }

        // Nano Glimmer Layer
        if (nanoSprayRef.current > 10) {
          ctx.save();
          ctx.globalAlpha = (nanoSprayRef.current / 100) * 0.28;
          ctx.fillStyle = '#67e8f9';
          ctx.beginPath();
          ctx.ellipse(w * 0.5, h * 0.55, w * 0.32, h * 0.18, -0.05, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Draw Stains
      stainsRef.current.forEach((stain) => {
        if (stain.opacity <= 0) return;
        ctx.save();
        ctx.fillStyle = stain.color + stain.opacity + ')';
        ctx.beginPath();
        ctx.arc(stain.normX * w, stain.normY * h, stain.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(stain.normX * w + 8, stain.normY * h - 6, stain.radius * 0.4, 0, Math.PI * 2);
        ctx.arc(stain.normX * w - 7, stain.normY * h + 7, stain.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Update & Draw Particles
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

      // Active Tool Pointer Effect
      if (isPointerDown.current) {
        ctx.save();
        const px = pointerPos.current.x;
        const py = pointerPos.current.y;
        const activeTool = currentToolRef.current;
        if (activeTool === 'brush') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(px, py, 28, 0, Math.PI * 2);
          ctx.stroke();
        } else if (activeTool === 'uv') {
          const grad = ctx.createRadialGradient(px, py, 5, px, py, 45);
          grad.addColorStop(0, 'rgba(192, 132, 252, 0.7)');
          grad.addColorStop(1, 'rgba(192, 132, 252, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, 45, 0, Math.PI * 2);
          ctx.fill();
        } else if (activeTool === 'spray') {
          const grad = ctx.createRadialGradient(px, py, 10, px, py, 55);
          grad.addColorStop(0, 'rgba(103, 232, 249, 0.6)');
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

  // Pointer event handlers
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
    applyToolAt(x, y, canvas.width, canvas.height);
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
    <div className="flex flex-col items-center w-full min-h-screen pb-12">
      {/* Header */}
      <header className="w-full max-w-4xl px-4 py-3 flex items-center justify-between glass-panel sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-cyan-400">
            <Image src="/assets/branding/mbs_logo.png" alt="MBS Logo" fill className="object-cover" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              MOONBLUES SNEAKER SPA
            </h1>
            <p className="text-[10px] text-cyan-400 font-semibold tracking-wider">SNEAKER DOCTOR SIMULATOR</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            {soundEnabled ? <Volume2 size={14} className="text-cyan-400" /> : <VolumeX size={14} className="text-gray-400" />}
            <span>เสียง: {soundEnabled ? 'เปิด' : 'ปิด'}</span>
          </button>
          <button
            onClick={initStains}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <RotateCcw size={14} />
            <span>เริ่มใหม่</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-4xl px-4 mt-4 flex flex-col gap-4">
        {/* Mascot HUD */}
        <section className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/60 to-slate-900/80 border border-blue-500/30 shadow-lg">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-cyan-400 flex-shrink-0 animate-mascot-bob">
            <Image src="/assets/mascot/nong_blue_avatar.png" alt="Nong Blue" fill className="object-cover object-top" />
          </div>
          <div className="flex-grow">
            <div className="text-[11px] font-bold tracking-wider text-cyan-400 uppercase">
              หมอน้องบลู • CHIEF SNEAKER DOCTOR
            </div>
            <p className="text-sm font-medium text-white/95 leading-snug mt-0.5">{mascotSpeech}</p>
          </div>
        </section>

        {/* Workbench Card */}
        <section className="rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl flex flex-col">
          {/* Progress Bar */}
          <div className="px-4 py-3 bg-black/40 border-b border-white/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
              <Sparkles size={14} className="text-cyan-400" />
              <span>ระดับการฟื้นฟู (RESTORATION):</span>
            </div>
            <div className="flex-grow h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-mono text-sm font-extrabold text-cyan-400 min-w-[45px] text-right">{progress}%</span>
          </div>

          {/* Interactive Canvas Container with Workshop Background */}
          <div
            className="w-full h-[380px] relative cursor-crosshair flex items-center justify-center bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(rgba(11, 15, 25, 0.78), rgba(11, 15, 25, 0.90)), url('/assets/mascot/nong_blue_workshop.jpg')`,
            }}
          >
            <canvas
              ref={canvasRef}
              width={860}
              height={380}
              className="w-full h-full block"
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            />
          </div>

          {/* Tools Shelf */}
          <div className="p-3.5 bg-slate-950/90 border-t border-white/10 flex justify-center gap-3 flex-wrap">
            <button
              onClick={() => handleToolChange('brush')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-left transition-all ${
                currentTool === 'brush'
                  ? 'bg-blue-600/30 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.35)] -translate-y-0.5'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-black/40 text-blue-400">
                <Paintbrush size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">1. แปรงขนม้าโฟมหนา</div>
                <div className="text-[10px] text-gray-400">คลิกลากขัดคราบโคลนฝังแน่น</div>
              </div>
            </button>

            <button
              onClick={() => handleToolChange('uv')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-left transition-all ${
                currentTool === 'uv'
                  ? 'bg-purple-600/30 border-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.35)] -translate-y-0.5'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-black/40 text-purple-400">
                <SunMedium size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">2. ลำแสงยูวีโอโซน</div>
                <div className="text-[10px] text-gray-400">ลากฉายแสงฟอกขอบยางเหลือง</div>
              </div>
            </button>

            <button
              onClick={() => handleToolChange('spray')}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-left transition-all ${
                currentTool === 'spray'
                  ? 'bg-emerald-600/30 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.35)] -translate-y-0.5'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-black/40 text-emerald-400">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">3. สเปรย์นาโนชิลด์</div>
                <div className="text-[10px] text-gray-400">พ่นละอองเคลือบเงากันน้ำ</div>
              </div>
            </button>
          </div>
        </section>

        {/* Sneakerhead Member ID Card Result Display */}
        {showIdCard && profileResult && (
          <section className="p-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-amber-400/80 shadow-2xl flex flex-col gap-3.5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div>
                <div className="text-[10px] font-bold text-amber-400 tracking-wider">
                  MOONBLUES SNEAKER MEMBER CARD
                </div>
                <div className="text-xl font-black text-yellow-200">{profileResult.personaName}</div>
              </div>
              <div className="text-right text-xs text-gray-400">MBS VERIFIED MEMBER</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white/5">
                <span className="text-[10px] text-gray-400 block">SHOE SIZE</span>
                <strong className="text-white text-xs">{profileResult.shoeSize}</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5">
                <span className="text-[10px] text-gray-400 block">FAVORITE BRAND</span>
                <strong className="text-white text-xs">{profileResult.favoriteBrand}</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5">
                <span className="text-[10px] text-gray-400 block">PRESCRIBED CARE</span>
                <strong className="text-white text-xs">Deep Foam Clean + UV De-Yellowing</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5">
                <span className="text-[10px] text-gray-400 block">ROTATION FREQUENCY</span>
                <strong className="text-white text-xs">{profileResult.wearFrequency}</strong>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-center shadow-lg">
              <div className="text-[10px] font-bold uppercase tracking-wider text-orange-100">
                EXCLUSIVE VOUCHER CODE (ส่วนลด 100 บาท)
              </div>
              <div className="font-mono text-2xl font-black tracking-widest text-white my-0.5">
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
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-cyan-400 rounded-3xl w-full max-w-lg p-6 flex flex-col gap-4 shadow-2xl">
            <div className="text-center border-b border-white/10 pb-3">
              <h2 className="text-xl font-extrabold text-white">ภารกิจฟื้นฟูสำเร็จ 100%!</h2>
              <p className="text-xs text-cyan-400 mt-1">
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
                    className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition ${
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
                    className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition ${
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
                    className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition ${
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
            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 text-[11px] text-gray-300 leading-relaxed">
              <span className="font-bold text-emerald-400 block mb-1">นโยบายความเป็นส่วนตัว (PDPA Notice)</span>
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
              className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              สร้าง SNEAKERHEAD ID CARD และรับ VOUCHER
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full max-w-4xl text-center text-xs text-gray-500 mt-auto pt-8">
        <div>วิชา 1301418 Identity of Top Digital Marketer | Phase 4 Project</div>
        <div>Solo Consultant: TANAKORN JONGKEA (นายธนกร จงเกื้อ) | ร้าน Moonbluesstore</div>
      </footer>
    </div>
  );
}
