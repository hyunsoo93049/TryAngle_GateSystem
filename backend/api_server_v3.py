"""
TryAngle V7 FastAPI Server
React 앱과 연동하기 위한 API 서버

실행 방법:
    uvicorn api_server_v3:app --reload --host 0.0.0.0 --port 8000

엔드포인트:
    POST /analyze - 이미지 분석 (React 앱의 types.ts 형식으로 반환)
"""

import os
import sys
import tempfile
import time
from pathlib import Path
from datetime import datetime
from typing import Optional
import socket

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add path for imports
current_dir = Path(__file__).parent
sys.path.append(str(current_dir))

# Import SmartFeedbackV7Gate
try:
    from compare_final_improved_v7_gate import SmartFeedbackV7Gate
except ImportError as e:
    print(f"Error importing SmartFeedbackV7Gate: {e}")
    SmartFeedbackV7Gate = None

app = FastAPI(
    title="TryAngle V7 API",
    description="Photo composition analysis API using Gate System v7",
    version="7.0.0"
)

# CORS - React 앱에서 접근 가능하도록 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발용. 프로덕션에서는 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize analyzer (lazy loading)
analyzer = None

def get_analyzer():
    global analyzer
    if analyzer is None:
        if SmartFeedbackV7Gate is None:
            raise HTTPException(status_code=500, detail="SmartFeedbackV7Gate not available")
        analyzer = SmartFeedbackV7Gate(debug_mode=True)
    return analyzer


# Response Models (matching React app's types.ts)
class AnalysisResponse(BaseModel):
    timestamp: str
    processingTime: float
    finalScore: float
    summary: dict
    overallFeedback: str
    gates: list


def save_temp_file(upload_file: UploadFile) -> str:
    """Save uploaded file to temp directory and return path"""
    suffix = Path(upload_file.filename).suffix if upload_file.filename else ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = upload_file.file.read()
        tmp.write(content)
        return tmp.name


