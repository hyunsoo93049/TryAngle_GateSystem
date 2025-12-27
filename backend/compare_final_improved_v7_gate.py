#!/usr/bin/env python3
"""
TryAngle v1.5 - Smart Feedback v7 Gate System
v6의 모든 핵심 로직 + 단계별 Gate 차단 방식

Gate 순서:
  Gate 0: 종횡비 체크 → 실패시 차단
  Gate 1: 프레이밍 (샷타입 + 인물비중 + 개선된 여백분석) → 실패시 차단
  Gate 2: 구도 (3분할, 얼굴 위치) → 실패시 차단
  Gate 3: 압축감 (렌즈 특성) → 실패시 차단
  Gate 4: 포즈 세부 → 최종 피드백

핵심 원리:
  - 각 Gate를 통과해야만 다음 Gate로 진행
  - 실패한 Gate에서 구체적인 조정 방법 제시
  - 사용자가 하나씩 해결해 나갈 수 있도록 안내
"""

import sys
import os
import time
import traceback
import math
import numpy as np
from pathlib import Path
from typing import Optional, Tuple, Dict, List, Any
import json

# UTF-8 인코딩 설정
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'

# 경로 추가
sys.path.append(str(Path(__file__).parent))
sys.path.append(str(Path(__file__).parent / "legacy"))

# RTMPose Wholebody Analyzer 임포트
from rtmpose_wholebody_analyzer import RTMPoseWholebodyAnalyzer

# Feedback Config 임포트
from feedback_config import FeedbackConfig, get_config, set_language

# Framing Analyzer 임포트 (기존 프레이밍 분석)
from framing_analyzer import FramingAnalyzer

# 개선된 여백 분석기 임포트 (v6)
from improved_margin_analyzer import ImprovedMarginAnalyzer, convert_to_legacy_format

# Legacy 시스템 임포트
from legacy.reference_comparison import (
    ReferenceComparison,
    ComparisonResult,
    ImageAnalysis
)

# 이미지 처리
try:
    from PIL import Image
except ImportError:
    import cv2


