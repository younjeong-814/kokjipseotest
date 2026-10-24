// Dashboard's single-file editor deployment. No env files or Vite app config are loaded.
import {build} from 'vite';
import {mkdirSync,writeFileSync} from 'node:fs';
mkdirSync('supabase/bundles',{recursive:true});
for(const name of ['recipes','ocr','recognize']){
  const result=await build({configFile:false,envFile:false,logLevel:'error',build:{write:false,minify:false,target:'es2022',ssr:`supabase/functions/${name}/index.ts`,rollupOptions:{output:{format:'es'}}}});
  const outputs=(Array.isArray(result)?result:[result]).flatMap(r=>r.output);
  const entry=outputs.find(o=>o.type==='chunk'&&o.isEntry);
  if(!entry||!entry.code.includes('Deno.serve'))throw new Error(`Invalid Edge bundle: ${name}`);
  writeFileSync(`supabase/bundles/${name}.ts`,'// Generated deployment bundle. Secrets are read from Deno.env at runtime.\n'+entry.code);
}
console.log('Three single-file Edge bundles generated without loading env files.');
