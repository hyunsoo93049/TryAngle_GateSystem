import React, { useState, useEffect } from 'react';
import { Upload, Camera, Image as ImageIcon, BarChart2, AlertCircle, Sparkles, Cpu, Layers, History as HistoryIcon, LayoutDashboard } from 'lucide-react';
import OpenAI from "openai";
import { AnalysisReport, HistoryItem } from './types';
import { MOCK_ANALYSIS_RESULT } from './constants';
import GateCard from './components/GateCard';
import Summary from './components/Summary';
import AnalyzingOverlay from './components/AnalyzingOverlay';
import HistoryView from './components/HistoryView';
import MobileUploadView from './MobileUploadView';

// API Keys from environment variables (set in .env.local)
// VITE_GITHUB_TOKEN_1, VITE_GITHUB_TOKEN_2, VITE_GITHUB_TOKEN_3
const API_KEYS = [
  import.meta.env.VITE_GITHUB_TOKEN_1 || "",
  import.meta.env.VITE_GITHUB_TOKEN_2 || "",
  import.meta.env.VITE_GITHUB_TOKEN_3 || ""
].filter(key => key && key.length > 0);

// Key Rotation Helper
let currentKeyIndex = 0;
const getClient = () => {
  const key = API_KEYS[currentKeyIndex];
  console.log(`Using API Key Index: ${currentKeyIndex}`);
  return new OpenAI({
    baseURL: "https://models.inference.ai.azure.com",
    apiKey: key,
    dangerouslyAllowBrowser: true
  });
};

// Retry Wrap Function
const callGptWithRetry = async (messages: any[], retryCount = 0): Promise<any> => {
  try {
    const client = getClient();
    return await client.chat.completions.create({
      messages,
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0.7,
      top_p: 1.0,
      max_tokens: 4000
    });
  } catch (err: any) {
    console.warn(`API Error with Key ${currentKeyIndex}:`, err);

    // 429: Too Many Requests, 401/403: Auth Error
    if ((err.status === 429 || err.status === 401 || err.status === 403) && retryCount < API_KEYS.length) {
      console.warn(`Switching to next API key...`);
      currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
      return callGptWithRetry(messages, retryCount + 1);
    }
    throw err; // Re-throw if not recoverable or retries exhausted
  }
};

