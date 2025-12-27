# TryAngle: Gate System for Photo Composition Analysis

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
        |              +-----------+-----------+
        |              |           |           |
        |         RTMPose    FramingAnalyzer  DepthAnything
        |        (133 kpts)   (Shot Type)    (Compression)
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

**Terminal 3 - Ngrok (Optional, for external access):**
```bash
ngrok http 3000
```

### Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

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
│   │   └── depth_anything.py         # Depth estimation wrapper
│   └── legacy/
│       └── reference_comparison.py   # Compression index calculation
├── frontend/
│   ├── App.tsx                       # Main React component
│   ├── components/
│   │   ├── GateCard.tsx              # Gate result display
│   │   ├── Summary.tsx               # Score summary
│   │   └── AnalyzingOverlay.tsx      # Loading animation
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
