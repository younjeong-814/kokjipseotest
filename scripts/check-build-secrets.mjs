import {readFileSync,readdirSync,existsSync} from 'node:fs';
const values={...process.env};
if(existsSync('.env.local'))for(const line of readFileSync('.env.local','utf8').split(/\r?\n/)){
  const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);if(m)values[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2');
}
const secrets=Object.entries(values).filter(([name,value])=>!name.startsWith('VITE_')&&/(?:API_KEY|SECRET|SERVICE_ROLE|PASSWORD)/.test(name)&&value&&value.length>=12);
function walk(path){for(const entry of readdirSync(path,{withFileTypes:true})){const file=`${path}/${entry.name}`;if(entry.isDirectory())walk(file);else if(/\.(js|css|html|json|map)$/.test(file)){const content=readFileSync(file,'utf8');for(const [name,value] of secrets)if(content.includes(value)||content.includes(encodeURIComponent(value)))throw new Error(`비밀 환경변수가 빌드에 포함됨: ${name}`)}}}
walk('dist');console.log('Build secret scan passed (values are never printed).');
