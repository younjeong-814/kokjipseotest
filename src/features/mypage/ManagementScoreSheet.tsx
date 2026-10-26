import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ActionButton } from '../../components/ActionButton';
import { IconTime } from '../../components/IconTime';
import { OverlayDialog } from '../../components/OverlayDialog';
import { asset } from '../../lib/assets';

const gradeRows = [
  { min: 90, max: 100, range: '90~100', grade: '냉장고 관리 달인 Master' },
  { min: 75, max: 89, range: '75~89', grade: '알뜰한 냉장고 Pro' },
  { min: 60, max: 74, range: '60~74', grade: '차곡차곡 관리 중' },
  { min: 40, max: 59, range: '40~59', grade: '냉장고 살펴보는 중' },
  { min: 0, max: 39, range: '0~39', grade: '관리 시작 단계' },
] as const;

export function ManagementScoreSheet({ score, onClose }: {
  score: number | null;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const dragStart = useRef<number | null>(null);
  const didDrag = useRef(false);
  const suppressClick = useRef(false);
  const handleGesture = useRef(false);
  const startExpandDrag = (event: ReactPointerEvent<HTMLElement>, fromHandle = false) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = event.clientY;
    didDrag.current = false;
    handleGesture.current = fromHandle;
    if (fromHandle) suppressClick.current = false;
  };
  const moveExpandDrag = (event: ReactPointerEvent<HTMLElement>, downwardOnly = false) => {
    if (dragStart.current === null || didDrag.current) return;
    const distance = event.clientY - dragStart.current;
    if (downwardOnly ? distance < 8 : Math.abs(distance) < 8) return;
    didDrag.current = true;
    if (handleGesture.current) suppressClick.current = true;
    setExpanded(true);
  };
  const endExpandDrag = () => {
    dragStart.current = null;
    didDrag.current = false;
    handleGesture.current = false;
  };

  return <OverlayDialog label="냉장고 관리 점수 안내" onClose={onClose} sheet dismissOutside className={`mypage-score-sheet${expanded ? ' expanded' : ''}`}>
    <div className="mypage-score-sheet-layout">
      <button
        type="button"
        className="mypage-score-sheet-handle"
        aria-label={expanded ? '안내 창 높이 줄이기' : '안내 창 펼치기'}
        aria-expanded={expanded}
        onPointerDown={event => startExpandDrag(event, true)}
        onPointerMove={event => moveExpandDrag(event)}
        onPointerUp={endExpandDrag}
        onPointerCancel={endExpandDrag}
        onClick={() => {
          if (suppressClick.current) { suppressClick.current = false; return; }
          setExpanded(value => !value);
        }}
      ><span aria-hidden="true" /></button>
      <header className="mypage-score-sheet-header">
        <p>관리점수 안내</p>
        <h2>냉장고 관리점수는 이렇게 정해져요</h2>
        <span>식재료 소비율과 관리율을 종합해 100점 만점으로 계산해요.</span>
      </header>
      <div className="mypage-score-sheet-content">
        <section
          className="mypage-score-grades"
          aria-label="점수별 등급"
          onPointerDown={event => startExpandDrag(event)}
          onPointerMove={event => moveExpandDrag(event, true)}
          onPointerUp={endExpandDrag}
          onPointerCancel={endExpandDrag}
        >
          <h3>점수별 등급</h3>
          <ul>
            {gradeRows.map(({ min, max, range, grade }) => <li key={min} className={score !== null && score >= min && score <= max ? 'current' : ''} aria-current={score !== null && score >= min && score <= max ? 'true' : undefined}>
              <span className="mypage-score-grade-range">{range}</span>
              <strong>{grade}</strong>
              {score !== null && score >= min && score <= max && <span className="mypage-score-current">현재</span>}
            </li>)}
          </ul>
        </section>
        <section className="mypage-score-update" aria-label="점수 갱신과 산정 기준">
          <IconTime/>
          <div className="mypage-score-update-copy">
            <strong className="mypage-score-update-heading">매일 오전 6시(한국 시간)에 갱신돼요</strong>
            <p>관리점수는 소비율과 관리율을 합산해서 계산해요</p>
            <ul>
              <li><img src={asset('mypage-score-consumption.svg')} alt=""/><strong>소비율 70%</strong><span>등록한 식재료 중 소비 완료한 비율</span></li>
              <li><img src={asset('mypage-score-management.svg')} alt=""/><strong>관리율 30%</strong><span>상태 업데이트·보관 변경 등 관리한 비율</span></li>
            </ul>
          </div>
        </section>
      </div>
      {expanded && <footer className="mypage-score-sheet-actions"><ActionButton onClick={onClose}>확인했어요</ActionButton></footer>}
    </div>
  </OverlayDialog>;
}
