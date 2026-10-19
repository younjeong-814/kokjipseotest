import { useRef, useState } from 'react';
import { SubHeader } from '../../components/SubHeader';
import { asset } from '../../lib/assets';
import type { Navigate, ScreenId } from '../../prototype/flow';
import { fileToJpegBase64, useCamera } from './useCamera';

const statusMessages = {
  starting: '카메라를 켜는 중이에요',
  denied: '카메라 권한이 필요해요.\n브라우저 설정에서 카메라를 허용하거나 앨범에서 사진을 선택해 주세요.',
  unavailable: '카메라를 사용할 수 없어요.\n앨범에서 사진을 선택해 주세요.',
} as const;

type Props = { navigate: Navigate; onCapture: (image: string) => Promise<void>; backDestination?: ScreenId };

/** 영수증 OCR - 카메라 촬영 (Figma 5579:702) */
export function ReceiptCameraPage({ navigate, onCapture, backDestination = 'guide-receipt' }: Props) {
  const camera = useCamera();
  const albumInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (getImage: () => Promise<string | null> | string | null) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const image = await getImage();
      if (!image) throw new Error('사진을 찍지 못했어요. 다시 시도해 주세요.');
      await onCapture(image);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '다시 시도해 주세요.');
    } finally { setBusy(false); }
  };
  const message = busy ? '영수증을 읽는 중이에요' : error || (camera.status === 'ready' ? '' : statusMessages[camera.status]);
  return (
    <main className="receipt-camera" data-figma-node="5579:702">
      <SubHeader title="영수증 촬영" onBack={() => navigate(backDestination)} />
      <section className="camera-view" aria-label="카메라 미리보기">
        <div className="camera-guide-bar">
          <p>영수증 전체가 보이도록 맞춰 주세요</p>
          <button type="button" className="camera-flash" aria-label={camera.torch.on ? '플래시 켜짐' : '플래시 꺼짐'} aria-pressed={camera.torch.on} disabled={!camera.torch.supported} onClick={camera.toggleTorch}>
            <img src={asset('flash-off.svg')} alt="" width={24} height={24} />
          </button>
        </div>
        <div className="camera-preview" aria-busy={busy}>
          <video ref={camera.videoRef} className="camera-video" playsInline muted hidden={camera.status !== 'ready'} />
          <img className="receipt-guide-frame" src={asset('receipt-guide-frame.svg')} alt="" width={266} height={402} />
          {message && <p className="camera-message" role={error ? 'alert' : 'status'}>{message}</p>}
        </div>
        <div className="camera-controls">
          <p className="camera-tip">글씨가 선명하고 빛이 반사되지 않게 촬영해 주세요</p>
          <div className="camera-actions">
            <button type="button" className="camera-album" disabled={busy} onClick={() => albumInput.current?.click()}>
              <img src={asset('album.svg')} alt="" width={28} height={28} />
              <span>앨범</span>
            </button>
            <input ref={albumInput} type="file" accept="image/*" hidden onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void submit(() => fileToJpegBase64(file));
            }} />
            <button type="button" className="camera-shutter" aria-label="영수증 촬영" disabled={busy || camera.status !== 'ready'} onClick={() => void submit(camera.capture)}>
              <img src={asset('shutter.svg')} alt="" width={80} height={80} />
            </button>
            <span className="camera-actions-spacer" />
          </div>
          <p className="camera-label">영수증 촬영</p>
          <span className="home-indicator" />
        </div>
      </section>
    </main>
  );
}
