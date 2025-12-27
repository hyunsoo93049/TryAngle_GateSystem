import React from 'react';
import { AnalysisReport } from '../types';
import { RadialBarChart, RadialBar, Legend, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { Award, Clock, Activity } from 'lucide-react';

interface SummaryProps {
  report: AnalysisReport;
}

const Summary: React.FC<SummaryProps> = ({ report }) => {
  const data = [
    { name: '압축감 (Compression)', value: report.summary.compressionScore, fill: '#8884d8' },
    { name: '구도 (Composition)', value: report.summary.compositionScore, fill: '#BE1818' },
    { name: '프레이밍 (Framing)', value: report.summary.framingScore, fill: '#E57373' },
    { name: '종횡비 (Aspect Ratio)', value: report.summary.aspectRatioScore, fill: '#FFCDD2' },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden h-full flex flex-col">
      {/* Header Section */}
      <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white shrink-0">
        <h2 className="text-2xl font-bold mb-2">분석 완료 (Analysis Complete)</h2>
        <p className="text-slate-300 text-sm leading-relaxed">{report.overallFeedback}</p>
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col gap-6 grow">
        
        {/* Top Row: Score & Chart */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          
          {/* Left: Score & Metadata */}
          <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left min-w-[140px]">
             <span className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-1">최종 점수 (Total Score)</span>
             <div className="flex items-baseline gap-1">
               <span className="text-6xl font-black text-[#BE1818] tracking-tighter">{report.finalScore}</span>
               <span className="text-lg text-gray-400 font-medium">/100</span>
             </div>
             
             <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                   <Clock className="w-3 h-3" /> {report.processingTime}s
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                   <Activity className="w-3 h-3" /> V6.0
                </div>
             </div>
          </div>

          {/* Right: Chart */}
          <div className="w-full sm:w-1/2 h-40 relative flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart 
                innerRadius="40%" 
                outerRadius="100%" 
                data={data} 
                startAngle={180} 
                endAngle={0}
                cy="70%" 
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={6} />
                <Legend 
                  iconSize={8} 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right" 
                  wrapperStyle={{fontSize: '10px', fontWeight: 600, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center'}} 
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row: Executive Summary Box */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
           <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 pb-2 border-b border-gray-200">
             <Award className="w-4 h-4 text-amber-500" /> 요약 리포트 (Executive Summary)
           </h3>
           <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm">
              <li className="flex justify-between items-center p-1 hover:bg-white rounded transition-colors">
                <span className="text-gray-600">종횡비</span>
                <span className={`font-bold ${report.summary.aspectRatioScore >= 90 ? 'text-green-600' : 'text-amber-500'}`}>
                  {report.summary.aspectRatioScore >= 90 ? 'Perfect' : 'Check'}
                </span>
              </li>
              <li className="flex justify-between items-center p-1 hover:bg-white rounded transition-colors">
                <span className="text-gray-600">압축감</span>
                <span className={`font-bold ${report.summary.compressionScore >= 80 ? 'text-green-600' : 'text-amber-500'}`}>
                  {report.summary.compressionScore >= 80 ? 'Good' : 'Avg'}
                </span>
              </li>
              <li className="flex justify-between items-center p-1 hover:bg-white rounded transition-colors">
                <span className="text-gray-600">구도</span>
                <span className={`font-bold ${report.summary.compositionScore >= 80 ? 'text-green-600' : 'text-amber-500'}`}>
                   {report.summary.compositionScore >= 80 ? 'Good' : 'Weak'}
                </span>
              </li>
              <li className="flex justify-between items-center p-1 hover:bg-white rounded transition-colors">
                <span className="text-gray-600">프레이밍</span>
                <span className={`font-bold ${report.summary.framingScore >= 80 ? 'text-green-600' : 'text-[#BE1818]'}`}>
                   {report.summary.framingScore >= 80 ? 'Good' : 'Bad'}
                </span>
              </li>
           </ul>
        </div>
      </div>
    </div>
  );
};

export default Summary;