class SmartFeedbackV7Gate:
    """
    Gate System v7: v6 핵심 로직 + 단계별 차단 방식

    특징:
    - 각 Gate 통과 실패시 즉시 차단하고 해당 문제에 집중
    - v6의 개선된 여백 분석, 압축감 분석 등 모든 로직 포함
    - 사용자가 단계별로 문제를 해결할 수 있도록 안내
    """

    # Gate 정의
    GATE_ORDER = ['aspect_ratio', 'framing', 'composition', 'compression', 'pose']
    GATE_NAMES = {
        'aspect_ratio': '종횡비',
        'framing': '프레이밍',
        'composition': '구도',
        'compression': '압축감',
        'pose': '포즈'
    }

    def __init__(self, language='ko', debug_mode=True):
        """초기화"""
        self.debug_mode = debug_mode

        if debug_mode:
            print(f"[SmartFeedbackV7Gate] 초기화 중... (언어: {language})")
            print(f"[Gate System] 단계별 차단 방식 활성화")

        # 133개 키포인트 분석기
        self.wholebody = RTMPoseWholebodyAnalyzer(mode='balanced')

        # Legacy 시스템 (v2 압축감 로직)
        self.legacy_comparator = ReferenceComparison()

        # 프레이밍 분석기 (기존)
        self.framing_analyzer = FramingAnalyzer()

        # 개선된 여백 분석기 (v6)
        self.margin_analyzer = ImprovedMarginAnalyzer()

        # 언어 설정
        self.config = get_config(language)
        self.language = language

        # Gate 통과 기준 (조정 가능)
        self.gate_thresholds = {
            'aspect_ratio': 90,    # 종횡비 90% 이상
            'framing': 70,         # 프레이밍 70% 이상
            'composition': 75,     # 구도 75% 이상
            'compression': 80      # 압축감 80% 이상
        }

        # 디바이스별 줌 시스템
        self.device_zoom_systems = {
            "iPhone": [0.5, 1.0, 2.0, 3.0, 5.0],
            "Galaxy": [0.6, 1.0, 3.0, 10.0],
            "generic": [0.5, 1.0, 2.0, 3.0, 5.0]
        }

        if debug_mode:
            print("[SmartFeedbackV7Gate] 초기화 완료")

    def analyze_with_gates(self, current_path: str, reference_path: str,
                          device_type: str = "generic",
                          stop_on_fail: bool = True) -> Dict[str, Any]:
        """
        Gate System 기반 분석 (단계별 차단)

        Args:
            current_path: 현재 이미지 경로
            reference_path: 레퍼런스 이미지 경로
            device_type: 디바이스 타입
            stop_on_fail: True면 Gate 실패시 즉시 중단, False면 전체 분석

        Returns:
            단계별 Gate 결과와 피드백
        """
        if self.debug_mode:
            print("\n" + "="*70)
            print("[V7] Gate System 분석 시작 (단계별 차단 모드)")
            print("="*70)
            print(f"\n[입력 파일]")
            print(f"  Current: {Path(current_path).name}")
            print(f"  Reference: {Path(reference_path).name}")
            print(f"  차단 모드: {'활성화' if stop_on_fail else '비활성화 (전체 분석)'}")

        # 이미지 로드
        curr_img = self._load_image(current_path)
        ref_img = self._load_image(reference_path)

        if curr_img is None or ref_img is None:
            return {'error': '이미지 로드 실패', 'gate_level': 0}

        # 기본 정보 저장
        curr_shape = curr_img.shape
        ref_shape = ref_img.shape

        if self.debug_mode:
            print(f"\n[이미지 크기]")
            print(f"  Current: {curr_shape[1]}x{curr_shape[0]} (WxH)")
            print(f"  Reference: {ref_shape[1]}x{ref_shape[0]} (WxH)")

        # 키포인트 추출 (한 번만)
        if self.debug_mode:
            print("\n[133개 키포인트 추출]")
            print("-" * 60)

        curr_kpts = self._extract_keypoints(curr_img, "Current")
        ref_kpts = self._extract_keypoints(ref_img, "Reference")

        # Legacy 분석 (압축감용)
        if self.debug_mode:
            print("\n[Legacy 시스템 분석]")

        legacy_result = self.legacy_comparator.compare(
            current_path=current_path,
            reference_path=reference_path,
            mode='detailed'
        )

        # Gate System 실행
        return self._run_gate_system(
            curr_kpts, ref_kpts,
            curr_shape, ref_shape,
            legacy_result, device_type,
            stop_on_fail
        )

    def _run_gate_system(self, curr_kpts: Dict, ref_kpts: Dict,
                        curr_shape: Tuple, ref_shape: Tuple,
                        legacy_result: Any, device_type: str,
                        stop_on_fail: bool) -> Dict[str, Any]:
        """
        Gate System 핵심 로직 - 단계별 진행
        """
        if self.debug_mode:
            print("\n" + "="*70)
            print("[V7] Gate 순차 검사 시작")
            print("="*70)

        gates_passed = []
        gates_results = {}
        current_gate = 0
        blocked_at = None
        critical_feedback = None

        # ============ GATE 0: 종횡비 체크 ============
        if self.debug_mode:
            print(f"\n{'='*60}")
            print(f"[GATE 0] 종횡비 체크")
            print(f"{'='*60}")

        aspect_score, aspect_feedback = self._check_aspect_ratio(curr_shape, ref_shape)
        aspect_passed = aspect_score >= self.gate_thresholds['aspect_ratio']

        gates_results['aspect_ratio'] = {
            'score': aspect_score,
            'passed': aspect_passed,
            'feedback': aspect_feedback,
            'threshold': self.gate_thresholds['aspect_ratio']
        }

        if aspect_passed:
            gates_passed.append('aspect_ratio')
            if self.debug_mode:
                print(f"\n[GATE 0 통과] 종횡비 일치 (점수: {aspect_score:.0f})")
        else:
            if self.debug_mode:
                print(f"\n[GATE 0 실패] 종횡비 불일치 (점수: {aspect_score:.0f})")
            blocked_at = 'aspect_ratio'
            critical_feedback = {
                'gate': 'aspect_ratio',
                'gate_name': '종횡비',
                'issue': aspect_feedback.get('action', '종횡비를 맞춰주세요') if aspect_feedback else '종횡비를 맞춰주세요',
                'actions': [aspect_feedback.get('action', '')] if aspect_feedback else [],
                'priority': 'critical'
            }

            if stop_on_fail:
                return self._create_gate_result(
                    gate_level=0,
                    status='BLOCKED_AT_ASPECT_RATIO',
                    gates_passed=gates_passed,
                    gates_results=gates_results,
                    blocked_at=blocked_at,
                    critical_feedback=critical_feedback,
                    message="종횡비가 맞지 않습니다. 먼저 카메라 비율을 조정해주세요."
                )

        current_gate = 1

        # ============ GATE 1: 프레이밍 (v6 개선된 여백 분석 포함) ============
        if self.debug_mode:
            print(f"\n{'='*60}")
            print(f"[GATE 1] 프레이밍 체크 (v6 개선된 여백 분석)")
            print(f"{'='*60}")

        framing_score, framing_result = self._check_framing_v6(
            curr_kpts, ref_kpts, curr_shape, ref_shape
        )
        framing_passed = framing_score >= self.gate_thresholds['framing']

        gates_results['framing'] = {
            'score': framing_score,
            'passed': framing_passed,
            'feedback': framing_result.get('feedback', {}),
            'details': framing_result,
            'threshold': self.gate_thresholds['framing']
        }

        if framing_passed:
            gates_passed.append('framing')
            if self.debug_mode:
                print(f"\n[GATE 1 통과] 프레이밍 OK (점수: {framing_score:.0f})")
        else:
            if self.debug_mode:
                print(f"\n[GATE 1 실패] 프레이밍 조정 필요 (점수: {framing_score:.0f})")
            blocked_at = 'framing'

            # 프레이밍 피드백 생성
            feedback_data = framing_result.get('feedback', {})
            actions = feedback_data.get('actions', [])

            # 개선된 여백 분석에서 구체적 조정 추출
            margin_analysis = framing_result.get('improved_margin_analysis', {})
            if margin_analysis:
                actionable = margin_analysis.get('actionable_feedback', {})
                if actionable.get('primary_action'):
                    action = actionable['primary_action']
                    if action.get('camera'):
                        actions.insert(0, action['camera'])

            critical_feedback = {
                'gate': 'framing',
                'gate_name': '프레이밍',
                'issue': feedback_data.get('summary', '프레이밍 조정이 필요합니다'),
                'actions': actions[:3],  # 최대 3개
                'priority': 'high',
                'details': {
                    'shot_type': framing_result.get('shot_type', {}),
                    'subject_ratio': framing_result.get('subject_ratio', {}),
                    'margin_analysis': margin_analysis
                }
            }

            if stop_on_fail:
                return self._create_gate_result(
                    gate_level=1,
                    status='BLOCKED_AT_FRAMING',
                    gates_passed=gates_passed,
                    gates_results=gates_results,
                    blocked_at=blocked_at,
                    critical_feedback=critical_feedback,
                    overall_score=framing_score,
                    message="프레이밍이 맞지 않습니다. 샷 타입, 인물 크기, 여백을 조정해주세요."
                )

        current_gate = 2

        # ============ GATE 2: 구도 ============
        if self.debug_mode:
            print(f"\n{'='*60}")
            print(f"[GATE 2] 구도 체크")
            print(f"{'='*60}")

        composition_score, composition_feedback = self._check_composition(
            curr_kpts, ref_kpts, curr_shape, ref_shape
        )
        composition_passed = composition_score >= self.gate_thresholds['composition']

        gates_results['composition'] = {
            'score': composition_score,
            'passed': composition_passed,
            'feedback': composition_feedback,
            'threshold': self.gate_thresholds['composition']
        }

        if composition_passed:
            gates_passed.append('composition')
            if self.debug_mode:
                print(f"\n[GATE 2 통과] 구도 OK (점수: {composition_score:.0f})")
        else:
            if self.debug_mode:
                print(f"\n[GATE 2 실패] 구도 조정 필요 (점수: {composition_score:.0f})")
            blocked_at = 'composition'

            # 구도 이동 방향 계산
            move_direction = self._calculate_move_direction(composition_feedback)

            critical_feedback = {
                'gate': 'composition',
                'gate_name': '구도',
                'issue': '인물 위치가 레퍼런스와 다릅니다',
                'actions': [move_direction] if move_direction else ['카메라를 이동하여 구도를 맞춰주세요'],
                'priority': 'medium',
                'details': composition_feedback
            }

            if stop_on_fail:
                return self._create_gate_result(
                    gate_level=2,
                    status='BLOCKED_AT_COMPOSITION',
                    gates_passed=gates_passed,
                    gates_results=gates_results,
                    blocked_at=blocked_at,
                    critical_feedback=critical_feedback,
                    overall_score=composition_score,
                    message="구도가 맞지 않습니다. 카메라 위치를 조정해주세요."
                )

        current_gate = 3

        # ============ GATE 3: 압축감 (v6 개선된 분석) ============
        if self.debug_mode:
            print(f"\n{'='*60}")
            print(f"[GATE 3] 압축감 체크 (v6 렌즈 특성 분석)")
            print(f"{'='*60}")

        compression_score, compression_feedback = self._check_compression_v6(
            legacy_result, device_type
        )
        compression_passed = compression_score >= self.gate_thresholds['compression']

        gates_results['compression'] = {
            'score': compression_score,
            'passed': compression_passed,
            'feedback': compression_feedback,
            'threshold': self.gate_thresholds['compression']
        }

        if compression_passed:
            gates_passed.append('compression')
            if self.debug_mode:
                print(f"\n[GATE 3 통과] 압축감 OK (점수: {compression_score:.0f})")
        else:
            if self.debug_mode:
                print(f"\n[GATE 3 실패] 압축감 조정 필요 (점수: {compression_score:.0f})")
            blocked_at = 'compression'

            # 압축감 조정 방법
            adjustment = compression_feedback.get('adjustment', '') if compression_feedback else ''
            actions = adjustment.split('\n') if adjustment else ['줌 레벨을 조정해주세요']
            actions = [a.strip() for a in actions if a.strip()][:3]

            critical_feedback = {
                'gate': 'compression',
                'gate_name': '압축감',
                'issue': f"압축감이 다릅니다 ({compression_feedback.get('current_lens', '')} → {compression_feedback.get('target_lens', '')})" if compression_feedback else '압축감 조정 필요',
                'actions': actions,
                'priority': 'medium',
                'details': compression_feedback
            }

            if stop_on_fail:
                return self._create_gate_result(
                    gate_level=3,
                    status='BLOCKED_AT_COMPRESSION',
                    gates_passed=gates_passed,
                    gates_results=gates_results,
                    blocked_at=blocked_at,
                    critical_feedback=critical_feedback,
                    overall_score=compression_score,
                    message="압축감이 맞지 않습니다. 거리와 줌을 조정해주세요."
                )

        current_gate = 4

        # ============ GATE 4: 포즈 세부 (최종) ============
        if self.debug_mode:
            print(f"\n{'='*60}")
            print(f"[GATE 4] 포즈 세부 체크")
            print(f"{'='*60}")

        pose_feedback = self._check_pose_details(curr_kpts, ref_kpts)

        gates_results['pose'] = {
            'feedback': pose_feedback,
            'passed': True  # 포즈는 차단하지 않고 제안만
        }
        gates_passed.append('pose')

        if self.debug_mode:
            print(f"\n[GATE 4 완료] 포즈 세부 분석 완료")

        # ============ 모든 Gate 통과! ============
        overall_score = self._calculate_overall_score(gates_results)

        if self.debug_mode:
            print(f"\n{'='*70}")
            print(f"[SUCCESS] 모든 Gate 통과!")
            print(f"{'='*70}")
            print(f"최종 점수: {overall_score:.1f}/100")

        return self._create_gate_result(
            gate_level=4,
            status='ALL_GATES_PASSED',
            gates_passed=gates_passed,
            gates_results=gates_results,
            blocked_at=None,
            critical_feedback=None,
            overall_score=overall_score,
            message="모든 항목이 레퍼런스와 일치합니다!",
            pose_suggestions=pose_feedback
        )

    def _create_gate_result(self, gate_level: int, status: str,
                           gates_passed: List[str], gates_results: Dict,
                           blocked_at: Optional[str],
                           critical_feedback: Optional[Dict],
                           overall_score: float = 0,
                           message: str = "",
                           pose_suggestions: Optional[List] = None) -> Dict[str, Any]:
        """Gate 결과 생성"""

        # 점수 계산 (통과한 Gate만)
        if overall_score == 0:
            scores = [g['score'] for g in gates_results.values() if 'score' in g]
            overall_score = sum(scores) / len(scores) if scores else 0

        # 친절한 요약 생성
        friendly_summary = self._generate_friendly_summary(
            gate_level, status, gates_passed, blocked_at, critical_feedback, overall_score
        )

        result = {
            'mode': 'V7_GATE_SYSTEM',
            'gate_level': gate_level,
            'status': status,
            'gates_passed': gates_passed,
            'gates_results': gates_results,
            'blocked_at': blocked_at,
            'critical_feedback': critical_feedback,
            'overall_score': overall_score,
            'message': message,
            'friendly_summary': friendly_summary,
            'summary': self._generate_gate_summary(gates_results, gates_passed)
        }

        if pose_suggestions:
            result['pose_suggestions'] = pose_suggestions

        return result

    def _generate_friendly_summary(self, gate_level: int, status: str,
                                  gates_passed: List[str], blocked_at: Optional[str],
                                  critical_feedback: Optional[Dict],
                                  overall_score: float) -> str:
        """친절한 요약 메시지 생성"""

        if status == 'ALL_GATES_PASSED':
            if overall_score >= 95:
                return "완벽합니다! 레퍼런스와 거의 동일해요."
            elif overall_score >= 85:
                return "아주 잘 맞았어요! 미세한 조정만 하면 완벽해요."
            else:
                return "전반적으로 잘 맞았습니다."

        # Gate에서 차단된 경우
        if blocked_at and critical_feedback:
            gate_name = critical_feedback.get('gate_name', blocked_at)
            actions = critical_feedback.get('actions', [])

            if blocked_at == 'aspect_ratio':
                return f"종횡비부터 맞춰주세요. {actions[0] if actions else '카메라 비율 설정을 변경하세요.'}"

            elif blocked_at == 'framing':
                if actions:
                    return f"프레이밍 조정이 필요해요. {actions[0]}"
                return "프레이밍을 조정해주세요. 샷 타입이나 인물 크기를 맞춰보세요."

            elif blocked_at == 'composition':
                if actions:
                    return f"구도를 조정해주세요. {actions[0]}"
                return "구도가 맞지 않아요. 카메라 위치를 조정해보세요."

            elif blocked_at == 'compression':
                if actions:
                    return f"압축감이 달라요. {actions[0]}"
                return "압축감 조정이 필요해요. 거리와 줌을 조절해보세요."

        # 통과한 Gate 개수에 따른 메시지
        passed_count = len(gates_passed)
        total_gates = 4  # pose 제외

        if passed_count == 0:
            return "기본 설정부터 맞춰주세요."
        elif passed_count == 1:
            return f"좋아요! {self.GATE_NAMES.get(gates_passed[0], '')}은(는) 통과했어요. 다음 단계를 진행해주세요."
        elif passed_count == 2:
            return f"절반 완료! {', '.join([self.GATE_NAMES.get(g, '') for g in gates_passed])}은(는) OK. 계속 진행해주세요."
        else:
            return f"거의 다 왔어요! 조금만 더 조정하면 완성이에요."

    def _generate_gate_summary(self, gates_results: Dict, gates_passed: List[str]) -> str:
        """Gate 요약 텍스트 생성"""
        lines = []

        for gate_key in self.GATE_ORDER:
            if gate_key in gates_results:
                gate = gates_results[gate_key]
                gate_name = self.GATE_NAMES.get(gate_key, gate_key)

                if 'score' in gate:
                    if gate.get('passed'):
                        status = "[OK]"
                    else:
                        status = "[!!]"
                    lines.append(f"{status} {gate_name}: {gate['score']:.0f}점")
                elif gate_key in gates_passed:
                    lines.append(f"[OK] {gate_name}: 완료")
            else:
                gate_name = self.GATE_NAMES.get(gate_key, gate_key)
                lines.append(f"[--] {gate_name}: 대기")

        return "\n".join(lines)

    # =====================================================================
    # Gate 체크 함수들 (v6 로직 유지)
    # =====================================================================

    def _check_aspect_ratio(self, curr_shape: Tuple, ref_shape: Tuple) -> Tuple[float, Optional[Dict]]:
        """종횡비 체크 (v6 동일)"""
        curr_ratio = curr_shape[1] / curr_shape[0]
        ref_ratio = ref_shape[1] / ref_shape[0]

        def get_ratio_name(ratio):
            if abs(ratio - 1.0) < 0.1:
                return "1:1 (정사각형)"
            elif abs(ratio - 1.33) < 0.1:
                return "4:3 (가로)"
            elif abs(ratio - 1.5) < 0.1:
                return "3:2 (가로 DSLR)"
            elif abs(ratio - 1.78) < 0.1:
                return "16:9 (가로 와이드)"
            elif abs(ratio - 0.75) < 0.1:
                return "3:4 (세로)"
            elif abs(ratio - 0.67) < 0.1:
                return "2:3 (세로 DSLR)"
            elif abs(ratio - 0.56) < 0.1:
                return "9:16 (세로 와이드)"
            else:
                if ratio > 1:
                    return f"{ratio:.2f}:1 (가로)"
                else:
                    return f"1:{(1/ratio):.2f} (세로)"

        curr_name = get_ratio_name(curr_ratio)
        ref_name = get_ratio_name(ref_ratio)

        if self.debug_mode:
            print(f"  Current: {curr_shape[1]}x{curr_shape[0]} = {curr_name}")
            print(f"  Reference: {ref_shape[1]}x{ref_shape[0]} = {ref_name}")

        diff = abs(curr_ratio - ref_ratio)

        # Always return feedback with dims info (like v6)
        feedback = {
            'passed': diff < 0.1,
            'diff': diff,
            'current_name': curr_name,
            'target_name': ref_name,
            'current_dims': [curr_shape[1], curr_shape[0]],  # [width, height]
            'target_dims': [ref_shape[1], ref_shape[0]],
            'action': '비율이 일치합니다' if diff < 0.1 else f"카메라 비율을 {ref_name}로 변경하세요"
        }

        if diff < 0.1:
            if self.debug_mode:
                print(f"  -> 종횡비 일치")
            return 100, feedback

        score = max(30, 100 - (diff * 100))

        if self.debug_mode:
            print(f"  -> 종횡비 불일치 (점수: {score:.0f})")

        feedback['issue'] = 'ASPECT_RATIO_MISMATCH'
        return score, feedback

    def _check_framing_v6(self, curr_kpts: Dict, ref_kpts: Dict,
                         curr_shape: Tuple, ref_shape: Tuple) -> Tuple[float, Dict]:
        """프레이밍 체크 (v6 개선된 여백 분석 포함)"""

        if self.debug_mode:
            print("\n  [프레이밍 종합 분석]")

        # 기존 프레이밍 분석
        framing_result = self.framing_analyzer.analyze_framing_comprehensive(
            curr_kpts, ref_kpts, curr_shape, ref_shape
        )

        # v6: 개선된 여백 분석
        margin_analysis = self.margin_analyzer.analyze_margins_unified(
            curr_kpts, ref_kpts, curr_shape, ref_shape
        )

        framing_result['all_margins'] = convert_to_legacy_format(margin_analysis)
        framing_result['improved_margin_analysis'] = margin_analysis

        # 디버그 출력
        if self.debug_mode:
            self._print_framing_debug(framing_result, margin_analysis)

        # 점수 계산 (v6 가중치)
        shot_score = framing_result['shot_type']['score']
        subject_score = framing_result['subject_ratio']['score']
        margin_score = margin_analysis['overall_score']

        weights = {
            'shot_type': 0.25,
            'subject_ratio': 0.35,
            'margins': 0.40
        }

        overall_score = (
            shot_score * weights['shot_type'] +
            subject_score * weights['subject_ratio'] +
            margin_score * weights['margins']
        )

        framing_result['overall_score'] = overall_score

        # 피드백 생성
        framing_result['feedback'] = self._generate_framing_feedback(
            framing_result, margin_analysis
        )

        return overall_score, framing_result

    def _print_framing_debug(self, framing_result: Dict, margin_analysis: Dict):
        """프레이밍 디버그 출력"""

        # 샷 타입
        shot = framing_result['shot_type']
        curr_name = shot['current'].get('name_kr', shot['current'].get('type', 'unknown'))
        ref_name = shot['reference'].get('name_kr', shot['reference'].get('type', 'unknown'))
        print(f"\n  [샷 타입]")
        print(f"    Current: {curr_name}")
        print(f"    Reference: {ref_name}")
        print(f"    점수: {shot['score']:.0f}")

        # 인물 비중
        subject = framing_result['subject_ratio']
        print(f"\n  [인물 비중]")
        print(f"    Current: {subject['current_ratio']*100:.1f}%")
        print(f"    Reference: {subject['reference_ratio']*100:.1f}%")
        print(f"    점수: {subject['score']:.0f}")

        if subject.get('action'):
            print(f"    조정: {subject['action']}")

        # 여백 분석
        print(f"\n  [여백 분석 (v6)]")

        curr_m = margin_analysis['current_margins']
        ref_m = margin_analysis['reference_margins']

        print(f"    좌우: Current 좌{curr_m['left']*100:+.0f}%/우{curr_m['right']*100:+.0f}% vs Ref 좌{ref_m['left']*100:+.0f}%/우{ref_m['right']*100:+.0f}%")
        print(f"    상하: Current 상{curr_m['top']*100:+.0f}%/하{curr_m['bottom']*100:+.0f}% vs Ref 상{ref_m['top']*100:+.0f}%/하{ref_m['bottom']*100:+.0f}%")
        print(f"    여백 점수: {margin_analysis['overall_score']:.0f}")

        # 조정 방법
        actionable = margin_analysis.get('actionable_feedback', {})
        if actionable.get('primary_action'):
            action = actionable['primary_action']
            if action.get('camera'):
                print(f"    조정 방법: {action['camera']}")

    def _generate_framing_feedback(self, framing_result: Dict, margin_analysis: Dict) -> Dict:
        """프레이밍 피드백 생성"""

        actions = []
        issues = []
        severity = 'minor'

        # 샷 타입
        shot = framing_result['shot_type']
        if not shot['same_category']:
            issues.append('shot_type_mismatch')
            severity = 'major'
            curr = shot['current'].get('name_kr', '')
            ref = shot['reference'].get('name_kr', '')
            actions.append(f"샷 타입 변경: {curr} → {ref}")

        # 인물 비중
        subject = framing_result['subject_ratio']
        if subject.get('action'):
            issues.append('subject_ratio')
            actions.append(subject['action'])

        # 여백
        margin_fb = margin_analysis.get('actionable_feedback', {})
        if margin_fb.get('has_issues'):
            issues.append('margin_imbalance')
            if margin_fb.get('primary_action'):
                action = margin_fb['primary_action']
                if action.get('camera'):
                    actions.append(action['camera'])

        # 요약
        if not issues:
            summary = "프레이밍이 레퍼런스와 일치합니다"
        elif len(issues) == 1:
            summary = "프레이밍 미세 조정 필요"
        else:
            summary = "프레이밍 조정이 필요합니다"

        return {
            'issues': issues,
            'actions': actions[:3],
            'summary': summary,
            'severity': severity
        }

    def _check_composition(self, curr_kpts: Dict, ref_kpts: Dict,
                          curr_shape: Tuple, ref_shape: Tuple) -> Tuple[float, Optional[Dict]]:
        """구도 체크"""

        if self.debug_mode:
            print("\n  [구도 분석]")

        curr_center = self._calculate_face_center(curr_kpts, curr_shape)
        ref_center = self._calculate_face_center(ref_kpts, ref_shape)

        if not curr_center or not ref_center:
            if self.debug_mode:
                print("  -> 얼굴 감지 불가, 기본 점수")
            return 75, None

        curr_grid = self._to_grid_position(curr_center)
        ref_grid = self._to_grid_position(ref_center)

        if self.debug_mode:
            print(f"  Current 얼굴: ({curr_center[0]:.2f}, {curr_center[1]:.2f}) → 그리드 {curr_grid}")
            print(f"  Reference 얼굴: ({ref_center[0]:.2f}, {ref_center[1]:.2f}) → 그리드 {ref_grid}")

        if curr_grid == ref_grid:
            if self.debug_mode:
                print(f"  -> 구도 일치")
            return 90, None

        distance = math.sqrt((curr_center[0] - ref_center[0])**2 +
                           (curr_center[1] - ref_center[1])**2)
        score = max(40, 80 - (distance * 100))

        if self.debug_mode:
            print(f"  -> 구도 불일치 (점수: {score:.0f})")

        return score, {
            'issue': 'POSITION_MISMATCH',
            'current_grid': curr_grid,
            'target_grid': ref_grid,
            'current_center': curr_center,
            'target_center': ref_center,
            'distance': distance
        }

    def _calculate_move_direction(self, composition_feedback: Optional[Dict]) -> Optional[str]:
        """구도 이동 방향 계산"""

        if not composition_feedback:
            return None

        curr_center = composition_feedback.get('current_center')
        target_center = composition_feedback.get('target_center')

        if not curr_center or not target_center:
            return None

        dx = target_center[0] - curr_center[0]
        dy = target_center[1] - curr_center[1]

        moves = []

        if abs(dx) > 0.05:
            if dx > 0:
                moves.append("카메라를 오른쪽으로")
            else:
                moves.append("카메라를 왼쪽으로")

        if abs(dy) > 0.05:
            if dy > 0:
                moves.append("카메라를 아래로 틸트")
            else:
                moves.append("카메라를 위로 틸트")

        if moves:
            return " 그리고 ".join(moves) + " 이동하세요"

        return None

    def _check_compression_v6(self, legacy_result: Any, device_type: str) -> Tuple[float, Optional[Dict]]:
        """압축감 체크 (v6 개선)"""

        if self.debug_mode:
            print("\n  [압축감 분석]")

        if not hasattr(legacy_result, 'detailed_feedback'):
            return 80, None

        if 'compression' not in legacy_result.detailed_feedback:
            return 80, None

        comp_data = legacy_result.detailed_feedback['compression']

        import re
        curr_match = re.search(r'\(([0-9.]+)\)', comp_data.get('current', ''))
        ref_match = re.search(r'\(([0-9.]+)\)', comp_data.get('reference', ''))

        if not (curr_match and ref_match):
            return 80, None

        curr_comp = float(curr_match.group(1))
        ref_comp = float(ref_match.group(1))

        def describe_lens_type(value):
            if value < 0.3:
                return "광각렌즈", "wide"
            elif value < 0.45:
                return "준광각", "semi-wide"
            elif value < 0.6:
                return "표준렌즈", "normal"
            elif value < 0.75:
                return "중망원", "medium-tele"
            else:
                return "망원렌즈", "telephoto"

        curr_lens, _ = describe_lens_type(curr_comp)
        ref_lens, _ = describe_lens_type(ref_comp)

        if self.debug_mode:
            print(f"  Current: {curr_comp:.2f} ({curr_lens})")
            print(f"  Reference: {ref_comp:.2f} ({ref_lens})")

        diff = abs(ref_comp - curr_comp)

        if diff < 0.05:
            if self.debug_mode:
                print(f"  -> 압축감 일치")
            return 95, None

        # 점수 계산
        if diff < 0.2:
            score = 95 - (diff - 0.05) * 100
        elif diff < 0.4:
            score = 80 - (diff - 0.2) * 75
        else:
            score = max(50, 65 - (diff - 0.4) * 50)

        # 조정 방법 생성
        adjustment = self._generate_compression_adjustment(curr_comp, ref_comp, curr_lens, ref_lens)

        if self.debug_mode:
            print(f"  -> 압축감 차이 (점수: {score:.0f})")
            print(f"\n  조정 방법:")
            for line in adjustment.split('\n')[:2]:
                if line.strip():
                    print(f"    {line.strip()}")

        return score, {
            'issue': 'COMPRESSION_MISMATCH',
            'current_compression': curr_comp,
            'target_compression': ref_comp,
            'current_lens': curr_lens,
            'target_lens': ref_lens,
            'adjustment': adjustment
        }

    def _generate_compression_adjustment(self, curr_comp: float, ref_comp: float,
                                        curr_lens: str, ref_lens: str) -> str:
        """압축감 조정 메시지 생성 (v6 동일)"""

        messages = []

        if curr_comp < ref_comp:
            diff_level = ref_comp - curr_comp

            if diff_level < 0.15:
                messages.append(f"현재 사진이 약간 더 광각입니다")
                messages.append("한두 걸음 뒤로 물러난 뒤, 줌을 한 단계 키워서 촬영하세요")
            elif diff_level < 0.3:
                messages.append(f"현재 {curr_lens}로 촬영되어 레퍼런스({ref_lens})보다 광각입니다")
                messages.append("몇 걸음 뒤로 물러나서 줌을 2-3단계 키우세요")
            else:
                messages.append(f"상당한 압축감 차이가 있습니다 ({curr_lens} → {ref_lens})")
                messages.append("여러 걸음 뒤로 물러나서 최대한 줌인하세요")
        else:
            diff_level = curr_comp - ref_comp

            if diff_level < 0.15:
                messages.append(f"현재 사진이 약간 더 압축되어 있습니다")
                messages.append("한두 걸음 앞으로 다가간 뒤, 줌을 한 단계 줄여서 촬영하세요")
            elif diff_level < 0.3:
                messages.append(f"현재 {curr_lens}로 촬영되어 레퍼런스({ref_lens})보다 압축감이 강합니다")
                messages.append("몇 걸음 앞으로 다가가서 줌을 2-3단계 줄이세요")
            else:
                messages.append(f"상당한 압축감 차이가 있습니다 ({curr_lens} → {ref_lens})")
                messages.append("여러 걸음 앞으로 다가가서 줌아웃하세요")

        return "\n".join(messages)

    def _check_pose_details(self, curr_kpts: Dict, ref_kpts: Dict) -> Optional[List[Dict]]:
        """포즈 세부 체크"""

        if self.debug_mode:
            print("\n  [포즈 세부 분석]")

        suggestions = []
        curr_body = curr_kpts.get('body_keypoints', {})

        # 어깨 기울기
        if 'left_shoulder' in curr_body and 'right_shoulder' in curr_body:
            left = curr_body['left_shoulder']['position']
            right = curr_body['right_shoulder']['position']

            dx = right[0] - left[0]
            dy = right[1] - left[1]
            angle = math.degrees(math.atan2(dy, dx))

            if abs(angle) > 90:
                deviation = abs(abs(angle) - 180)
            else:
                deviation = abs(angle)

            if self.debug_mode:
                print(f"  어깨 기울기: {deviation:.1f}도")

            if deviation > 20:
                suggestions.append({
                    'category': 'posture',
                    'suggestion': f"어깨가 {deviation:.0f}도 기울어져 있습니다",
                    'importance': 'optional'
                })

        return suggestions if suggestions else None

    # =====================================================================
    # 유틸리티 함수들
    # =====================================================================

    def _extract_keypoints(self, img: np.ndarray, label: str) -> Dict:
        """키포인트 추출"""

        if self.debug_mode:
            print(f"\n  [{label}] 키포인트 추출")

        kpts = self.wholebody.extract_wholebody_keypoints(img)

        if self.debug_mode:
            print(f"    인물 수: {kpts['num_persons']}명")
            if kpts['num_persons'] > 0:
                body = kpts.get('body_keypoints', {})
                face = kpts.get('face_landmarks', {})
                print(f"    신체: {len(body)}개, 얼굴: {len(face)}개")

        return kpts

    def _load_image(self, path: str) -> Optional[np.ndarray]:
        """이미지 로드"""
        try:
            if 'PIL' in sys.modules:
                img = Image.open(path).convert('RGB')
                return np.array(img)
            else:
                img = cv2.imread(path)
                return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        except Exception as e:
            print(f"[ERROR] 이미지 로드 실패: {e}")
            return None

    def _calculate_face_center(self, kpts: Dict, img_shape: Tuple) -> Optional[Tuple[float, float]]:
        """얼굴 중심 계산"""
        if kpts['num_persons'] == 0:
            return None

        face = kpts.get('face_landmarks', {})

        if len(face) > 30:
            positions = [kpt['position'] for kpt in face.values()]
            avg_x = np.mean([p[0] for p in positions]) / img_shape[1]
            avg_y = np.mean([p[1] for p in positions]) / img_shape[0]
            return (avg_x, avg_y)

        if 'nose' in kpts.get('body_keypoints', {}):
            nose = kpts['body_keypoints']['nose']['position']
            return (nose[0] / img_shape[1], nose[1] / img_shape[0])

        return None

    def _to_grid_position(self, pos: Tuple[float, float]) -> Tuple[int, int]:
        """3분할 구도 위치"""
        grid_x = min(int(pos[0] * 3) + 1, 3)
        grid_y = min(int(pos[1] * 3) + 1, 3)
        return (grid_x, grid_y)

    def _calculate_overall_score(self, gates_results: Dict) -> float:
        """전체 점수 계산"""
        scores = [g['score'] for g in gates_results.values() if 'score' in g]
        return sum(scores) / len(scores) if scores else 0


