import React from 'react';
import { HistoryItem } from '../types';
import { Clock, Calendar, ArrowRight, Trash2 } from 'lucide-react';

interface HistoryViewProps {
    history: HistoryItem[];
    onSelect: (item: HistoryItem) => void;
    onDelete: (id: string) => void;
}

export default function HistoryView({ history, onSelect, onDelete }: HistoryViewProps) {
    if (history.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm mx-auto max-w-2xl mt-10">
                <div className="bg-slate-50 p-6 rounded-full inline-block mb-4">
                    <Clock className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-700">아직 분석 기록이 없습니다</h3>
                <p className="text-slate-500 mt-2">새로운 사진을 분석하면 여기에 자동으로 저장됩니다.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-7 h-7 text-[#BE1818]" />
                    분석 히스토리
                    <span className="bg-slate-100 text-slate-600 text-sm px-2.5 py-0.5 rounded-full font-medium ml-2">
                        {history.length}
                    </span>
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...history].reverse().map((item) => (
                    <div
                        key={item.id}
                        onClick={() => onSelect(item)}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-lg hover:border-[#BE1818]/30 hover:-translate-y-1 transition-all group duration-300"
                    >
                        {/* Image Preview pairs */}
                        <div className="flex h-40 w-full border-b border-slate-100 relative">
                            <div className="w-1/2 relative bg-slate-100">
                                <img src={item.refImageBase64} className="w-full h-full object-cover" alt="Ref" />
                                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded">REF</div>
                            </div>
                            <div className="w-1/2 relative bg-slate-100 border-l border-white/20">
                                <img src={item.userImageBase64} className="w-full h-full object-cover" alt="User" />
                                <div className="absolute top-2 left-2 bg-[#BE1818] text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">USER</div>
                            </div>
                            {/* Delete Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('이 기록을 삭제하시겠습니까?')) {
                                        onDelete(item.id);
                                    }
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                                title="삭제"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="text-sm font-bold text-slate-800 mb-1">
                                        분석 리포트 #{item.id.slice(0, 4)}
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(item.timestamp).toLocaleString('ko-KR', {
                                            month: 'long', day: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-[#BE1818] leading-none">
                                        {item.apiResult.finalScore}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium mt-1">AI 점수</div>
                                </div>
                            </div>

                            <div className="w-full bg-slate-50 rounded-lg p-3 mb-4">
                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                    <span>종횡비</span>
                                    <span className={item.apiResult.summary.aspectRatioScore > 80 ? "text-green-600 font-bold" : "text-slate-500"}>
                                        {item.apiResult.summary.aspectRatioScore}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-600">
                                    <span>구도</span>
                                    <span className={item.apiResult.summary.compositionScore > 80 ? "text-green-600 font-bold" : "text-slate-500"}>
                                        {item.apiResult.summary.compositionScore}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-sm font-bold text-slate-600 group-hover:text-[#BE1818] transition-colors border-t border-slate-100 pt-3">
                                <span>결과 다시보기</span>
                                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