def convert_to_react_format(result: dict) -> dict:
    """
    Convert SmartFeedbackV7Gate output to React app's expected format (types.ts)
    """
    # v7 uses 'gates_results', v6 used 'all_gates'
    all_gates = result.get('gates_results', result.get('all_gates', {}))

    # Build gates array matching React's GateResult interface
    gates = []

    # Gate 0: Aspect Ratio
    aspect = all_gates.get('aspect_ratio', {})
    aspect_fb = aspect.get('feedback') or {}  # v7 returns null when passed

    gates.append({
        "gateId": 0,
        "title": "종횡비 체크",
        "status": "passed" if aspect.get('passed', False) else "warning",
        "score": aspect.get('score', 0),
        "description": "레퍼런스 이미지와 가로세로 비율이 일치하는지 확인합니다.",
        "details": {
            "current": {
                "label": aspect_fb.get('current_name', '일치') if aspect_fb else '일치'
            },
            "reference": {
                "label": aspect_fb.get('target_name', '일치') if aspect_fb else '일치'
            }
        },
        "feedback": [aspect_fb.get('action', '종횡비가 일치합니다')] if aspect_fb else ["종횡비가 일치합니다"]
    })

    # Gate 1: Framing
    framing = all_gates.get('framing', {})
    framing_details = framing.get('details', {})
    margin_analysis = framing_details.get('improved_margin_analysis', {})
    current_margins = margin_analysis.get('current_margins', {})
    ref_margins = margin_analysis.get('reference_margins', {})

    # Get feedback from framing
    framing_fb = framing.get('feedback') or {}
    actions = framing_fb.get('actions', []) if framing_fb else []
    if not actions:
        actions = ["프레이밍 분석 완료"]

    gates.append({
        "gateId": 1,
        "title": "프레이밍 & 여백",
        "status": "passed" if framing.get('passed', False) else "warning",
        "score": round(framing.get('score', 0)),
        "description": "샷 타입, 인물 크기, 여백의 균형을 정밀 분석합니다.",
        "details": {
            "shotType": {
                "current": framing_details.get('shot_type', {}).get('current', {}).get('name_kr', 'Unknown'),
                "reference": framing_details.get('shot_type', {}).get('reference', {}).get('name_kr', 'Unknown'),
                "score": framing_details.get('shot_type', {}).get('score', 0)
            },
            "subjectSize": {
                "current": round(framing_details.get('subject_ratio', {}).get('current_ratio', 0) * 100, 1),
                "reference": round(framing_details.get('subject_ratio', {}).get('reference_ratio', 0) * 100, 1),
                "score": framing_details.get('subject_ratio', {}).get('score', 0),
                "diff": round(abs(framing_details.get('subject_ratio', {}).get('current_ratio', 0) -
                             framing_details.get('subject_ratio', {}).get('reference_ratio', 0)) * 100, 1)
            },
            "margins": {
                "horizontal": {
                    "currentLeft": round(current_margins.get('left', 0) * 100),
                    "currentRight": round(current_margins.get('right', 0) * 100),
                    "refLeft": round(ref_margins.get('left', 0) * 100),
                    "refRight": round(ref_margins.get('right', 0) * 100),
                    "status": margin_analysis.get('horizontal', {}).get('status', 'Unknown'),
                    "score": margin_analysis.get('horizontal', {}).get('score', 0)
                },
                "vertical": {
                    "currentTop": round(current_margins.get('top', 0) * 100),
                    "currentBottom": round(current_margins.get('bottom', 0) * 100),
                    "refTop": round(ref_margins.get('top', 0) * 100),
                    "refBottom": round(ref_margins.get('bottom', 0) * 100),
                    "status": margin_analysis.get('vertical', {}).get('status', 'Unknown'),
                    "score": margin_analysis.get('vertical', {}).get('score', 0),
                    "adjustment": margin_analysis.get('vertical', {}).get('adjustment', {})
                },
                "bottomIssue": margin_analysis.get('bottom_special', {}).get('special_message', '')
            }
        },
        "feedback": actions
    })

    # Gate 2: Composition
    composition = all_gates.get('composition', {})
    comp_feedback = composition.get('feedback') or {}

    # v7 returns grid as list [x, y], convert to string
    current_grid = comp_feedback.get('current_grid', [0, 0]) if comp_feedback else [0, 0]
    target_grid = comp_feedback.get('target_grid', [0, 0]) if comp_feedback else [0, 0]
    current_center = comp_feedback.get('current_center', [0.5, 0.5]) if comp_feedback else [0.5, 0.5]
    target_center = comp_feedback.get('target_center', [0.5, 0.5]) if comp_feedback else [0.5, 0.5]

    gates.append({
        "gateId": 2,
        "title": "구도 & 그리드",
        "status": "passed" if composition.get('passed', False) else "warning",
        "score": round(composition.get('score', 0)),
        "description": "주요 피사체(얼굴 등)의 기하학적 위치를 확인합니다.",
        "details": {
            "facePosition": {
                "current": {"x": current_center[0] if isinstance(current_center, list) else 0.5,
                           "y": current_center[1] if isinstance(current_center, list) else 0.5,
                           "grid": f"({current_grid[0]}, {current_grid[1]})" if isinstance(current_grid, list) else str(current_grid)},
                "reference": {"x": target_center[0] if isinstance(target_center, list) else 0.5,
                             "y": target_center[1] if isinstance(target_center, list) else 0.5,
                             "grid": f"({target_grid[0]}, {target_grid[1]})" if isinstance(target_grid, list) else str(target_grid)}
            }
        },
        "feedback": [f"현재 그리드 {current_grid} → 목표 그리드 {target_grid}"] if comp_feedback and comp_feedback.get('issue') else ["구도가 일치합니다"]
    })

    # Gate 3: Compression
    compression = all_gates.get('compression', {})
    comp_fb = compression.get('feedback') or {}

    gates.append({
        "gateId": 3,
        "title": "압축감 (렌즈)",
        "status": "passed" if compression.get('passed', False) else "warning",
        "score": round(compression.get('score', 0)),
        "description": "초점 거리와 원근감을 추정하여 분석합니다.",
        "details": {
            "current": {
                "val": comp_fb.get('current_compression', 0) if comp_fb else 0,
                "label": comp_fb.get('current_lens', 'Unknown') if comp_fb else "Unknown"
            },
            "reference": {
                "val": comp_fb.get('target_compression', 0) if comp_fb else 0,
                "label": comp_fb.get('target_lens', 'Unknown') if comp_fb else "Unknown"
            }
        },
        "feedback": [line for line in comp_fb.get('adjustment', '압축감 분석 완료').split('\n') if line.strip()] if comp_fb and comp_fb.get('adjustment') else ["압축감이 유사합니다"]
    })

    # Gate 4: Pose
    pose = all_gates.get('pose', {})
    pose_fb = pose.get('feedback') or []  # v7 returns list of suggestions

    # Extract suggestions - v7 format is list of dicts with 'suggestion' key
    suggestions = []
    if isinstance(pose_fb, list):
        suggestions = [item.get('suggestion', '') for item in pose_fb if isinstance(item, dict) and item.get('suggestion')]
    if not suggestions:
        suggestions = ["포즈가 안정적입니다"]

    gates.append({
        "gateId": 4,
        "title": "포즈 디테일",
        "status": "passed" if pose.get('passed', True) else "warning",
        "score": 95,
        "description": "미세한 신체 동작과 자세를 분석합니다.",
        "details": {
            "suggestions": suggestions
        },
        "feedback": suggestions
    })

    # Build summary
    summary = {
        "aspectRatioScore": round(all_gates.get('aspect_ratio', {}).get('score', 0)),
        "framingScore": round(all_gates.get('framing', {}).get('score', 0)),
        "compositionScore": round(all_gates.get('composition', {}).get('score', 0)),
        "compressionScore": round(all_gates.get('compression', {}).get('score', 0))
    }

    return {
        "timestamp": datetime.now().isoformat(),
        "processingTime": 0,  # Will be set by caller
        "finalScore": round(result.get('overall_score', 0)),
        "summary": summary,
        "overallFeedback": result.get('friendly_summary', '분석이 완료되었습니다.'),
        "gates": gates
    }


