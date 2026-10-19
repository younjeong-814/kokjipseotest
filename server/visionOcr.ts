// Google Vision OCR 프록시. API 키는 서버에만 두고 브라우저에는 단어와 좌표만 돌려준다.
// Vite 개발·미리보기 서버에서 사용하며, 배포 시에는 같은 함수를 서버리스 함수에서 호출하면 된다.
import type { IncomingMessage, ServerResponse } from 'node:http';

export type OcrWord = { text: string; box: [number, number, number, number] };

type Vertex = { x?: number; y?: number };
type VisionResponse = {
  responses?: { textAnnotations?: { description?: string; boundingPoly?: { vertices?: Vertex[] } }[]; error?: { message?: string } }[];
  error?: { message?: string };
};

const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';
const MAX_BODY = 8 * 1024 * 1024;

export async function annotateImage(apiKey: string, image: string): Promise<OcrWord[]> {
  const response = await fetch(`${VISION_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ image: { content: image }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }], imageContext: { languageHints: ['ko'] } }] }),
  });
  const data = await response.json() as VisionResponse;
  const result = data.responses?.[0];
  const message = data.error?.message ?? result?.error?.message;
  if (!response.ok || message) throw new Error(message ?? `Vision API ${response.status}`);
  // 0번은 전체 텍스트이고 1번부터 단어별 결과다.
  return (result?.textAnnotations ?? []).slice(1).flatMap(annotation => {
    const vertices = annotation.boundingPoly?.vertices ?? [];
    if (!annotation.description || !vertices.length) return [];
    const xs = vertices.map(vertex => vertex.x ?? 0);
    const ys = vertices.map(vertex => vertex.y ?? 0);
    return [{ text: annotation.description, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] as OcrWord['box'] }];
  });
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
      if (body.length > MAX_BODY) { req.destroy(); reject(new Error('too large')); }
    });
    req.on('end', () => resolve(body));
    req.on('error', () => reject(new Error('read failed')));
  });
}

export function visionOcrMiddleware(apiKey: string | undefined) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const send = (status: number, body: object) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'POST') return send(405, { error: 'POST만 지원해요.' });
    if (!apiKey) return send(500, { error: 'GOOGLE_VISION_API_KEY가 설정되지 않았어요.' });
    let image: unknown;
    try { image = (JSON.parse(await readBody(req)) as { image?: unknown }).image; }
    catch { return send(400, { error: '이미지를 읽을 수 없어요.' }); }
    if (typeof image !== 'string' || !image) return send(400, { error: '이미지가 없어요.' });
    try { send(200, { words: await annotateImage(apiKey, image) }); }
    catch (error) {
      console.error('[vision-ocr]', error);
      send(502, { error: '문자 인식 서버에 연결하지 못했어요.' });
    }
  };
}
