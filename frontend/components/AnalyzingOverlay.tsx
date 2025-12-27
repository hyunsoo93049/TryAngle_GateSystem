import React, { useEffect, useState, useRef } from 'react';
import { X, CheckCircle2, ScanLine, Zap } from 'lucide-react';

interface AnalyzingOverlayProps {
  imageUrl: string; 
  onComplete?: () => void;
  onCancel?: () => void;
}

const ANALYSIS_STEPS = [
  "이미지 로딩 중...",
  "주요 피사체 감지 중...",
  "얼굴 표정 분석 중...",
  "조명 및 컬러 밸런스 확인...",
  "AI 피드백 생성 중..."
];

const AnalyzingOverlay: React.FC<AnalyzingOverlayProps> = ({ 
  imageUrl, 
  onComplete = () => {}, 
  onCancel = () => {} 
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();

  // Total duration of the fake analysis in milliseconds
  const DURATION = 4500; 

  // Animation loop for smooth progress
  const animate = (time: number) => {
    if (!startTimeRef.current) startTimeRef.current = time;
    const runtime = time - startTimeRef.current;
    const relativeProgress = Math.min(runtime / DURATION, 1);

    setProgress(relativeProgress * 100);

    // Calculate which text step to show based on progress
    const stepIndex = Math.min(
      Math.floor(relativeProgress * ANALYSIS_STEPS.length),
      ANALYSIS_STEPS.length - 1
    );
    setCurrentStepIndex(stepIndex);

    if (runtime < DURATION) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      // Finished
      setTimeout(() => {
        onComplete();
      }, 500); // Small pause at 100%
    }
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden">
      {/* Background Ambience - Blurred copy of image */}
      <div 
        className="absolute inset-0 opacity-30 blur-3xl scale-150 pointer-events-none transition-all duration-1000"
        style={{ backgroundImage: `url(${imageUrl})`, backgroundPosition: 'center', backgroundSize: 'cover' }}
      />
      
      {/* Grid Pattern Overlay for "Tech" feel */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ 
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}
      />

      {/* Cancel Button */}
      <button 
        onClick={onCancel}
        className="absolute top-6 right-6 z-50 p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition-all"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center">
        
        {/* Scanning Frame */}
        <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gray-900">
          
          {/* The Image */}
          <img 
            src={imageUrl} 
            alt="Analyzing" 
            className="w-full h-full object-cover opacity-80"
          />

          {/* Scanning Line Animation */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {/* The moving bar */}
            <div className="w-full h-[2px] bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-scan" />
            
            {/* Gradient fading trail behind the bar (optional visual flair) */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-red-500/10 to-transparent animate-scan-trail opacity-50" />
            
            {/* Reticle / Corners to look like a viewfinder */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-red-500/50 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-red-500/50 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-red-500/50 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-red-500/50 rounded-br-lg" />
          </div>

          {/* Detecting Object Indicators (Fake pulsating circles) */}
          <div className="absolute top-[30%] left-[40%] w-16 h-16 border border-white/30 rounded-full animate-ping opacity-20" />
          <div className="absolute top-[30%] left-[40%] w-16 h-16 border border-red-500/40 rounded-full scale-100 opacity-60" />

        </div>

        {/* Text and Progress Section */}
        <div className="w-full mt-10 space-y-6">
          
          {/* Dynamic Status Text */}
          <div className="h-8 flex flex-col items-center justify-center relative">
            <p className="text-xl font-medium tracking-wide text-white animate-pulse-slow">
              {ANALYSIS_STEPS[currentStepIndex]}
            </p>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs text-gray-400 font-mono">
              <span>AI PROCESSING</span>
              <span>{Math.round(progress)}%</span>
            </div>
            
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Technical Metadata (Decorations) */}
          <div className="grid grid-cols-3 gap-2 mt-4 opacity-50">
             <div className="flex flex-col items-center bg-white/5 rounded p-2 border border-white/5">
                <ScanLine className="w-4 h-4 text-red-400 mb-1" />
                <span className="text-[10px] text-gray-400 uppercase">Detection</span>
             </div>
             <div className="flex flex-col items-center bg-white/5 rounded p-2 border border-white/5">
                <Zap className="w-4 h-4 text-yellow-400 mb-1" />
                <span className="text-[10px] text-gray-400 uppercase">Lighting</span>
             </div>
             <div className="flex flex-col items-center bg-white/5 rounded p-2 border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-green-400 mb-1" />
                <span className="text-[10px] text-gray-400 uppercase">Quality</span>
             </div>
          </div>

        </div>
      </div>
      
      {/* CSS Animation injection for the scanner */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes scan-trail {
          0% { height: 0%; top: 0; opacity: 0; }
          50% { opacity: 0.3; }
          100% { height: 20%; top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
        .animate-scan-trail {
          animation: scan-trail 2s linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default AnalyzingOverlay;