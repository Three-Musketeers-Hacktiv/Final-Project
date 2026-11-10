import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.ts')&&!p.endsWith('.d.ts')&&!p.endsWith('.test.ts')){let out=ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;out=out.replace(/(from\s+["'])(\.[^"']+)(["'])/g,(_,a,b,c)=>a+b+'.mjs'+c);fs.writeFileSync(p.replace(/\.ts$/,'.mjs'),out);}}}
walk(path.join(root,'src/game'));walk(path.join(root,'tests/game-engine/helpers'));walk(path.join(root,'tests/game-engine/fixtures'));walk(path.join(root,'tests/game-engine/simulation'));
const {runPairedSample,writePairedReport}=await import('./tests/game-engine/simulation/pairedRepair.mjs');
const {runHardEval,writeHardReport}=await import('./tests/game-engine/simulation/hardEval.mjs');
const paired=runPairedSample();writePairedReport(paired);const hard=runHardEval();writeHardReport(hard);
for(const difficulty of ['normal','hard'])for(const strategy of ['attack','defense','economy','balanced','skip'])for(const repair of ['off','below80']){const r=paired.filter(x=>x.difficulty===difficulty&&x.strategy===strategy&&x.repair===repair);if(r.length)console.log(JSON.stringify({difficulty,strategy,repair,n:r.length,wins:r.filter(x=>x.phase==='victory').length}));}
console.log('hard-eval',hard.length,hard.filter(x=>x.phase==='victory').length);
const previous=JSON.parse(fs.readFileSync(path.join(root,'tests/game-engine/reports/balance-visual-2026-11-10/data-summary.json'),'utf8'));
const samePaired=JSON.stringify(paired)===JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'original-paired.json'),'utf8')).rows);
const sameHard=JSON.stringify(hard)===JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'original-hard.json'),'utf8')).rows);
console.log(JSON.stringify({samePaired,sameHard}));

