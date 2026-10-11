/* ═══ المرحلة B — واجهة المقارنة (6) ═══
   node js/tests/phaseB-ui.test.js
   الواجهة لا تُشغَّل في Node: نفحص (أ) دلالة مواضع السجلّ التي تستند إليها
   أزرار «⇄» فعلاً، و(ب) توصيل المصدر (الأزرار · Esc · المسح عند «جديد» ·
   الرسم خارج scene() · لا ألوان حرفية في canvas.js). */
import {shim,group,ok,eq,summary} from "./harness.js";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
shim();
const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..","..");
const rd=f=>readFileSync(join(ROOT,f),"utf8");
const {S,newState,ensureShape,snapshot,pushHistory,clearHistory,undo,
 historySnapshotAt,historyTotal}=await import("../core/state.js");
const W=await import("../core/walls.js");
const C=await import("../core/compare.js");

group("دلالة مواضع السجلّ: الموضع n = الحالة بعد n خطوة (ماضياً ومستقبلاً)",()=>{
 newState(); ensureShape(); clearHistory(); C.clearCompareBase();
 const step=(lbl,fn)=>{const b=snapshot(); fn(); pushHistory(b,lbl)};
 step("أ",()=>W.addWall([0,0],[3000,0],200,"ext","c"));
 step("ب",()=>W.addWall([0,500],[3000,500],200,"int","c"));
 step("ج",()=>W.addWall([0,900],[3000,900],200,"int","c"));
 eq(historyTotal(),3,"ثلاث خطوات");
 const n=p=>JSON.parse(historySnapshotAt(p)).walls.length;
 eq([0,1,2,3].map(n).join(),"0,1,2,3","كل موضعٍ يقرأ عدد جدرانه");
 /* تراجعان ⇒ الموضعان 2 و3 صارا مستقبلاً */
 undo(); undo();
 eq([0,1,2,3].map(n).join(),"0,1,2,3","المستقبل يُقرأ بلا تنفيذ");
 eq(S.walls.length,1,"القراءة لم تحرّك الحالة");
 eq(historySnapshotAt(99)!==null,true,"موضعٌ خارج المدى يُقصّ");
});

group("المقارنة عبر السجلّ: تفرّق الجاري عن الخطوة",()=>{
 newState(); ensureShape(); clearHistory(); C.clearCompareBase();
 const b0=snapshot(); W.addWall([0,0],[3000,0],200,"ext","c"); pushHistory(b0,"أ");
 const b1=snapshot(); const w2=W.addWall([0,500],[3000,500],200,"int","c"); pushHistory(b1,"ب");
 C.setCompareBase(JSON.parse(historySnapshotAt(1)));
 const d=C.diff(JSON.parse(historySnapshotAt(1)));
 eq(d.added.filter(x=>x.coll==="walls").map(x=>x.id).join(),w2.id,"الجدار الثاني مضاف");
 eq(C.diffShapes().added.length,1,"شكلٌ واحد للمضاف");
 C.clearCompareBase();
 eq(C.compareActive(),false,"المسح ينهيها");
});

group("توصيل المصدر",()=>{
 const hp=rd("js/ui/historypanel.js"), cv=rd("js/ui/canvas.js"),
  km=rd("js/ui/keymap.js"), pr=rd("js/ui/props.js"), th=rd("js/ui/theme.js");
 ok(/data-cmp="\$\{a\}"/.test(hp)&&/data-cmp="0"/.test(hp),"زر ⇄ لكل خطوة ولـ«البداية»");
 ok(/data-act="cmpclear"[^>]*>مسح المقارنة</.test(hp),"زر «مسح المقارنة»");
 ok(/historySnapshotAt/.test(hp.split("from \"../core/state.js\"")[0]),"historySnapshotAt مستورد");
 ok(!/[^.]\bsetTimeout\(/.test(hp),"بلا مؤقّتات");
 ok(/endCompareIfActive/.test(km)&&/Escape"&&endCompareIfActive/.test(km),"Esc ينهي المقارنة");
 ok(/clearCompareBase\(\); newState\(\)/.test(pr),"«مشروع جديد» يمسح المقارنة");
 ok(/drawEnds\(\);\s*drawCompare\(\);[^\n]*\n\s*drawPre\(\)/.test(cv),"drawCompare بعد drawEnds وقبل drawPre");
 ok(!/#[0-9a-fA-F]{6}/.test(cv.split("function drawCompare")[1].split("function drawGrips")[0]),
  "لا ألوان حرفية داخل drawCompare");
 ok(/compareAdd/.test(th)&&/compareDel/.test(th)&&/compareChg/.test(th),"ألوان المقارنة في theme.js");
 ok(!/compare/.test(rd("js/core/render.js")),"render.js لا يعرف المقارنة (خارج المشهد بنيةً)");
});

process.exit(summary()?1:0);
