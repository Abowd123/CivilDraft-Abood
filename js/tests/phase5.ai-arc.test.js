/* ═══ المرحلة 5 — القوس في مسار الذكاء ═══
   يغلق الفجوة المعلنة: ops.js كانت ترفض bulge صراحةً (لا مفتاح في
   ALLOWED_KEYS ولا تصديق له)، فتتحوّل كتلة الجدار القوسي إلى جدارٍ
   قوسيٍّ حقيقيٍّ يمرّ عبر بنّائي النواة نفسها — لا تمديد جانبي ولا
   تجاهل صامت. */
import "./harness.js";
import {S,DEF,loadState,edit} from "../core/state.js";
import {ALLOWED_KEYS,validate,applyOps,contextOf} from "../ai/ops.js";
import {blockOps,BLOCKS} from "../ai/smartblocks.js";
import {isArc,arcParams,wallLen} from "../core/walls.js";

let PASS=0, FAIL=0;
const chk=(n,f)=>{try{f();PASS++;console.log("  ✓ "+n)}
 catch(e){FAIL++;console.error("  ✗ "+n+"\n    "+((e&&e.message)||e))}};
const ok=(c,m)=>{if(!c)throw new Error(m||"شرطٌ خاطئ")};
const eq=(a,b,m)=>{const A=JSON.stringify(a),B=JSON.stringify(b);
 if(A!==B)throw new Error((m||"")+"\nمتوقّع: "+B+"\nفعلي: "+A)};

console.log("═ phase5.ai-arc.test.js ═");

chk("ALLOWED_KEYS.wall يتضمن bulge",
 ()=>ok(ALLOWED_KEYS.wall.includes("bulge")));

chk("validate: bulge صحيح يمرّ إلى ok",()=>{
 const r=validate([{op:"wall",a:[0,0],b:[4,0],t:0.2,
  type:"ext",align:"c",bulge:0.5}]);
 eq(r.bad.length,0); eq(r.ok.length,1);
 ok(Math.abs(r.ok[0].bulge-0.5)<1e-9);
});

chk("validate: bulge فوق المدى مرفوض",()=>{
 const r=validate([{op:"wall",a:[0,0],b:[4,0],bulge:9}]);
 ok(r.bad.length===1&&r.bad[0].why.includes("bulge"));
});

chk("validate: bulge غير رقمي مرفوض",()=>{
 const r=validate([{op:"wall",a:[0,0],b:[4,0],bulge:"abc"}]);
 ok(r.bad.length===1);
});

chk("applyOps: ينشئ جداراً قوسياً حقيقياً لا ساكناً",()=>{
 loadState(DEF(),true);
 edit(()=>applyOps([{op:"wall",a:[0,0],b:[4,0],t:0.2,
  type:"ext",align:"c",bulge:0.5}],{atomic:1}));
 ok(S.walls.length===1);
 const w=S.walls[0];
 ok(isArc(w),"ليس قوساً — إهمالٌ صامت للـbulge");
 const P=arcParams(w);
 ok(P&&Math.abs(P.R-2500)<1,`نصف القطر ${P&&P.R}`);
 ok(wallLen(w)>4000,"طول القوس لا يزيد عن الوتر");
});

chk("blockOps(\"arcWall\"): يبني عملية wall بbulge",()=>{
 const b=blockOps("arcWall",[0,0],{L:4,bulge:0.5,t:0.2});
 ok(b.ops&&b.ops.length===1);
 eq(b.ops[0].op,"wall");
 ok(Math.abs(b.ops[0].bulge-0.5)<1e-9);
});

chk("blockOps(\"arcWall\"): bulge صفر يرفض بلا بناء",()=>{
 const b=blockOps("arcWall",[0,0],{L:4,bulge:0});
 eq(b.ops.length,0); ok(!!b.error);
});

chk("BLOCKS.arcWall مسجّل للعرض",()=>ok(!!BLOCKS.arcWall));

chk("contextOf ينقل bulge للجدار القوسي القائم",()=>{
 loadState(DEF(),true);
 edit(()=>applyOps([{op:"wall",a:[0,0],b:[4,0],t:0.2,
  type:"ext",align:"c",bulge:0.5}],{atomic:1}));
 const c=contextOf({walls:1,opens:0,areas:0});
 ok(c.walls.length===1&&Math.abs(c.walls[0].bulge-0.5)<1e-4);
});

console.log(`\n${PASS} نجح · ${FAIL} فشل —`);
if(FAIL)process.exitCode=1;
