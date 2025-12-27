import React, { useState } from 'react';
import { GateResult } from '../types';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Move, Maximize, User, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface GateCardProps {
  gate: GateResult;
  isOpen?: boolean;
}

const GateCard: React.FC<GateCardProps> = ({
  gate,
  isOpen: defaultIsOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultIsOpen);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="w-6 h-6" />;
      case 'warning': return <AlertTriangle className="w-6 h-6" />;
      case 'failed': return <XCircle className="w-6 h-6" />;
      default: return <CheckCircle2 className="w-6 h-6" />;
    }
  };

  const renderVisuals = () => {
    if (gate.gateId === 1) { // Framing Gate Visualization
      const d = gate.details;
      const data = [
        { name: 'Current', size: d.subjectSize.current },
        { name: 'Reference', size: d.subjectSize.reference },
      ];

      return (
        <div className="space-y-6 animate-fadeIn">
          {/* Shot Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg border shadow-sm text-center min-w-0 ${d.shotType.current !== d.shotType.reference ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
              <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider block">현재 샷 (Current)</span>
              <p className={`text-base font-bold break-words leading-tight mt-1 ${d.shotType.current !== d.shotType.reference ? 'text-amber-600' : 'text-gray-800'}`}>{d.shotType.current}</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-center min-w-0">
              <span className="text-xs uppercase text-gray-500 font-semibold tracking-wider block">레퍼런스 (Ref)</span>
              <p className="text-base font-bold text-[#BE1818] break-words leading-tight mt-1">{d.shotType.reference}</p>
            </div>
          </div>
          {d.shotType.current !== d.shotType.reference && (
            <div className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 -mt-2 break-words">
              <span className="inline-block">샷 타입이 다릅니다:</span> <span className="font-semibold">{d.shotType.current}</span> <span className="inline-block">→</span> <span className="font-semibold">{d.shotType.reference}</span>
            </div>
          )}

          {/* Subject Size Chart */}
          <div className="bg-white p-4 rounded-lg border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Maximize className="w-4 h-4" /> 인물 비중 (화면 점유율)
            </h4>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={data} margin={{ left: 0, right: 0 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    interval={0}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="size" radius={[0, 4, 4, 0]} barSize={20}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : '#BE1818'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-center text-gray-500 mt-1">
              차이 (Diff): <span className="font-medium text-amber-600">{d.subjectSize.diff}%</span>
            </p>
          </div>

          {/* Margins Visualizer */}
          <div className="bg-slate-900 p-6 rounded-xl relative mx-auto max-w-[240px] aspect-[3/4] flex items-center justify-center">
            {/* Top */}
            <div className="absolute top-2 text-center w-full">
              <div className="text-white text-[10px]">상단: {d.margins.vertical.currentTop}%</div>
              <div className="text-gray-400 text-[9px]">(Ref: {d.margins.vertical.refTop}%)</div>
            </div>

            {/* Bottom */}
            <div className="absolute bottom-2 text-center w-full">
              <div className="text-white text-[10px]">하단: {d.margins.vertical.currentBottom}%</div>
              <div className="text-gray-400 text-[9px]">(Ref: {d.margins.vertical.refBottom}%)</div>
            </div>

            {/* Left */}
            <div className="absolute left-1 top-1/2 -translate-y-1/2 text-center -rotate-90 origin-center">
              <div className="text-white text-[10px] whitespace-nowrap">좌: {d.margins.horizontal.currentLeft}%</div>
              <div className="text-gray-400 text-[9px] whitespace-nowrap">(Ref: {d.margins.horizontal.refLeft}%)</div>
            </div>

            {/* Right */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 text-center rotate-90 origin-center">
              <div className="text-white text-[10px] whitespace-nowrap">우: {d.margins.horizontal.currentRight}%</div>
              <div className="text-gray-400 text-[9px] whitespace-nowrap">(Ref: {d.margins.horizontal.refRight}%)</div>
            </div>

            <div className="w-1/3 h-1/3 border-2 border-dashed border-white/50 rounded flex items-center justify-center">
              <User className="text-white/50 w-8 h-8" />
            </div>

            {/* Margins Status Overlay */}
            <div className="absolute -bottom-16 w-full text-center space-y-1">
              <div className="flex items-center justify-between text-xs px-2">
                <span className="text-slate-500">좌우 균형</span>
                <span className={`font-semibold ${d.margins.horizontal.status === 'passed' ? 'text-green-600' : 'text-amber-600'}`}>
                  {d.margins.horizontal.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs px-2">
                <span className="text-slate-500">상하 균형</span>
                <span className={`font-semibold ${d.margins.vertical.status === 'passed' ? 'text-green-600' : 'text-amber-600'}`}>
                  {d.margins.vertical.status}
                </span>
              </div>
            </div>
          </div>
          <div className="h-16"></div> {/* Spacer for status overlay */}
        </div>
      );
    }

    if (gate.gateId === 0) { // Aspect Ratio
      const d = gate.details;
      return (
        <div className="grid grid-cols-2 gap-3 mt-2 animate-fadeIn">
          <div className="bg-slate-50 p-4 rounded-lg text-center min-w-0">
            <div className="text-sm text-slate-500 mb-1">레퍼런스 (Reference)</div>
            <div className="font-mono font-bold text-base sm:text-lg break-all">{d.reference.width} x {d.reference.height}</div>
            <div className="text-xs text-[#BE1818] font-semibold bg-red-50 px-2 py-1 rounded mt-1 inline-block max-w-full truncate">{d.reference.label}</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg text-center min-w-0">
            <div className="text-sm text-slate-500 mb-1">현재 (Current)</div>
            <div className="font-mono font-bold text-base sm:text-lg break-all">{d.current.width} x {d.current.height}</div>
            <div className="text-xs text-[#BE1818] font-semibold bg-red-50 px-2 py-1 rounded mt-1 inline-block max-w-full truncate">{d.current.label}</div>
          </div>
        </div>
      );
    }

    if (gate.gateId === 2) { // Composition
      const d = gate.details;
      return (
        <div className="flex items-center justify-center gap-8 mt-2 animate-fadeIn">
          <div className="relative w-32 h-32 bg-slate-100 border border-slate-300 grid grid-cols-3 grid-rows-3 flex-shrink-0">
            {/* Simple grid lines */}
            <div className="border-r border-slate-300 col-span-1 h-full absolute left-1/3"></div>
            <div className="border-r border-slate-300 col-span-1 h-full absolute left-2/3"></div>
            <div className="border-b border-slate-300 row-span-1 w-full absolute top-1/3"></div>
            <div className="border-b border-slate-300 row-span-1 w-full absolute top-2/3"></div>

            {/* Reference Dot (Target) - Dashed Gray */}
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-dashed border-gray-400 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 z-10"
              style={{ left: `${d.facePosition.reference.x * 100}%`, top: `${d.facePosition.reference.y * 100}%` }}
            ></div>

            {/* Current Dot (User) - Blue Solid */}
            <div
              className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 z-20"
              style={{ left: `${d.facePosition.current.x * 100}%`, top: `${d.facePosition.current.y * 100}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> 현재 얼굴 위치</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-dashed border-gray-400 rounded-full"></div> 목표 위치</div>
          </div>
        </div>
      );
    }

    if (gate.gateId === 3) { // Compression
      const d = gate.details;
      // Default to 0.5 if invalid range
      const currVal = Math.min(Math.max(d.current.val || 0.5, 0), 2.0);
      const refVal = Math.min(Math.max(d.reference.val || 0.5, 0), 2.0);

      // Map value to 0-100% for chart (assuming 0-1 range mostly, but can go higher)
      // Visual range: 0.0 to 1.0 (0=Wide, 1=Tele)
      const toPct = (val: number) => Math.min(Math.max(val, 0), 1) * 100;

      return (
        <div className="mt-4 animate-fadeIn">
          <div className="relative h-24 bg-slate-100 rounded-lg mb-6 mx-4 sm:mx-12">
            {/* Scale 0.0 - 1.0 */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-300 -translate-y-1/2 rounded"></div>

            {/* Reference Marker (Top) */}
            <div
              className="absolute top-[25%] -translate-y-full flex flex-col items-center transition-all duration-500 z-10 group"
              style={{ left: `clamp(15%, ${toPct(d.reference.val)}%, 85%)` }}
            >
              <div className="text-[9px] sm:text-[10px] bg-slate-800 text-white px-1 sm:px-1.5 py-0.5 rounded mb-1 max-w-[100px] sm:max-w-none text-center leading-tight shadow-sm opacity-90">
                <span className="hidden sm:inline">Ref: </span>{d.reference.label || 'Unknown'} ({(d.reference.val || 0).toFixed(2)})
              </div>
              <div className="w-3 h-3 bg-slate-800 rounded-full border-2 border-white shadow-sm"></div>
              <div className="w-0.5 h-4 sm:h-6 bg-slate-300"></div>
            </div>

            {/* Current Marker (Bottom) */}
            <div
              className="absolute top-[75%] flex flex-col items-center transition-all duration-500 z-20 group"
              style={{ left: `clamp(15%, ${toPct(d.current.val)}%, 85%)` }}
            >
              <div className="w-0.5 h-4 sm:h-6 bg-red-200"></div>
              <div className="w-4 h-4 bg-[#BE1818] rounded-full border-2 border-white shadow-md"></div>
              <div className="text-[10px] sm:text-xs font-bold text-[#BE1818] bg-red-50 px-1.5 sm:px-2 py-0.5 rounded mt-1 max-w-[100px] sm:max-w-none text-center leading-tight border border-red-100 shadow-sm">
                <span className="hidden sm:inline">Current: </span>{d.current.label || 'Unknown'} ({(d.current.val || 0).toFixed(2)})
              </div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 px-4">
            <span>광각 (Wide)</span>
            <span>표준 (Normal)</span>
            <span>망원 (Tele)</span>
          </div>
        </div>
      );
    }

    if (gate.gateId === 4) { // Pose
      const d = gate.details;
      const angle = d.shoulderTilt || 0;

      return (
        <div className="flex flex-col items-center justify-center py-4 animate-fadeIn">
          <div className="relative w-40 h-40 bg-slate-50 rounded-full border border-slate-200 flex items-center justify-center mb-4">
            {/* Vertical Guide */}
            <div className="absolute top-0 bottom-0 w-px bg-slate-200"></div>

            {/* Shoulder Line (Reference - Level) */}
            <div className="absolute w-24 h-0.5 bg-slate-300 border-dashed"></div>

            {/* Shoulder Line (Current - Tilted) */}
            <div
              className="absolute w-28 h-1 bg-[#BE1818] rounded origin-center transition-all duration-500 shadow-sm"
              style={{ transform: `rotate(${angle}deg)` }}
            ></div>

            {/* Head */}
            <div className="absolute top-8 w-10 h-10 bg-slate-200 rounded-full border-2 border-white"></div>
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">어깨 기울기</div>
            <div className={`text-xl font-bold ${Math.abs(angle) > 5 ? 'text-[#BE1818]' : 'text-green-600'}`}>
              {angle.toFixed(1)}°
            </div>
            {Math.abs(angle) > 5 && (
              <div className="text-xs text-[#BE1818] mt-1 bg-red-50 px-2 py-1 rounded">
                수평에서 {angle.toFixed(1)}도 기울어짐
              </div>
            )}
          </div>
        </div>
      );
    }

    // Default fallback if no specific visualization
    return (
      <div className="flex flex-col items-center justify-center h-32 text-slate-400 bg-slate-50 rounded-lg animate-fadeIn">
        <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
        <span className="text-sm">추가 데이터 시각화 없음</span>
      </div>
    );
  };

  return (
    <div className={`border rounded-2xl transition-all duration-300 overflow-hidden ${getStatusColor(gate.status)} bg-white bg-opacity-100`}>
      <div
        className={`p-4 sm:p-5 flex items-center justify-between cursor-pointer gap-3 ${isOpen ? 'border-b border-gray-100' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div className={`p-2 rounded-full shrink-0 ${gate.status === 'passed' ? 'bg-green-100 text-green-600' : gate.status === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
            {getIcon(gate.status)}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-base sm:text-lg flex flex-wrap items-center gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm font-medium text-gray-400 uppercase tracking-wider">Gate {gate.gateId}</span>
              <span className="break-words">{gate.title}</span>
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 line-clamp-2">{gate.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <span className="block text-2xl font-bold text-gray-900">{gate.score}</span>
            <span className="text-xs text-gray-400 font-medium">점수 (SCORE)</span>
          </div>
          <span className="sm:hidden text-lg font-bold text-gray-900">{gate.score}</span>
          {isOpen ? <ChevronUp className="text-gray-400 shrink-0" /> : <ChevronDown className="text-gray-400 shrink-0" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-6 bg-white animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Left: Data Visualization */}
            <div className="order-2 md:order-1">
              {renderVisuals()}
            </div>

            {/* Right: Feedback & Action Items */}
            <div className="order-1 md:order-2 space-y-4">
              <h4 className="font-bold text-gray-900 border-b pb-2">분석 피드백 (Analysis Feedback)</h4>
              <ul className="space-y-3">
                {gate.feedback.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg min-w-0">
                    {idx === 0 && gate.status !== 'passed' ? (
                      <Move className="w-5 h-5 text-[#BE1818] mt-0.5 shrink-0" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 shrink-0" />
                    )}
                    <span className={`text-sm break-words leading-relaxed ${idx === 0 ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              {gate.status !== 'passed' && (
                <div className="mt-4 p-3 sm:p-4 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-xs font-bold text-[#BE1818] uppercase tracking-wider mb-1">추천 조정 (Recommendation)</p>
                  <p className="text-sm text-[#991313] break-words leading-relaxed">
                    {gate.gateId === 0 && "카메라 설정에서 비율을 레퍼런스와 동일하게 변경하세요."}
                    {gate.gateId === 1 && "위의 피드백을 참고하여 카메라 위치나 줌을 조정하세요."}
                    {gate.gateId === 2 && "피사체가 목표 그리드 위치에 오도록 구도를 조정하세요."}
                    {gate.gateId === 3 && "줌 레벨을 조정하여 레퍼런스와 유사한 압축감을 만드세요."}
                    {gate.gateId === 4 && "어깨 기울기나 자세를 조정하세요."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GateCard;