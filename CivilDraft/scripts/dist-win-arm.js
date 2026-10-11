#!/usr/bin/env node
/* ═══ بناءُ ويندوز arm64 (اختياريّ) ═══  npm run dist:win:arm
   لا يمسّ dist:win (x64). السببان لسكربتٍ بدل سطرٍ في package.json:
   1) إعدادُ electron-builder.yml يثبّت arch:[x64] في كل هدف، والإعدادُ الصريح يغلب
      علمَ --arm64؛ فنمرّر أسماءَ الأهداف على سطر الأوامر (nsis portable) فيُقدَّم علينا.
   2) أسماءُ الملفّات تحمل «-arm64» فلا يكتب الناتجُ فوق ملفّات x64 في release/،
      و${version} تمرّ حرفيةً (بلا قشرة) فتعمل على ويندوز ولينكس سواءً.
   تُمرَّر بقيّةُ الوسائط إلى electron-builder:  npm run dist:win:arm -- --publish never */
import {existsSync,readFileSync} from "node:fs";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..");

export function armArgs(extra=[]){
 return ["--win","nsis","portable","--arm64",
  "--config.nsis.artifactName=CivilDraft-Setup-${version}-arm64.${ext}",
  "--config.portable.artifactName=CivilDraft-${version}-portable-arm64.${ext}",
  ...extra];
}
function cli(){
 const pj=join(ROOT,"node_modules","electron-builder","package.json");
 if(!existsSync(pj))return null;
 const meta=JSON.parse(readFileSync(pj,"utf8"));
 const bin=typeof meta.bin==="string"?meta.bin:meta.bin&&meta.bin["electron-builder"];
 return bin?join(dirname(pj),bin):null;
}
const isMain=process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1];
if(isMain){
 const c=cli();
 if(!c){console.error("electron-builder غير مثبّت — شغّل: npm install");process.exit(1)}
 if(!existsSync(join(ROOT,"dist","index.html"))){
  console.error("لا dist/index.html — شغّل عبر: npm run dist:win:arm (يبني dist أولاً)");
  process.exit(1);
 }
 const r=spawnSync(process.execPath,[c,...armArgs(process.argv.slice(2))],
  {cwd:ROOT,stdio:"inherit"});
 if(r.error){console.error(r.error.message);process.exit(1)}
 process.exit(r.status===null?1:r.status);
}
