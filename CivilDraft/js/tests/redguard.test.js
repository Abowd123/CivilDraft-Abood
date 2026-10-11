/* ═══ حارس الاختبارات الحمراء ═══
   يشغّل js/tests/red/defects.red.js ويفرض ثلاثة أشياء:
     ١. كل مجموعة [Dnn] فيه لها تذكرةٌ في KNOWN-DEFECTS.md.
     ٢. كل تذكرةٍ في KNOWN-DEFECTS.md لها مجموعةٌ حمراء.
     ٣. كل مجموعةٍ ما زالت حمراء — أُصلح العيب؟ انقل اختباره إلى
        السويت الأخضر واحذف تذكرته، لا تتركه في المجلّد الأحمر.
   فلا يتحوّل «معروفٌ» إلى «منسيّ»، ولا يبقى اختبارٌ أخضر مدفوناً. */
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {group,ok,eq,summary} from "./harness.js";

const HERE=fileURLToPath(new URL(".",import.meta.url));
const ROOT=join(HERE,"..","..");
const strip=s=>s.replace(/\x1b\[[0-9;]*m/g,"");

const r=spawnSync(process.execPath,[join(HERE,"red","defects.red.js")],
 {encoding:"utf8",maxBuffer:32*1024*1024});
const groups=new Map();           /* id ⇒ {title, fails} */
let cur=null;
strip(r.stdout||"").split("\n").forEach(line=>{
 const m=/^▸ \[(D\d+)\]\s*(.*)$/.exec(line);
 if(m){cur={id:m[1],title:m[2],fails:0}; groups.set(m[1],cur); return}
 if(/^════ الحصيلة/.test(line))cur=null;
 if(cur&&/^\s+✗/.test(line))cur.fails++;
});
const md=readFileSync(join(ROOT,"KNOWN-DEFECTS.md"),"utf8");
const tickets=new Set([...md.matchAll(/^\|\s*(D\d+)\s*\|/gm)].map(m=>m[1]));

group("المجلّد الأحمر يعمل ويُنتج مجموعات",()=>{
 ok(r.status!==null,`الملفّ اكتمل (${groups.size} مجموعةً حمراء مُعلَنة)`);
 ok((r.status!==0)===(groups.size>0),
  "ويخرج بكودٍ غير صفريّ إن وُجد عيبٌ مفتوح، وبصفرٍ حين تفرغ القائمة");
});
group("لا عيبَ بلا تذكرة ولا تذكرةَ بلا اختبار",()=>{
 const noTicket=[...groups.keys()].filter(id=>!tickets.has(id));
 eq(noTicket.length,0,"كل مجموعةٍ حمراء لها سطرٌ في KNOWN-DEFECTS.md"+
  (noTicket.length?" — "+noTicket.join(" · "):""));
 const noTest=[...tickets].filter(id=>!groups.has(id));
 eq(noTest.length,0,"وكل تذكرةٍ لها مجموعةٌ في defects.red.js"+
  (noTest.length?" — "+noTest.join(" · "):""));
});
group("كل عيبٍ ما زال أحمر (الإصلاح يُنقَل لا يُترَك)",()=>{
 groups.forEach(g=>ok(g.fails>0,
  `[${g.id}] ما زال أحمر (${g.fails} إخفاق) — إن اخضرّ فانقل اختباره `+
  `إلى السويت الأخضر واحذف تذكرته`));
});
process.exit(summary()?1:0);