# =========================================================================
# 출력 헬퍼 함수
# =========================================================================

def print_gate_result(result: Dict):
    """Gate 결과 출력"""

    print("\n" + "="*70)
    print("  [V7 Gate System 결과]")
    print("="*70)

    # 상태
    status = result.get('status', 'UNKNOWN')
    gate_level = result.get('gate_level', 0)

    print(f"\n상태: {status}")
    print(f"Gate 레벨: {gate_level}/4")

    # 통과한 Gate
    passed = result.get('gates_passed', [])
    print(f"\n통과한 Gate: {', '.join(passed) if passed else '없음'}")

    # 차단 정보
    if result.get('blocked_at'):
        blocked = result['blocked_at']
        gate_name = SmartFeedbackV7Gate.GATE_NAMES.get(blocked, blocked)
        print(f"\n[!!] 차단된 Gate: {gate_name}")

    # 핵심 피드백
    if result.get('critical_feedback'):
        fb = result['critical_feedback']
        print(f"\n[핵심 피드백]")
        print(f"  문제: {fb.get('issue', 'N/A')}")
        if fb.get('actions'):
            print(f"  조치:")
            for action in fb['actions'][:3]:
                print(f"    → {action}")

    # 요약
    print(f"\n[요약]")
    print(result.get('summary', ''))

    # 친절한 메시지
    print(f"\n[가이드]")
    print(result.get('friendly_summary', ''))

    # 점수
    score = result.get('overall_score', 0)
    print(f"\n현재 점수: {score:.1f}/100")

    print("\n" + "="*70)


