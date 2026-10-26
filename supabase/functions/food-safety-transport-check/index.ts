// Read-only transport diagnostic. Never return keys, URLs, bodies, or authentication headers.
Deno.serve(async(request:Request)=>{
 if(request.method!=='GET')return Response.json({error:'GET only'},{status:405});
 const raw=Deno.env.get('FOOD_SAFETY_API_KEY')??'',key=raw.trim();
 const probes=[{protocol:'http',key:'invalid',end:1,label:'invalid-http'},{protocol:'https',key:'invalid',end:1,label:'invalid-https'},...key?[{protocol:'https',key,end:1,label:'configured-https-one'},{protocol:'https',key,end:1000,label:'configured-https-thousand'}]:[]];
 const results=[];
 for(const p of probes){try{
  const r=await fetch(`${p.protocol}://openapi.foodsafetykorea.go.kr/api/${encodeURIComponent(p.key)}/COOKRCP01/json/1/${p.end}`,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json'}});
  const out={label:p.label,status:r.status,contentType:r.headers.get('content-type')?.split(';')[0]??null,apiCode:null as string|null,rows:null as number|null};
  if(r.ok){const j=await r.json().catch(()=>null);const payload=j?.COOKRCP01;const code=payload?.RESULT?.CODE;out.apiCode=typeof code==='string'&&/^[A-Z0-9-]{1,30}$/.test(code)?code:null;out.rows=Array.isArray(payload?.row)?payload.row.length:null;}else await r.body?.cancel();results.push(out);
 }catch{results.push({label:p.label,error:'connection_or_timeout'});}}
 return Response.json({keyPresent:!!key,keyLength:key.length,outerWhitespace:raw!==key,hex20:/^[a-f0-9]{20}$/i.test(key),results},{headers:{'Cache-Control':'no-store'}});
});
