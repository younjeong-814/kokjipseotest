import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function load(url){ const exports={}; const code=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText; new Function('exports','require',code)(exports,path=>load(new URL(`${path}.ts`,url)));return exports; }
const {buildDashboardReports}=load(new URL('../src/features/mypage/buildDashboardReports.ts',import.meta.url));
const {hasEnoughReportData}=load(new URL('../src/features/mypage/report.ts',import.meta.url));
test('dashboard reads disposal history across period boundaries and retains records without current items',()=>{
 const now=new Date(2026,9,21,12); const make=(action,date)=>({id:date,name:'재료',action,recordedAt:new Date(date).toISOString()});
 const history=[make('discarded','2026-10-20T10:00:00'),make('consumed','2026-10-19T00:00:00'),make('consumed','2026-10-21T11:00:00'),make('discarded','2026-10-18T23:59:59'),make('discarded','2026-09-30T10:00:00'),make('consumed','2026-10-22T10:00:00')];
 const before=JSON.stringify(history); const reports=buildDashboardReports([],history,now);
 assert.deepEqual(reports['주간'].discarded,{previous:1,current:1}); assert.equal(reports['주간'].consumed.current,2); assert.equal(reports['주간'].completedItemCount,3); assert.equal(hasEnoughReportData(reports['주간']),true);
 assert.equal(reports['월간'].discarded.current,2); assert.equal(reports['월간'].discarded.previous,1); assert.equal(reports['전체'].discarded.current,3); assert.equal(reports['전체'].discarded.previous,null);assert.equal(reports['주간'].score,null);assert.equal(reports['주간'].consumptionRate,67);assert.equal(JSON.stringify(history),before);
 assert.equal(hasEnoughReportData(buildDashboardReports([],history.slice(0,2),now)['주간']),false);
});

test('six registered items with two consumed, two discarded and two stored display 33 percent',()=>{
 const now=new Date(2026,9,21,12);
 const history=['consumed','consumed','discarded','discarded'].map((action,i)=>({id:`done-${i}`,name:'재료',action,recordedAt:now.toISOString()}));
 const items=[{id:'stored-1'},{id:'stored-2'}];
 const reports=buildDashboardReports(items,history,now);
 for(const period of ['주간','월간','전체']){assert.equal(reports[period].consumptionRate,33);assert.equal(reports[period].consumed.current,2);assert.equal(reports[period].discarded.current,2);assert.equal(reports[period].score,null);}
 assert.equal(buildDashboardReports([],[],now)['주간'].consumptionRate,null);
 assert.equal(buildDashboardReports(items,[],now)['주간'].consumptionRate,0);
 assert.equal(buildDashboardReports([],history.slice(0,2),now)['주간'].consumptionRate,100);
});
