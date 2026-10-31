import { useRef } from 'react';
import { ActionButton } from '../../components/ActionButton';
import { OverlayDialog } from '../../components/OverlayDialog';
import { asset } from '../../lib/assets';

export type UnsavedNotice = { count: number; onRetry: () => void };

/* Figma 6430:7609(기본) · 6430:7709(저장 실패 기록 있음) — 데이터 백업 바텀시트. */
export function DataBackupSheet({ unsaved, busy, onExport, onImport, onClose }: {
  unsaved: UnsavedNotice | null; busy: boolean;
  onExport: () => void; onImport: (file: File) => void; onClose: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return <OverlayDialog label="데이터 백업" sheet dismissOutside className="data-backup-sheet" onClose={onClose}>
    <div className="sheet-handle" aria-hidden="true" />
    <header className="data-backup-heading">
      <h2>데이터 백업</h2>
      <p>기록을 파일로 저장하거나,<br />저장해 둔 파일에서 불러올 수 있어요.</p>
    </header>
    <div className="data-backup-content">
      {unsaved && <div className="settings-banner is-warning" role="status">
        <img className="settings-banner-icon" src={asset('settings-banner-warning.svg')} alt="" width={16} height={16} />
        <p className="settings-banner-copy">저장하지 못한 기록{unsaved.count > 0 ? ` ${unsaved.count}개` : ''}는<br />내보낼 파일에 포함되지 않아요.</p>
        <button type="button" className="settings-banner-action" onClick={unsaved.onRetry}>다시 시도</button>
      </div>}
      <button type="button" className="data-backup-option" onClick={onExport}>
        <span className="data-backup-icon"><img src={asset('backup-upload.svg')} alt="" width={16} height={16} /></span>
        <span className="data-backup-text"><strong>데이터 내보내기</strong><small>냉장고 기록을 파일(.json)로 저장해요</small></span>
        <img className="data-backup-chevron" src={asset('home-list-chevron.svg')} alt="" width={24} height={24} />
      </button>
      <button type="button" className="data-backup-option" disabled={busy} onClick={() => input.current?.click()}>
        <span className="data-backup-icon"><img src={asset('backup-download.svg')} alt="" width={16} height={16} /></span>
        <span className="data-backup-text"><strong>데이터 가져오기</strong><small>저장해 둔 파일에서 기록을 불러와요</small></span>
        <img className="data-backup-chevron" src={asset('home-list-chevron.svg')} alt="" width={24} height={24} />
      </button>
      <input ref={input} type="file" accept="application/json,.json" hidden onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) onImport(file);
      }} />
    </div>
    <footer className="data-backup-footer"><ActionButton className="is-neutral-weak" onClick={onClose}>닫기</ActionButton></footer>
  </OverlayDialog>;
}