@app.get("/")
def root():
    return {
        "service": "TryAngle V6 API",
        "version": "6.0.0",
        "status": "running",
        "endpoints": {
            "/analyze": "POST - Analyze two images",
            "/health": "GET - Health check"
        }
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "analyzer_ready": SmartFeedbackV7Gate is not None}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_images(
    reference: UploadFile = File(..., description="Reference image"),
    current: UploadFile = File(..., description="Current image to analyze")
):
    """
    Analyze two images using SmartFeedbackV7Gate Gate System.
    Returns analysis in React app compatible format.
    Server mode: stop_on_fail=False (analyze all gates)
    """
    start_time = time.time()

    # Save uploaded files
    ref_path = save_temp_file(reference)
    curr_path = save_temp_file(current)

    try:
        # Run analysis (stop_on_fail=False for server mode - analyze all gates)
        analyzer = get_analyzer()
        result = analyzer.analyze_with_gates(curr_path, ref_path, stop_on_fail=False)
        
        # Convert to React format
        response = convert_to_react_format(result)
        response["processingTime"] = round(time.time() - start_time, 2)
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Cleanup temp files
        try:
            os.unlink(ref_path)
            os.unlink(curr_path)
        except:
            pass


# ==========================================
# Mobile Support
# ==========================================
@app.get("/network-info")
async def get_network_info():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return {"ip": IP}

@app.post("/upload-mobile")
async def upload_mobile(
    reference: UploadFile = File(...),
    user: UploadFile = File(...)
):
    try:
        # User specified path
        save_dir = Path(r"C:\try_angle\data\sample_images")
        save_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = int(time.time())
        # Clean filenames to avoid issues
        ref_safe = Path(reference.filename).name
        user_safe = Path(user.filename).name
        
        ref_name = f"mobile_ref_{timestamp}_{ref_safe}"
        user_name = f"mobile_user_{timestamp}_{user_safe}"
        
        ref_path = save_dir / ref_name
        user_path = save_dir / user_name
        
        with open(ref_path, "wb") as f:
            content = await reference.read()
            f.write(content)
            
        with open(user_path, "wb") as f:
            content = await user.read()
            f.write(content)

        print(f"Mobile Upload Success: {ref_path}, {user_path}")
        return {
            "status": "success", 
            "message": "파일 업로드 완료",
            "files": {
                "reference": str(ref_path),
                "user": str(user_path)
            }
        }
    except Exception as e:
        print(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    print("Starting TryAngle V7 API Server...")
    print("Docs: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
