import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus = 'starting' | 'ready' | 'denied' | 'unavailable';
// torch는 표준 타입에 아직 없다. 안드로이드 크롬 등 일부 브라우저만 지원한다.
type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };

const MAX_SIDE = 1600;

/** 후면 카메라 미리보기와 촬영. 화면을 벗어나면 카메라를 끈다. */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [status, setStatus] = useState<CameraStatus>('starting');
  const [torch, setTorch] = useState({ supported: false, on: false });

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) { setStatus('unavailable'); return; }
    let stream: MediaStream | undefined;
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(async media => {
        stream = media;
        if (cancelled) { media.getTracks().forEach(track => track.stop()); return; }
        const [track] = media.getVideoTracks();
        trackRef.current = track;
        setTorch({ supported: Boolean((track.getCapabilities?.() as TorchCapabilities | undefined)?.torch), on: false });
        const video = videoRef.current;
        if (video) { video.srcObject = media; await video.play().catch(() => undefined); }
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatus(error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError') ? 'denied' : 'unavailable');
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach(track => track.stop());
      trackRef.current = null;
    };
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = trackRef.current;
    if (!track || !torch.supported) return;
    const on = !torch.on;
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      setTorch({ supported: true, on });
    } catch { setTorch({ supported: false, on: false }); }
  }, [torch]);

  /** 현재 프레임을 OCR에 보낼 JPEG(base64)로 만든다. */
  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    return toJpegBase64(video, video.videoWidth, video.videoHeight);
  }, []);

  return { videoRef, status, torch, toggleTorch, capture };
}

export async function fileToJpegBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try { return toJpegBase64(bitmap, bitmap.width, bitmap.height); }
  finally { bitmap.close(); }
}

// 긴 변을 1600px 이하로 줄이면 영수증 글씨는 충분히 읽히고 전송량은 크게 줄어든다.
function toJpegBase64(source: CanvasImageSource, width: number, height: number): string {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('이미지를 처리할 수 없어요.');
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}
