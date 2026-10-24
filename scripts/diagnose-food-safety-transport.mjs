// Read-only transport diagnostic. Never print keys, full URLs, response bodies, or headers.
import { loadEnv } from 'vite';
const env = loadEnv('development', '.', '');
const key = env.FOOD_SAFETY_API_KEY?.trim();
if (!key) {
  console.error('FOOD_SAFETY_API_KEY is missing from local environment.');
  process.exitCode = 1;
} else {
  for (const protocol of ['http:', 'https:']) {
    const url = new URL(`${protocol}//openapi.foodsafetykorea.go.kr/api/${encodeURIComponent(key)}/COOKRCP01/json/1/1`);
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        redirect: 'manual',
        headers: { Accept: 'application/json' },
      });
      const result = {
        protocol: protocol.slice(0, -1),
        status: response.status,
        contentType: response.headers.get('content-type')?.split(';')[0] ?? null,
        redirect: response.status >= 300 && response.status < 400,
        apiCode: null,
        rows: null,
        jsonValid: false,
      };
      if (response.ok) {
        try {
          const json = await response.json();
          result.jsonValid = true;
          const payload = json?.COOKRCP01 ?? json;
          result.apiCode = payload?.RESULT?.CODE ?? null;
          result.rows = Array.isArray(payload?.row) ? payload.row.length : null;
        } catch { /* Do not log provider response bodies. */ }
      }
      console.log(JSON.stringify(result));
    } catch (error) {
      const category = error?.name === 'TimeoutError' || error?.name === 'AbortError'
        ? 'timeout' : 'connection_or_tls_error';
      console.log(JSON.stringify({ protocol: protocol.slice(0, -1), error: category }));
    }
  }
}
