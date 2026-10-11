/* ═══ مكتبة الكتل الذكية البارامترية ═══
   كل كتلة تصف كيف تُبنى (جدران + منطقة اختيارية)، وتمرّ عبر نفس
   مدقِّق مسار المزوّد (validate/applyOps في ops.js) — فلا فرق بين
   ما يُدرجه المستخدم من هنا وما يقترحه المزوّد؛ كلاهما يمرّان
   بالحرس نفسه (EDGE وMINW ورفض التراكب...).

   الأبواب حالةٌ خاصّة: عملية "open" تحتاج معرّف جدارٍ قائم (مثل
   W7)، والمعرّف لا يُعرَف إلا بعد إدراج الجدار فعلياً. لذا يجري
   الإدراج كلُّه في معاملة edit() واحدة: تُدرَج الجدران، ثم يُقرأ
   معرّف الجدار المُدرَج من نتيجتها فيُبنى عليه الفتح ويُدرَج في
   المعاملة نفسها. رُفض الباب (EDGE مثلاً) ⇒ يرمي فيرجع edit()
   الجدرانَ أيضاً: لا «أربعة جدران بلا باب» (بند 80/104). خطوةُ
   تراجعٍ واحدة للكتلة كلّها.

   ⚠ العملياتُ تُغذَّى إلى applyOps خاماً بالمتر — لا مخرَج
   validate().ok (بالمليمتر): كان تمريرُه يُعيد تصديقه مترًا فتُدرَج
   الغرفة ٤ م بأبعاد ٤ كم وسماكة متر. */
import {validate} from "./ops.js";
import {runAtomic} from "./opsrun.js";

/* أدنى بُعدٍ لكتلةٍ بارامترية بالمتر — دونه لا يُبنى جدارٌ ولا فتحة */
const MIN_DIM=0.4;

/* دالة مساعدة لبناء جدران مستطيل. الجدار الأول (فهرس 0) هو الضلع
   الجنوبي من [x,y] إلى [x1,y] — وهو الذي تُفتَح فيه الأبواب.
   ضلعٌ طوله صفر لا يُدفَع (لا جدارَ بلا طول). */
function rect(org, w, h, {t=0.2, type="int", align="c"}={}) {
  const [x,y] = org, x1 = x+w, y1 = y+h;
  const edges = [
    [[x,y],[x1,y]], [[x1,y],[x1,y1]], [[x1,y1],[x,y1]], [[x,y1],[x,y]]
  ];
  return edges
    .filter(([a,b]) => Math.hypot(b[0]-a[0], b[1]-a[1]) > 0)
    .map(([a,b]) => ({op:"wall", a, b, t, type, align}));
}

export const BLOCKS = {
  room: { id: "room", label: "غرفة", cat:"معماري",
    params: {w:4, h:4, name:""}, def:{w:4, h:4, name:""},
    build(org, p) {
      const ops = rect(org, p.w, p.h, {t:0.2, type:"ext"});
      if (String(p.name).trim()) {
        ops.push({op:"area", at:[org[0]+p.w/2, org[1]+p.h/2], name:String(p.name).trim()});
      }
      return {ops};
    }
  },
  iconDoor: { id: "iconDoor", label: "غرفة بباب", cat:"معماري",
    params: {w:4, h:4, dX:0.9, dMin:0.6, name:"غرفة"}, def:{w:4, h:4, dX:0.9, dMin:0.6, name:"غرفة"},
    build(org, p) {
      const ops = rect(org, p.w, p.h, {t:0.2, type:"ext"});
      /* عرض الباب مضبوطٌ بين حدّ أدنى (dMin) وأقلّ قليلاً من طول
         الجدار الجنوبي (p.w) حتى لا يُرفَض لعدم كفاية الحافة (EDGE) */
      const doorW = Math.min(Math.max(+p.dX || 0.9, +p.dMin || 0.4), Math.max(0.4, p.w - 0.4));
      const door = {wallIndex: 0, at: p.w/2, w: doorW, kind: "door"};
      return {ops, door};
    }
  },
  bath: { id: "bath", label: "حمام صغير", cat:"معماري",
    params: {w:1.5, h:2}, def:{w:1.5, h:2},
    build(org, p) {
      const ops = rect(org, p.w, p.h, {t:0.15, type:"int"});
      ops.push({op:"area", at:[org[0]+p.w/2, org[1]+p.h/2], name:"حمام"});
      return {ops};
    }
  },
  kitchen: { id: "kitchen", label: "مطبخ", cat:"معماري",
    params: {w:3, h:2}, def:{w:3, h:2},
    build(org, p) {
      const ops = rect(org, p.w, p.h, {t:0.15, type:"int"});
      ops.push({op:"area", at:[org[0]+p.w/2, org[1]+p.h/2], name:"مطبخ"});
      return {ops};
    }
  },
  /* ═══ جدارٌ قوسي — المرحلة 5 (الذكاء) ═══
     كتلةٌ من ضلعٍ واحد لا مستطيل: L طولُ الوتر بالمتر، وbulge
     tan(θ/4) (مداه −8..8 كما في ops.js/addWall). تمرّ عبر
     validate/applyOps نفسِهما (op:"wall" ببساطة، مع bulge إضافياً)
     فتُدرَج جداراً قوسياً حقيقياً — لا مسارٍ جانبي. */
  arcWall: { id: "arcWall", label: "جدار قوسي", cat:"معماري",
    params: {L:4, bulge:0.5, t:0.2, type:"ext"},
    def: {L:4, bulge:0.5, t:0.2, type:"ext"},
    build(org, p) {
      const L=+p.L||4;
      if(!(L>=MIN_DIM)||!isFinite(L))
        return {ops:[], error:`طول الجدار القوسي دون ${MIN_DIM} م أو غير رقمي`};
      /* المعاملات مُدمَجةٌ بالفعل مع def (بما فيه bulge:0.5) قبل
         بلوغ build — فـ0 هنا صريحةٌ من المستخدم لا غيابٌ يستحق
         الافتراض. ||0.5 كان يبتلع الصفر الصريح فيصير 0.5 دوماً. */
      const bg=isFinite(+p.bulge)?Math.max(-8,Math.min(8,+p.bulge)):NaN;
      if(!isFinite(bg)||Math.abs(bg)<1e-6)
        return {ops:[], error:isFinite(bg)
          ?"bulge صفرٌ لا يبني قوساً":"bulge غير رقمي"};
      return {ops:[{op:"wall", a:org, b:[org[0]+L, org[1]],
        t:+p.t||0.2, type:p.type||"ext", align:"c", bulge:bg}]};
    }
  }
  /* لا كتلة لشبكة أعمدة: مفردات ops.js مغلقةٌ بقصد ولا تحوي عملية
     إنشاء عمود (field يُعدِّل عموداً قائماً فقط) — فأي كتلةٍ كهذه
     سترفض ١٠٠٪ من عملياتها. أُسقِطت بدل أن تعرض زراً لا يعمل. */
};

