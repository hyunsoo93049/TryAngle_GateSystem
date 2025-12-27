import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, ArrowUp } from 'lucide-react';

export default function MobileUploadView() {
    const [refFile, setRefFile] = useState<File | null>(null);
    const [userFile, setUserFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [msg, setMsg] = useState('');

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>, type: 'ref' | 'user') => {
        if (e.target.files?.[0]) {
            if (type === 'ref') setRefFile(e.target.files[0]);
            else setUserFile(e.target.files[0]);
        }
    };

    const upload = async () => {
        if (!refFile || !userFile) {
            alert("두 이미지를 모두 선택해주세요.");
            return;
        }

        setIsUploading(true);
        setStatus('idle');
        setMsg('');

        const formData = new FormData();
        formData.append('reference', refFile);
        formData.append('user', userFile);

        try {
            const res = await fetch('/api/upload-mobile', {
                method: 'POST',
                body: formData,
                headers: {
                    'ngrok-skip-browser-warning': '69420'
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Upload Failed");

            setStatus('success');
            setMsg("업로드 완료! PC에서 확인할 수 있습니다.");
            setRefFile(null);
            setUserFile(null);
        } catch (err: any) {
            setStatus('error');
            setMsg("업로드 실패: " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">TryAngle 모바일 업로드</h1>
                    <p className="text-slate-400">PC로 전송할 사진을 선택하세요</p>
                </div>

                {/* Reference Input */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">레퍼런스 이미지</label>
                    <div className={`border-2 border-dashed p-4 rounded-xl flex items-center justify-center relative ${refFile ? 'border-green-500 bg-green-500/10' : 'border-slate-600 bg-slate-800'}`}>
                        <input type="file" accept="image/*" onChange={e => handleFile(e, 'ref')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        {refFile ? (
                            <div className="text-green-400 flex items-center gap-2"><CheckCircle size={20} /> {refFile.name}</div>
                        ) : (
                            <div className="text-slate-400 flex flex-col items-center"><Upload className="mb-1" /> 선택하기</div>
                        )}
                    </div>
                </div>

                {/* User Input */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">내 촬영물 (User)</label>
                    <div className={`border-2 border-dashed p-4 rounded-xl flex items-center justify-center relative ${userFile ? 'border-green-500 bg-green-500/10' : 'border-slate-600 bg-slate-800'}`}>
                        <input type="file" accept="image/*" onChange={e => handleFile(e, 'user')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        {userFile ? (
                            <div className="text-green-400 flex items-center gap-2"><CheckCircle size={20} /> {userFile.name}</div>
                        ) : (
                            <div className="text-slate-400 flex flex-col items-center"><Upload className="mb-1" /> 선택하기</div>
                        )}
                    </div>
                </div>

                {/* Submit */}
                <button
                    onClick={upload}
                    disabled={isUploading || !refFile || !userFile}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${isUploading || !refFile || !userFile ? 'bg-slate-700 text-slate-500' : 'bg-[#BE1818] hover:bg-red-700 text-white shadow-lg'}`}
                >
                    {isUploading ? "전송 중..." : <><ArrowUp /> 서버로 전송</>}
                </button>

                {/* Status */}
                {status === 'success' && (
                    <div className="p-4 bg-green-500/20 text-green-400 rounded-xl flex items-center gap-3 animate-fadeIn">
                        <CheckCircle /> {msg}
                    </div>
                )}
                {status === 'error' && (
                    <div className="p-4 bg-red-500/20 text-red-400 rounded-xl flex items-center gap-3 animate-fadeIn">
                        <XCircle /> {msg}
                    </div>
                )}
            </div>
        </div>
    );
}
