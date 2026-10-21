import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function load(url){const exports={};new Function('exports','require',ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports,path=>load(new URL(`${path}.ts`,url)));return exports;}
const {consumeIngredient}=load(new URL('../src/features/ingredients/consumeIngredient.ts',import.meta.url));
const repo=load(new URL('../src/features/ingredients/repository.ts',import.meta.url));
const report=load(new URL('../src/features/report/weeklyReport.ts',import.meta.url));
function setup(){const map=new Map();let fail=null;return {getItem:key=>map.get(key)??null,setItem:(key,value)=>{if(key===fail)throw Error('quota');map.set(key,value);},fail:key=>{fail=key}};}
const draft={name:'테스트 두부',category:'두부·콩류',storage:'냉장',quantity:1,unit:'개',date:'2020-01-01'};
test('explicit consumption overrides expired/spoiled classification, removes only selected item and survives reload without duplicate completion',()=>{
 const db=setup();const [item]=repo.saveIngredient(db,draft);repo.recordIngredientCondition(db,item.id,'못 먹겠어요 (상했어요)');const [other]=repo.saveIngredient(db,{...draft,name:'다른 재료'});
 consumeIngredient(db,item.id); assert.deepEqual(repo.loadIngredients(db).map(i=>i.id),[other.id]);const history=report.loadHistory(db);assert.equal(history.length,1);assert.equal(history[0].action,'consumed');assert.equal(report.buildWeeklyReport(repo.loadIngredients(db),history).consumed,1);
 assert.throws(()=>consumeIngredient(db,item.id));assert.equal(report.loadHistory(db).length,1);
});
test('history storage failure keeps item; item storage failure rolls history back',()=>{
 for(const key of [repo.INGREDIENTS_KEY,report.REPORT_HISTORY_KEY]){const db=setup();const [item]=repo.saveIngredient(db,draft);report.recordDisposal(db,item,new Date(),'discarded');const original=db.getItem(report.REPORT_HISTORY_KEY);db.fail(key);assert.throws(()=>consumeIngredient(db,item.id));assert.equal(repo.loadIngredients(db).length,1);assert.equal(db.getItem(report.REPORT_HISTORY_KEY),original);}
});
