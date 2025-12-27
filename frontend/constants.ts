import { AnalysisReport } from './types';

// This simulates the parsed JSON response from the Python backend (v6.py)
// based on the logs provided in the prompt.
export const MOCK_ANALYSIS_RESULT: AnalysisReport = {
  timestamp: new Date().toISOString(),
  processingTime: 11.3,
  finalScore: 91,
  summary: {
    aspectRatioScore: 100,
    framingScore: 79,
    compositionScore: 90,
    compressionScore: 95,
  },
  overallFeedback: "레퍼런스와 비슷하지만 미세 조정이 필요합니다. 주로 카메라 이동 조정이 필요해 보입니다.",
  gates: [
    {
      gateId: 0,
      title: "종횡비 체크",
      status: "passed",
      score: 100,
      description: "레퍼런스 이미지와 가로세로 비율이 일치하는지 확인합니다.",
      details: {
        current: { width: 736, height: 920, ratio: 0.800, label: "3:4 (세로)" },
        reference: { width: 736, height: 919, ratio: 0.801, label: "3:4 (세로)" }
      },
      feedback: ["종횡비가 완벽하게 일치합니다."]
    },
    {
      gateId: 1,
      title: "프레이밍 & 여백",
      status: "warning",
      score: 74,
      description: "샷 타입, 인물 크기, 여백의 균형을 정밀 분석합니다.",
      details: {
        shotType: { current: "미디엄샷", reference: "미디엄샷", score: 95 },
        subjectSize: { current: 18.9, reference: 35.5, score: 73, diff: 16.5 },
        margins: {
          horizontal: { 
            currentLeft: 38, currentRight: 18,
            refLeft: 29, refRight: 10,
            status: "Perfect (완벽)",
            score: 95
          },
          vertical: {
            currentTop: 33, currentBottom: 24,
            refTop: 39, refBottom: 3,
            status: "조정 필요",
            score: 50
          },
          bottomIssue: "하단 여백이 너무 많습니다."
        }
      },
      feedback: [
        "1순위: 카메라를 피사체 쪽으로 두세 걸음 이동하세요.",
        "2순위: 카메라를 15도 위로 틸트하세요."
      ]
    },
    {
      gateId: 2,
      title: "구도 & 그리드",
      status: "passed",
      score: 90,
      description: "주요 피사체(얼굴 등)의 기하학적 위치를 확인합니다.",
      details: {
        facePosition: {
          current: { x: 0.52, y: 0.38, grid: "(2, 2)" },
          reference: { x: 0.47, y: 0.47, grid: "(2, 2)" }
        }
      },
      feedback: ["구도 구조가 잘 일치합니다."]
    },
    {
      gateId: 3,
      title: "압축감 (렌즈)",
      status: "passed",
      score: 95,
      description: "초점 거리와 원근감을 추정하여 분석합니다.",
      details: {
        current: { val: 0.49, label: "표준 렌즈" },
        reference: { val: 0.44, label: "준광각 렌즈" }
      },
      feedback: ["압축감이 일치합니다."]
    },
    {
      gateId: 4,
      title: "포즈 디테일",
      status: "passed",
      score: 95,
      description: "미세한 신체 동작과 자세를 분석합니다.",
      details: {
        shoulderTilt: 5.6
      },
      feedback: ["포즈 정렬이 양호합니다."]
    }
  ]
};