def main():
    """메인 실행 함수"""

    try:
        print("\n" + "="*70)
        print("  TryAngle v7 - Gate System (단계별 차단)")
        print("="*70)
        print("\n각 Gate를 통과해야 다음 단계로 진행됩니다.")
        print("문제가 발견되면 해당 Gate에서 멈추고 조정 방법을 안내합니다.\n")

        # 시스템 초기화
        feedback_system = SmartFeedbackV7Gate(language='ko', debug_mode=True)

        # 이미지 입력
        print("\n[이미지 입력]")
        print("-" * 40)

        current_path = input("Current 이미지 경로: ").strip().replace('"', '').replace("'", '')
        if not Path(current_path).exists():
            print(f"파일을 찾을 수 없습니다: {current_path}")
            return

        reference_path = input("Reference 이미지 경로: ").strip().replace('"', '').replace("'", '')
        if not Path(reference_path).exists():
            print(f"파일을 찾을 수 없습니다: {reference_path}")
            return

        # 모드 선택
        print("\n[모드 선택]")
        print("  1. 단계별 차단 (Gate 실패시 중단)")
        print("  2. 전체 분석 (모든 Gate 검사)")
        mode = input("선택 (1/2, 기본=1): ").strip() or '1'
        stop_on_fail = (mode == '1')

        # 분석 실행
        print("\n[분석 중...]")
        start_time = time.time()

        result = feedback_system.analyze_with_gates(
            current_path=current_path,
            reference_path=reference_path,
            device_type='generic',
            stop_on_fail=stop_on_fail
        )

        total_time = time.time() - start_time

        # 결과 출력
        print_gate_result(result)

        print(f"\n분석 시간: {total_time:.1f}초")

        # 재실행
        print("\n" + "-"*40)
        again = input("\n다른 이미지를 비교하시겠습니까? (y/n): ").lower()
        if again == 'y':
            main()
        else:
            print("\nv7 Gate System을 종료합니다.")

    except KeyboardInterrupt:
        print("\n\n종료합니다...")
    except Exception as e:
        print(f"\n오류: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    main()
