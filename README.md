# TryAngle: Gate System for Photo Composition Analysis

**Language / 언어:** [English](#english) | [한국어](#한국어)

---

# English

A real-time photo composition analysis system that compares user photos against reference images using a multi-gate evaluation pipeline.

## Overview

TryAngle Gate System analyzes portrait photographs through 5 sequential gates:

| Gate | Analysis | Description |
|------|----------|-------------|
| Gate 0 | Aspect Ratio | Compares image dimensions and orientation |
| Gate 1 | Framing & Margins | Evaluates shot type, subject size, and margin balance |
| Gate 2 | Composition & Grid | Analyzes subject positioning using rule-of-thirds |
| Gate 3 | Compression (Lens) | Estimates focal length characteristics via depth analysis |
| Gate 4 | Pose Details | Detects body posture and alignment |

## Architecture

```
Frontend (React + Vite)     Backend (FastAPI)
        |                          |
        |   POST /api/analyze      |
        | -----------------------> |
        |                          |
        |                   SmartFeedbackV6
        |                          |
        |                   GroundingDINO
        |                   (Person Detection)
        |                          |
        |                     person_bbox
        |                          |
        |              +-----------+-----------+
        |              |           |           |
        |         RTMPose    MarginAnalyzer  DepthAnything
        |        (133 kpts)  (Framing/Margins) (Compression)
        |              |           |           |
        |              +-----------+-----------+
        |                          |
        | <----------------------- |
        |      Analysis Result     |
```

## Requirements

- Python 3.10+
- Node.js 18+
- CUDA-compatible GPU (recommended)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/hyunsoo93049/TryAngle_GateSystem.git
cd TryAngle_GateSystem
```

### 2. Backend Setup

```bash
# Create conda environment
conda create -n tryangle python=3.10 -y
conda activate tryangle

# Install PyTorch (CUDA 11.8)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. API Key Configuration

This project uses GPT-4o for generating natural language feedback. You need to obtain an OpenAI API key.

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in to your account
3. Navigate to "API Keys" and create a new secret key
4. Open `frontend/index.tsx` and replace the placeholder with your API key:

```typescript
// frontend/index.tsx (around line 14)
const OPENAI_API_KEY = "your-api-key-here";
```

**Note:** Keep your API key private. Do not commit it to public repositories.

## Usage

### Quick Start (Windows)

Double-click `run_server.bat` to start all services.

### Manual Start

**Terminal 1 - Backend:**
```bash
conda activate tryangle
cd backend
python -m uvicorn api_server_v3:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Ngrok Setup (Optional)

Ngrok is only required if you need external access (e.g., testing on mobile devices). For local development, you can skip this step.

1. Download ngrok from [ngrok.com](https://ngrok.com/download)
2. Sign up and get your authtoken from [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)
3. Configure ngrok:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```
4. Run ngrok:
```bash
ngrok http 3000
```

The public URL will be displayed in the ngrok terminal.

## Project Structure

```
TryAngle_GateSystem/
├── backend/
│   ├── api_server_v3.py              # FastAPI server
│   ├── compare_final_improved_v6.py  # Main analysis logic (SmartFeedbackV6)
│   ├── rtmpose_wholebody_analyzer.py # Pose estimation (133 keypoints)
│   ├── framing_analyzer.py           # Shot type & framing analysis
│   ├── improved_margin_analyzer.py   # Margin balance analysis
│   ├── feedback_config.py            # Feedback language settings
│   ├── models/
│   │   ├── grounding_dino.py         # Object detection wrapper
│   │   ├── depth_anything.py         # Depth estimation wrapper
│   │   └── rtmpose.py                # Pose estimation wrapper
│   └── legacy/
│       └── reference_comparison.py   # Compression index calculation
├── frontend/
│   ├── index.tsx                     # Main React component
│   ├── components/
│   │   ├── GateCard.tsx              # Gate result display
│   │   ├── Summary.tsx               # Score summary
│   │   ├── AnalyzingOverlay.tsx      # Loading animation
│   │   └── HistoryView.tsx           # Analysis history view
│   ├── types.ts                      # TypeScript interfaces
│   └── vite.config.ts                # Vite configuration
├── requirements.txt
├── run_server.bat                    # Windows launcher
└── README.md
```

## API Reference

### POST /analyze

Analyzes two images and returns gate-by-gate comparison results.

**Request:**
- `reference`: Reference image file (multipart/form-data)
- `current`: User image file (multipart/form-data)

**Response:**
```json
{
  "timestamp": "2024-01-01T00:00:00",
  "processingTime": 2.5,
  "finalScore": 85.5,
  "summary": {
    "aspectRatioScore": 100,
    "framingScore": 78,
    "compositionScore": 90,
    "compressionScore": 85
  },
  "overallFeedback": "Good composition with minor adjustments needed.",
  "gates": [...]
}
```

## Models Used

| Model | Purpose | Source |
|-------|---------|--------|
| RTMPose-Wholebody | 133-keypoint pose estimation | [rtmlib](https://github.com/Tau-J/rtmlib) |
| Grounding DINO | Object detection | [GroundingDINO](https://github.com/IDEA-Research/GroundingDINO) |
| Depth Anything V2 | Monocular depth estimation | [Depth-Anything](https://github.com/LiheYoung/Depth-Anything) |

## License

This project is for research and educational purposes.

## Citation

If you use this code in your research, please cite:

```bibtex
@misc{tryangle2024,
  author = {TryAngle Team},
  title = {TryAngle: Gate System for Photo Composition Analysis},
  year = {2024},
  publisher = {GitHub},
  url = {https://github.com/hyunsoo93049/TryAngle_GateSystem}
}
```

---

# 한국어

레퍼런스 이미지와 사용자 사진을 비교하여 실시간으로 구도를 분석하는 멀티 게이트 평가 시스템입니다.

## 개요

TryAngle Gate System은 인물 사진을 5개의 순차적 게이트를 통해 분석합니다:

| 게이트 | 분석 항목 | 설명 |
|--------|----------|------|
| Gate 0 | 종횡비 | 이미지 비율 및 방향 비교 |
| Gate 1 | 프레이밍 & 여백 | 샷 타입, 인물 크기, 여백 균형 평가 |
| Gate 2 | 구도 & 그리드 | 삼분할 법칙 기반 피사체 위치 분석 |
| Gate 3 | 압축감 (렌즈) | 깊이 분석을 통한 초점거리 특성 추정 |
| Gate 4 | 포즈 디테일 | 신체 자세 및 정렬 감지 |

## 아키텍처

```
프론트엔드 (React + Vite)     백엔드 (FastAPI)
        |                          |
        |   POST /api/analyze      |
        | -----------------------> |
        |                          |
        |                   SmartFeedbackV6
        |                          |
        |                   GroundingDINO
        |                   (인물 검출)
        |                          |
        |                     person_bbox
        |                          |
        |              +-----------+-----------+
        |              |           |           |
        |         RTMPose    MarginAnalyzer  DepthAnything
        |       (133 키포인트)  (여백 분석)    (압축감)
        |              |           |           |
        |              +-----------+-----------+
        |                          |
        | <----------------------- |
        |        분석 결과          |
```

## 요구사항

- Python 3.10 이상
- Node.js 18 이상
- CUDA 호환 GPU (권장)

## 설치 방법

### 1. 레포지토리 클론

```bash
git clone https://github.com/hyunsoo93049/TryAngle_GateSystem.git
cd TryAngle_GateSystem
```

### 2. 백엔드 설정

```bash
# Conda 환경 생성
conda create -n tryangle python=3.10 -y
conda activate tryangle

# PyTorch 설치 (CUDA 11.8)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# 의존성 설치
pip install -r requirements.txt
```

### 3. 프론트엔드 설정

```bash
cd frontend
npm install
```

### 4. API 키 설정

이 프로젝트는 자연어 피드백 생성을 위해 GPT-4o를 사용합니다. OpenAI API 키가 필요합니다.

1. [OpenAI Platform](https://platform.openai.com/api-keys)에 접속합니다
2. 계정에 가입하거나 로그인합니다
3. "API Keys" 메뉴에서 새로운 시크릿 키를 생성합니다
4. `frontend/index.tsx` 파일을 열어 플레이스홀더를 발급받은 API 키로 교체합니다:

```typescript
// frontend/index.tsx (약 14번째 줄)
const OPENAI_API_KEY = "your-api-key-here";
```

**주의:** API 키는 외부에 노출되지 않도록 주의하세요. 공개 레포지토리에 커밋하지 마세요.

## 사용 방법

### 빠른 시작 (Windows)

`run_server.bat` 파일을 더블클릭하면 모든 서비스가 시작됩니다.

### 수동 시작

**터미널 1 - 백엔드:**
```bash
conda activate tryangle
cd backend
python -m uvicorn api_server_v3:app --reload --host 0.0.0.0 --port 8000
```

**터미널 2 - 프론트엔드:**
```bash
cd frontend
npm run dev
```

### 접속 주소

- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:8000
- API 문서: http://localhost:8000/docs

### Ngrok 설정 (선택사항)

Ngrok은 외부 접속이 필요한 경우에만 사용합니다 (예: 모바일 기기에서 테스트). 로컬 개발 시에는 이 단계를 건너뛰어도 됩니다.

1. [ngrok.com](https://ngrok.com/download)에서 ngrok을 다운로드합니다
2. 회원가입 후 [ngrok 대시보드](https://dashboard.ngrok.com/get-started/your-authtoken)에서 authtoken을 발급받습니다
3. ngrok을 설정합니다:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```
4. ngrok을 실행합니다:
```bash
ngrok http 3000
```

공개 URL은 ngrok 터미널에 표시됩니다.

## 프로젝트 구조

```
TryAngle_GateSystem/
├── backend/
│   ├── api_server_v3.py              # FastAPI 서버
│   ├── compare_final_improved_v6.py  # 메인 분석 로직 (SmartFeedbackV6)
│   ├── rtmpose_wholebody_analyzer.py # 포즈 추정 (133개 키포인트)
│   ├── framing_analyzer.py           # 샷 타입 & 프레이밍 분석
│   ├── improved_margin_analyzer.py   # 여백 균형 분석
│   ├── feedback_config.py            # 피드백 언어 설정
│   ├── models/
│   │   ├── grounding_dino.py         # 객체 검출 래퍼
│   │   ├── depth_anything.py         # 깊이 추정 래퍼
│   │   └── rtmpose.py                # 포즈 추정 래퍼
│   └── legacy/
│       └── reference_comparison.py   # 압축감 지수 계산
├── frontend/
│   ├── index.tsx                     # 메인 React 컴포넌트
│   ├── components/
│   │   ├── GateCard.tsx              # 게이트 결과 표시
│   │   ├── Summary.tsx               # 점수 요약
│   │   ├── AnalyzingOverlay.tsx      # 로딩 애니메이션
│   │   └── HistoryView.tsx           # 분석 히스토리 뷰
│   ├── types.ts                      # TypeScript 인터페이스
│   └── vite.config.ts                # Vite 설정
├── requirements.txt
├── run_server.bat                    # Windows 실행 스크립트
└── README.md
```

## API 레퍼런스

### POST /analyze

두 이미지를 분석하고 게이트별 비교 결과를 반환합니다.

**요청:**
- `reference`: 레퍼런스 이미지 파일 (multipart/form-data)
- `current`: 사용자 이미지 파일 (multipart/form-data)

**응답:**
```json
{
  "timestamp": "2024-01-01T00:00:00",
  "processingTime": 2.5,
  "finalScore": 85.5,
  "summary": {
    "aspectRatioScore": 100,
    "framingScore": 78,
    "compositionScore": 90,
    "compressionScore": 85
  },
  "overallFeedback": "레퍼런스와 비슷하지만 미세 조정이 필요합니다.",
  "gates": [...]
}
```

## 사용 모델

| 모델 | 용도 | 출처 |
|------|------|------|
| RTMPose-Wholebody | 133개 키포인트 포즈 추정 | [rtmlib](https://github.com/Tau-J/rtmlib) |
| Grounding DINO | 객체 검출 | [GroundingDINO](https://github.com/IDEA-Research/GroundingDINO) |
| Depth Anything V2 | 단안 깊이 추정 | [Depth-Anything](https://github.com/LiheYoung/Depth-Anything) |

## 라이선스

이 프로젝트는 연구 및 교육 목적으로 제공됩니다.

## 인용

본 코드를 연구에 사용하실 경우 다음과 같이 인용해 주세요:

```bibtex
@misc{tryangle2024,
  author = {TryAngle Team},
  title = {TryAngle: Gate System for Photo Composition Analysis},
  year = {2024},
  publisher = {GitHub},
  url = {https://github.com/hyunsoo93049/TryAngle_GateSystem}
}
```