export const blockList = Object.values(BLOCKS)
  .map(b => ({id: b.id, label: b.label, cat: b.cat, params: b.params}));

/* يبني عمليات الكتلة دون تثبيت — للمعاينة أو للاستخدام من قِبل
   القوالب. يعيد {ops, door?, unknown?, error?}.
   الأبعاد تُفحَص هنا قبل البناء: w وh رقمان منتهيان ≥ MIN_DIM،
   وإلا {ops:[], error} — فلا تُبنى جدرانٌ لا تكفي فتحةً ولا سماكة. */
export function blockOps(blockId, org, params) {
  const b = BLOCKS[blockId];
  if (!b) return {ops:[], unknown: blockId};
  const v = (params && typeof params === "object") ? {...b.def, ...params} : b.def;
  if (!Array.isArray(org) || org.length !== 2
      || !org.every(n => typeof n === "number" && isFinite(n)))
    return {ops:[], error: "نقطة الأصل ليست [x,y] رقميّة"};
  if ("w" in v || "h" in v) {
    const w = +v.w, h = +v.h;
    if (!(w >= MIN_DIM) || !(h >= MIN_DIM) || !isFinite(w) || !isFinite(h))
      return {ops:[], error: `أبعاد الكتلة دون ${MIN_DIM} م أو غير رقميّة`};
  }
  return b.build(org, v);
}

export function placeBlock(blockId, org, params, {commit=false}={}) {
  const b = BLOCKS[blockId];
  if (!b) return {error: `كتلة غير معروفة: ${blockId}`, ops:[], valid:false};
  const built = blockOps(blockId, org, params);
  if (built.error)
    return {block: blockId, error: built.error, generated: 0, valid: 0,
      rejected: [{i:0, why: built.error}], committed: false};
  const ops = built.ops || [];
  const {ok, bad} = validate(ops);
  const report = {block: blockId, generated: ops.length, valid: ok.length, rejected: bad};
  if (!commit || !ok.length) return report;
  /* عمليةٌ مرفوضةٌ شكلاً ⇒ لا نبدأ: كلٌّ أو لا شيء */
  if (bad.length) {
    report.committed = false;
    report.error = `رُفضت ${bad.length} عملية — لم يُدرَج شيء`;
    return report;
  }

  /* معاملةٌ واحدة: الجدران + الباب (runAtomic — راجع opsrun.js).
     أيُّ رفضٍ يرمي فيرجع كلُّ شيء. */
  const r = runAtomic(`إدراج «${b.label}»`, apply => {
    const r1 = apply(ops);
    let r2 = null;
    if (built.door) {
      const wallIds = r1.made.filter(m => m.k === "wall").map(m => m.id);
      const wallId = wallIds[built.door.wallIndex];
      if (!wallId) throw new Error("الجدار المقصود للباب لم يُدرَج");
      r2 = apply([{op:"open", wall: wallId, at: built.door.at,
        kind: built.door.kind || "door", w: built.door.w}]);
    }
    return {r1, r2};
  });

  if (!r.ok) {
    report.committed = false;
    report.rolledBack = true;
    report.error = `لم يُدرَج شيء — ${r.error}`;
    if (built.door) report.doorRejected = [{i:0, why: r.error}];
    return report;
  }
  report.result = r.out.r1;
  report.committed = true;
  if (r.out.r2) report.doorResult = r.out.r2;
  return report;
}
