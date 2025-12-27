export interface ImageDimensions {
  width: number;
  height: number;
  ratio: number;
  ratioLabel: string;
}

export interface GateResult {
  gateId: number;
  title: string;
  status: 'passed' | 'warning' | 'failed';
  score: number;
  description: string;
  details: any; // Flexible for specific gate data
  feedback: string[];
}

export interface FramingDetails {
  shotType: { current: string; reference: string; score: number };
  subjectSize: { current: number; reference: number; score: number; diff: number };
  margins: {
    left: { current: number; reference: number };
    right: { current: number; reference: number };
    top: { current: number; reference: number };
    bottom: { current: number; reference: number };
    verticalStatus: string;
    horizontalStatus: string;
  };
}

export interface CompositionDetails {
  facePos: { current: [number, number]; reference: [number, number] };
}

export interface AnalysisReport {
  timestamp: string;
  processingTime: number;
  finalScore: number;
  gates: GateResult[];
  summary: {
    aspectRatioScore: number;
    framingScore: number;
    compositionScore: number;
    compressionScore: number;
  };
  overallFeedback: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  refImageBase64: string;
  userImageBase64: string;
  apiResult: AnalysisReport;
  algoResult: AnalysisReport;
}