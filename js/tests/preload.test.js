/* index.html يحمل modulepreload لكل وحدةٍ في رسم استيراد app.js — بطء
   الشلّال على الهاتف كان يُسقط الإقلاع. الإصلاح: node serving/gen-preload.js */
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import path from "node:path";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const r=spawnSync(process.execPath,["serving/gen-preload.js","--check"],{cwd:root,encoding:"utf8"});
if(r.status!==0){console.error(r.stderr||r.stdout);process.exit(1)}
console.log("✓ preload متزامن مع رسم الاستيراد");