export default function App() {
  const [refImage, setRefImage] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string | null>(null);

  // To send to API, we need the File objects or base64 data
  const [refFile, setRefFile] = useState<File | null>(null);
  const [userFile, setUserFile] = useState<File | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnimDone, setIsAnimDone] = useState(false);

  // Data States
  const [apiResult, setApiResult] = useState<AnalysisReport | null>(null);
  const [algoResult, setAlgoResult] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [showResults, setShowResults] = useState(false);
  const [view, setView] = useState<'dashboard' | 'history'>('dashboard');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Mobile Support
  const [isMobileMode, setIsMobileMode] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);

  useEffect(() => {
    if (window.location.pathname === '/mobile') {
      setIsMobileMode(true);
    }
  }, []);


  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tryangle_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (item: HistoryItem) => {
    const newHistory = [...history, item];
    // Limit to 20 items to prevent localStorage overflow
    if (newHistory.length > 20) newHistory.shift();

    setHistory(newHistory);
    localStorage.setItem('tryangle_history', JSON.stringify(newHistory));
  };

  // Delete individual history item
  const deleteHistoryItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('tryangle_history', JSON.stringify(newHistory));
  };

  // Synchronization effect
  useEffect(() => {
    if (apiResult && algoResult && isAnimDone) {
      setShowResults(true);
      setIsAnalyzing(false);
      setIsAnimDone(false);

      // Save to History (only if new analysis)
      // Check if we already saved this specific timestamp recently to avoid duplicates
      // But actually runAnalysis is only called on button click, so it's fresh.
      // We need the base64 strings which are local vars in runAnalysis.
      // So we'll save to history INSIDE runAnalysis instead.
    }
  }, [apiResult, algoResult, isAnimDone]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'ref' | 'user') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (type === 'ref') {
        setRefImage(url);
        setRefFile(file);
      } else {
        setUserImage(url);
        setUserFile(file);
      }
      setShowResults(false);
      setApiResult(null);
      setAlgoResult(null);
      setError(null);

      // Allow re-uploading the same file
      e.target.value = '';
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };



  const fetchAlgorithmResult = async (refFile: File, userFile: File): Promise<AnalysisReport> => {
    const formData = new FormData();
    formData.append('reference', refFile);
    formData.append('current', userFile);

    try {
      console.log("Calling Python Algorithm Server...");
      // Use relative path for proxy support (Tunneling/Remote)
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Algorithm Server Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Algorithm Result:", data);
      return data as AnalysisReport;
    } catch (error) {
      console.error("Algorithm Analysis Failed:", error);
      // Fallback to Mock with error indication if needed, 
      // but better to throw so UI knows it failed.
      // However, to prevent blocking the AI result, we might return a Mock with error flag?
      // For now, let's return MOCK but log heavily, so user sees it "worked" but knows it's fake if server down.
      // Actually, user wants to know if it's hardcoded.
      // So I will return MOCK but modify summary to say "Connection Failed".
      console.warn("Falling back to MOCK for Algorithm due to connection failure.");
      return {
        ...MOCK_ANALYSIS_RESULT,
        overallFeedback: "⚠️ Python 서버 연결 실패 (Mock 데이터 표시 중). `uvicorn api_server_v3:app --reload` 를 실행해주세요."
      };
    }
  };

  const handleNavClick = (viewName: 'dashboard' | 'history') => {
    setView(viewName);
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setRefImage(item.refImageBase64);
    setUserImage(item.userImageBase64);
    setApiResult(item.apiResult);
    setAlgoResult(item.algoResult);
    setShowResults(true);
    setView('dashboard');
    // We don't set files because we only have base64, but that's enough for display
    // If user wants to re-analyze, they might need to re-upload, but current flow allows viewing results.
  };

  const runAnalysis = async () => {
    if (!refFile || !userFile) return;

    setIsAnalyzing(true);
    setShowResults(false);
    setApiResult(null);
    setAlgoResult(null);
    setIsAnimDone(false);
    setError(null);

    try {
      // 1. Prepare Data
      const refBase64 = await fileToBase64(refFile);
      const userBase64 = await fileToBase64(userFile);

      // 2. Run Analyses in Parallel
      console.log("Starting Parallel Analysis...");

      // Task A: GitHub Models (GPT-4o) with Retry
      const apiPromise = callGptWithRetry([
        {
          role: "system",
          content: `You are "Try Angle AI", a professional photography coach using the "Gate System v6".
            RETURN ONLY JSON matching result.json schema. Do not output markdown blocks.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Compare the [User Image] (My Attempt) against the [Reference Image] (Target).
                Perform a strict technical analysis through these 5 Gates.
                
                output structure (JSON):
                {
                  "timestamp": "ISO date string",
                  "processingTime": number,
                  "finalScore": number,
                  "summary": {
                    "aspectRatioScore": integer (0-100),
                    "framingScore": integer (0-100),
                    "compositionScore": integer (0-100),
                    "compressionScore": integer (0-100)
                  },
                  "overallFeedback": "string (Korean summary)",
                  "gates": [
                    {
                      "gateId": 0,
                      "title": "종횡비 체크",
                      "status": "passed" | "warning" | "failed",
                      "score": integer (0-100),
                      "description": "string",
                      "details": {
                        "current": { "width": number, "height": number, "ratio": number, "label": "string" },
                        "reference": { "width": number, "height": number, "ratio": number, "label": "string" }
                      },
                      "feedback": ["string"]
                    },
                    {
                      "gateId": 1,
                      "title": "프레이밍 & 여백",
                      "status": "passed" | "warning" | "failed",
                      "score": integer (0-100),
                      "description": "string",
                      "details": {
                        "shotType": { "current": "string", "reference": "string", "score": number },
                        "subjectSize": { "current": number (percentage 0-100), "reference": number (percentage 0-100), "score": integer (0-100), "diff": number },
                        "margins": {
                          "horizontal": { 
                            "currentLeft": number, "currentRight": number, 
                            "refLeft": number, "refRight": number,
                            "status": "string", "score": number
                          },
                          "vertical": { 
                            "currentTop": number, "currentBottom": number,
                            "refTop": number, "refBottom": number,
                            "status": "string", "score": number
                          },
                          "bottomIssue": "string"
                        }
                      },
                      "feedback": ["string"]
                    },
                    {
                      "gateId": 2,
                      "title": "구도 & 그리드",
                      "status": "passed" | "warning" | "failed",
                      "score": integer (0-100),
                      "description": "string",
                      "details": {
                        "facePosition": { 
                          "current": { "x": number, "y": number }, 
                          "reference": { "x": number, "y": number },
                          "score": integer (0-100) 
                        }
                      },
                      "feedback": ["string"]
                    },
                    {
                      "gateId": 3,
                      "title": "압축감 (렌즈)",
                      "status": "passed" | "warning" | "failed",
                      "score": number,
                      "description": "string",
                      "details": {
                        "current": { "val": number (0.0-1.0 normalized, 0=wide 1=tele), "label": "Wide|Standard|Moderate|Strong|Tele" },
                        "reference": { "val": number (0.0-1.0 normalized), "label": "Wide|Standard|Moderate|Strong|Tele" }
                      },
                      "feedback": ["string"]
                    },
                    {
                      "gateId": 4,
                      "title": "포즈 디테일",
                      "status": "passed" | "warning" | "failed",
                      "score": number,
                      "description": "string",
                      "details": { "shoulderTilt": number },
                      "feedback": ["string"]
                    }
                  ]
                }`
            },
            {
              type: "image_url",
              image_url: { url: refBase64 }
            },
            {
              type: "image_url",
              image_url: { url: userBase64 }
            }
          ]
        }
      ]);

      // Task B: Algorithm (Python Server)
      const algoPromise = fetchAlgorithmResult(refFile, userFile);

      // Wait for both
      const [apiResponse, algoResponse] = await Promise.all([apiPromise, algoPromise]);

      // Helper for rounding to 1 decimal place
      const toOneDecimal = (num: number) => Math.round(num * 10) / 10;

      const processReport = (report: AnalysisReport, isGptApi: boolean = false) => {
        report.finalScore = toOneDecimal(report.finalScore);
        report.gates = report.gates.map(g => {
          const processed = { ...g, score: toOneDecimal(g.score) };

          // GPT API compression values: normalize 0~100 → 0~1
          if (isGptApi && g.gateId === 3 && g.details) {
            if (g.details.current?.val > 1) {
              processed.details = {
                ...g.details,
                current: { ...g.details.current, val: g.details.current.val / 100 },
                reference: { ...g.details.reference, val: (g.details.reference?.val || 0) / 100 }
              };
            }
          }
          return processed;
        });
        if (report.summary) {
          report.summary.aspectRatioScore = toOneDecimal(report.summary.aspectRatioScore);
          report.summary.framingScore = toOneDecimal(report.summary.framingScore);
          report.summary.compositionScore = toOneDecimal(report.summary.compositionScore);
          report.summary.compressionScore = toOneDecimal(report.summary.compressionScore);
        }
        return report;
      };

      // Process API Result
      const jsonText = apiResponse.choices[0]?.message?.content || "";
      console.log("GitHub Models Response:", jsonText);
      const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
      let jsonData = JSON.parse(cleanJson) as AnalysisReport;

      // Enforce 1 Decimal + GPT API compression normalization
      jsonData = processReport(jsonData, true);  // isGptApi = true
      setApiResult(jsonData);

      // Process Algo Result (no GPT normalization needed)
      const cleanAlgo = processReport(algoResponse, false);
      setAlgoResult(cleanAlgo);

      // 5. SAVE TO HISTORY
      saveToHistory({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        refImageBase64: refBase64,
        userImageBase64: userBase64,
        apiResult: jsonData,
        algoResult: cleanAlgo
      });

    } catch (err: any) {
      console.error("Analysis Failed", err);
      setError("오류: " + (err.message || "알 수 없는 오류"));
      setIsAnalyzing(false);
    }
  };

  if (isMobileMode) {
    return <MobileUploadView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#BE1818] p-2 rounded-lg">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Try Angle <span className="text-xs align-top bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium">v6.0</span></h1>
          </div>
          <nav className="flex gap-1 text-sm font-medium text-slate-600 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`px-4 py-1.5 rounded-md flex items-center gap-2 transition-all ${view === 'dashboard' ? 'bg-white text-[#BE1818] shadow-sm font-bold' : 'hover:text-[#BE1818]'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              대시보드
            </button>
            <button
              onClick={() => handleNavClick('history')}
              className={`px-4 py-1.5 rounded-md flex items-center gap-2 transition-all ${view === 'history' ? 'bg-white text-[#BE1818] shadow-sm font-bold' : 'hover:text-[#BE1818]'}`}
            >
              <HistoryIcon className="w-4 h-4" />
              히스토리
            </button>
            <button
              onClick={() => setShowMobileModal(true)}
              className="px-4 py-1.5 rounded-md flex items-center gap-2 hover:text-[#BE1818] transition-colors"
            >
              <Upload className="w-4 h-4" />
              모바일 업로드
            </button>
          </nav>
        </div>
      </header>

      <main className={`mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative transition-all duration-500 ${showResults && view === 'dashboard' ? 'max-w-[1920px]' : 'max-w-5xl'}`}>

        {/* Mobile Instruction Modal */}
        {showMobileModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowMobileModal(false)}>
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">모바일 업로드 (QR 코드)</h3>
              <div className="flex flex-col items-center gap-6">
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://tamisha-unaugmentative-jonna.ngrok-free.dev/mobile`}
                    alt="Mobile Upload QR"
                    className="w-48 h-48"
                  />
                </div>

                <div className="text-center space-y-2 text-sm text-slate-700 bg-slate-50 p-4 rounded-lg w-full">
                  <p className="text-lg font-bold text-slate-900">
                    <span className="text-green-600">필독</span>: 접속 가이드
                  </p>
                  <ol className="text-left list-decimal list-inside space-y-1 mt-2">
                    <li>QR 코드를 스캔하여 접속하세요.</li>
                    <li>화면에 경고창이 뜨면 <span className="font-bold underline">Visit Site</span> 버튼을 눌러주세요.</li>
                    <li><span className="font-bold">레퍼런스 이미지</span>와 <span className="font-bold">테스트할 이미지</span>를<br />차례대로 업로드 해주세요.</li>
                  </ol>
                </div>

                <div className="w-full text-xs text-slate-400 text-center">
                  URL: https://tamisha-unaugmentative-jonna.ngrok-free.dev/mobile
                </div>
              </div>
              <button onClick={() => setShowMobileModal(false)} className="mt-6 w-full py-3 bg-slate-900 text-white rounded-lg font-bold">
                닫기
              </button>
            </div>
          </div>
        )}

        {/* History View */}
        {view === 'history' && (
          <HistoryView history={history} onSelect={handleHistorySelect} onDelete={deleteHistoryItem} />
        )}

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <>
            {/* Intro */}
            {!showResults && !isAnalyzing && (

              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl mb-3">TryAngle AI 이미지 분석</h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  원하는 레퍼런스 이미지와 내 사진을 업로드 해주세요. TryAngle의 AI가 레퍼런스와의 유사도를 분석합니다.
                </p>
              </div>
            )}

            {/* Upload Section */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 transition-all duration-500 ${showResults ? 'hidden' : ''}`}>

              {/* Reference Uploader */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> 레퍼런스 이미지
                </label>
                <div className={`relative aspect-[3/4] bg-white border-2 border-dashed ${refImage ? 'border-[#BE1818]' : 'border-slate-300'} rounded-2xl overflow-hidden flex items-center justify-center transition-all hover:border-[#BE1818]/70 group`}>
                  {refImage ? (
                    <img src={refImage} alt="Reference" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-6">
                      <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2 group-hover:text-[#BE1818] transition-colors" />
                      <p className="text-sm text-slate-500">클릭하거나 드래그하여 레퍼런스 업로드</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'ref')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* User Uploader */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Camera className="w-4 h-4" /> 나의 촬영물
                </label>
                <div className={`relative aspect-[3/4] bg-white border-2 border-dashed ${userImage ? 'border-[#BE1818]' : 'border-slate-300'} rounded-2xl overflow-hidden flex items-center justify-center transition-all hover:border-[#BE1818]/70 group`}>
                  {userImage ? (
                    <img src={userImage} alt="User Shot" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-6">
                      <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2 group-hover:text-[#BE1818] transition-colors" />
                      <p className="text-sm text-slate-500">클릭하거나 드래그하여 촬영물 업로드</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'user')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="max-w-xl mx-auto mb-8 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Action Button */}
            {!showResults && !isAnalyzing && (
              <div className="flex justify-center mb-16">
                <button
                  onClick={runAnalysis}
                  disabled={!refImage || !userImage}
                  className={`flex items-center gap-2 px-8 py-4 rounded-full text-lg font-bold shadow-xl transition-all transform hover:-translate-y-1 ${!refImage || !userImage ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#BE1818] text-white hover:bg-[#991313]'}`}
                >
                  <BarChart2 className="w-5 h-5" />
                  비교 분석 시작 (AI v6)
                </button>
              </div>
            )}

            {/* NEW ANALYZING OVERLAY */}
            {isAnalyzing && userImage && (
              <AnalyzingOverlay
                imageUrl={userImage}
                onComplete={() => setIsAnimDone(true)}
                onCancel={() => setIsAnalyzing(false)}
              />
            )}

            {/* Results View - Row by Row for alignment */}
            {showResults && apiResult && algoResult && (
              <div className="animate-fadeIn">

                {/* STICKY IMAGE COMPARE HEADER */}
                <div className="sticky top-16 z-30 bg-slate-50/95 backdrop-blur-md border-b border-slate-200 py-4 mb-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 shadow-sm transition-all">
                  <div className="max-w-4xl mx-auto flex justify-center gap-4 sm:gap-8 h-48 sm:h-56">
                    {/* Reference Image */}
                    <div className="relative h-full aspect-[3/4] bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden group">
                      <div className="absolute top-2 left-2 z-10 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                        REFERENCE
                      </div>
                      {refImage && <img src={refImage} alt="Reference" className="w-full h-full object-cover" />}
                    </div>

                    {/* User Image */}
                    <div className="relative h-full aspect-[3/4] bg-white rounded-lg shadow-md border-2 border-[#BE1818] overflow-hidden group">
                      <div className="absolute top-2 left-2 z-10 bg-[#BE1818] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                        MY SHOT
                      </div>
                      {userImage && <img src={userImage} alt="User" className="w-full h-full object-cover" />}
                    </div>
                  </div>
                </div>

                {/* Main Title */}
                <div className="text-center mb-10">
                  <h3 className="text-2xl font-bold text-slate-800">분석 결과 비교</h3>
                  <p className="text-slate-500">AI 분석 (GPT-4o)과 자체 알고리즘(V6)의 분석 결과를 비교합니다.</p>
                </div>

                {/* 1. HEADER ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                  {/* Left Header */}
                  <div className="flex items-center justify-center gap-2">
                    <div className="p-2 bg-slate-900 rounded-lg text-white shadow-lg shadow-slate-900/20">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">GPT-4o Analysis</h2>
                  </div>
                  {/* Right Header */}
                  <div className="flex items-center justify-center gap-2">
                    <div className="p-2 bg-[#BE1818] rounded-lg text-white shadow-lg shadow-red-900/20">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Algorithm (V6) Analysis</h2>
                  </div>
                </div>

                {/* 2. SUMMARY ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 items-start">
                  <Summary report={apiResult} />
                  <Summary report={algoResult} />
                </div>

                {/* 3. DETAILED DIAGNOSIS HEADERS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6 border-b border-slate-200 pb-4">
                  <div className="px-1">
                    <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      상세 진단 (AI)
                    </h3>
                  </div>
                  <div className="px-1">
                    <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#BE1818]" />
                      상세 진단 (Algorithm)
                    </h3>
                  </div>
                </div>

                {/* 4. GATES ROWS (Aligned Pairs) */}
                <div className="space-y-8">
                  {apiResult.gates.map((apiGate, idx) => {
                    const algoGate = algoResult.gates[idx];
                    return (
                      <div key={apiGate.gateId} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <GateCard
                          gate={apiGate}
                          isOpen={apiGate.status !== 'passed'}
                        />
                        <GateCard
                          gate={algoGate}
                          isOpen={algoGate.status !== 'passed'}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-16 text-center pb-10">
                  <button
                    onClick={() => {
                      setShowResults(false);
                      setUserImage(null);
                      setUserFile(null);
                      setApiResult(null);
                      setAlgoResult(null);
                    }}
                    className="text-[#BE1818] font-medium hover:text-[#991313] border border-[#BE1818]/30 px-8 py-3 rounded-full hover:bg-red-50 transition-colors text-lg"
                  >
                    다른 사진 분석하기
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}