#!/usr/bin/env node
/* مُطلِقٌ لـscripts/gen-file-icon.py — يجرّب python3 ثم python ثم py -3
   (على ويندوز كثيراً ما يكون python3 مجرّد وسيطٍ لمتجر مايكروسوفت).
   يلزم Pillow:  pip install pillow */
import {spawnSync} from "node:child_process";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";

const py=join(dirname(fileURLToPath(import.meta.url)),"gen-file-icon.py");
for(const [cmd,pre] of [["python3",[]],["python",[]],["py",["-3"]]]){
 const r=spawnSync(cmd,[...pre,py],{stdio:"inherit"});
 if(!r.error&&r.status===0)process.exit(0);
}
console.error("تعذّر التشغيل: يلزم Python 3 مع Pillow (pip install pillow).");
process.exit(1);
