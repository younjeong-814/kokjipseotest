import { groupRows, parseReceipt, type OcrWord, type ReceiptResult } from './parseReceipt';

// 개발·미리보기 서버의 /api/ocr(vite.config.ts)이 기본값이다. 배포 시 서버리스 함수 주소로 바꾼다.
const ENDPOINT = import.meta.env.VITE_OCR_ENDPOINT || '/api/ocr';

export async function recognizeReceipt(image: string): Promise<ReceiptResult> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image }) });
  } catch { throw new Error('네트워크에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.'); }
  const data = await response.json().catch(() => ({})) as { words?: OcrWord[]; error?: string };
  if (!response.ok || !Array.isArray(data.words)) throw new Error(data.error ?? '영수증을 읽지 못했어요. 다시 촬영해 주세요.');
  const result = parseReceipt(groupRows(data.words));
  if (!result.items.length) throw new Error('영수증에서 식재료를 찾지 못했어요. 영수증 전체가 선명하게 보이도록 다시 촬영해 주세요.');
  return result;
}
