import { motion } from 'motion/react';

interface SkeletonProps {
  type: 'chart' | 'strategy' | 'sentiment';
}

export default function SkeletonLoader({ type }: SkeletonProps) {
  // Common shimmering animation class
  const shimmerClass = "relative overflow-hidden bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] rounded-xl";

  if (type === 'chart') {
    return (
      <div className="w-full space-y-4" id="chart-skeleton">
        {/* Style tag inside to ensure custom shimmer layout */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}} />
        
        {/* Chart Header Bar Skeleton */}
        <div className="flex justify-between items-center pb-2">
          <div className="flex items-center gap-3">
            <div className={`w-28 h-5 ${shimmerClass}`} />
            <div className={`w-12 h-4 ${shimmerClass}`} />
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-16 h-8 ${shimmerClass}`} />
            <div className={`w-16 h-8 ${shimmerClass}`} />
            <div className={`w-8 h-8 ${shimmerClass}`} />
          </div>
        </div>

        {/* Chart Main Candlestick Area */}
        <div className="h-[400px] lg:h-[500px] w-full border border-[#2a2e39]/50 rounded-2xl bg-black/25 relative overflow-hidden p-6 flex flex-col justify-between">
          {/* Subtle grid lines background mock */}
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-5 pointer-events-none opacity-20">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="border-b border-r border-gray-700/30" />
            ))}
          </div>

          {/* Indicator label bar */}
          <div className="flex gap-4 z-10">
            <div className={`w-32 h-4 ${shimmerClass}`} />
            <div className={`w-24 h-4 ${shimmerClass}`} />
            <div className={`w-20 h-4 ${shimmerClass}`} />
          </div>

          {/* Graphical Mock Candles & Volumes */}
          <div className="flex-1 flex items-end justify-between px-4 pb-12 pt-8 z-10 gap-2">
            {Array.from({ length: 24 }).map((_, i) => {
              const h = Math.max(30, Math.round(Math.random() * 180));
              const volH = Math.max(10, Math.round(Math.random() * 50));
              const isUp = Math.random() > 0.45;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                  {/* Candlestick Body & Wick */}
                  <div className="w-full flex flex-col items-center justify-center relative mb-4" style={{ height: `${h}px` }}>
                    {/* Wick */}
                    <div className={`w-[2px] h-full absolute ${isUp ? 'bg-emerald-500/30' : 'bg-red-500/30'} ${shimmerClass}`} style={{ top: '-10%', height: '120%' }} />
                    {/* Body */}
                    <div className={`w-full h-4/5 rounded-sm ${isUp ? 'bg-emerald-500/20 border border-emerald-500/35' : 'bg-red-500/20 border border-red-500/35'} animate-pulse`} />
                  </div>
                  {/* Volume Bar Mock */}
                  <div className={`w-full rounded-sm ${isUp ? 'bg-emerald-500/10' : 'bg-red-500/10'} animate-pulse`} style={{ height: `${volH}px` }} />
                </div>
              );
            })}
          </div>

          {/* Bottom axis coordinates bar */}
          <div className="flex justify-between text-xs pt-2 border-t border-[#2a2e39]/30 z-10 text-gray-600 font-mono">
            <div className={`w-16 h-3 ${shimmerClass}`} />
            <div className={`w-16 h-3 ${shimmerClass}`} />
            <div className={`w-16 h-3 ${shimmerClass}`} />
            <div className={`w-16 h-3 ${shimmerClass}`} />
            <div className={`w-16 h-3 ${shimmerClass}`} />
            <div className={`w-16 h-3 ${shimmerClass}`} />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'strategy') {
    return (
      <div className="w-full space-y-6" id="strategy-skeleton">
        {/* Style tag inside to ensure shimmer */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}} />

        {/* Multi-column layout mimicking Strategy Suite */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-start">
          {/* Left Column: Config Panel Skeleton */}
          <div className="lg:col-span-8 space-y-6">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className={`w-1/3 h-10 ${shimmerClass}`} />
                <div className={`w-1/3 h-10 ${shimmerClass}`} />
                <div className={`w-1/3 h-10 ${shimmerClass}`} />
              </div>
              
              <div className="bg-black/25 p-5 rounded-2xl border border-[#2a2e39]/50 space-y-4">
                <div className={`w-40 h-5 ${shimmerClass}`} />
                <div className="space-y-3">
                  <div className={`w-full h-12 ${shimmerClass}`} />
                  <div className={`w-full h-12 ${shimmerClass}`} />
                  <div className={`w-3/4 h-12 ${shimmerClass}`} />
                </div>
              </div>
            </div>

            {/* Simulated Live Rule Builder */}
            <div className="p-6 bg-black/20 rounded-2xl border border-[#2a2e39]/60 space-y-4">
              <div className="flex justify-between items-center">
                <div className={`w-48 h-6 ${shimmerClass}`} />
                <div className={`w-28 h-9 ${shimmerClass}`} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className={`h-10 ${shimmerClass}`} />
                <div className={`h-10 ${shimmerClass}`} />
                <div className={`h-10 ${shimmerClass}`} />
                <div className={`h-10 ${shimmerClass}`} />
              </div>
              <div className={`w-full h-14 ${shimmerClass}`} />
            </div>
          </div>

          {/* Right Column: Execution consensus card & Gauge skeleton */}
          <div className="lg:col-span-4 space-y-6">
            {/* Status Card Skeleton */}
            <div className="bg-[#131722]/80 border border-[#2a2e39]/80 p-6 rounded-2xl space-y-6 shadow-xl relative overflow-hidden">
              <div className="space-y-2 pb-4 border-b border-[#2a2e39]/50">
                <div className={`w-24 h-3 ${shimmerClass}`} />
                <div className={`w-48 h-6 ${shimmerClass}`} />
                <div className={`w-full h-8 ${shimmerClass}`} />
              </div>

              {/* Mock Sentiment Circular Gauge */}
              <div className="flex flex-col items-center justify-center py-4 bg-black/30 rounded-xl border border-white/5 space-y-3">
                <div className="w-24 h-24 rounded-full border-b-0 border-4 border-dashed border-[#2a2e39] opacity-40 animate-pulse flex items-center justify-center">
                  <div className="w-12 h-6 bg-white/5 rounded-t-full" />
                </div>
                <div className={`w-16 h-5 ${shimmerClass}`} />
                <div className={`w-24 h-3 ${shimmerClass}`} />
              </div>

              {/* Progress bars items representing indicators stability */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between">
                  <div className={`w-20 h-4 ${shimmerClass}`} />
                  <div className={`w-10 h-4 ${shimmerClass}`} />
                </div>
                <div className={`w-full h-2.5 ${shimmerClass}`} />
                <div className="flex justify-between">
                  <div className={`w-24 h-4 ${shimmerClass}`} />
                  <div className={`w-8 h-4 ${shimmerClass}`} />
                </div>
                <div className={`w-full h-2.5 ${shimmerClass}`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
