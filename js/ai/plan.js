/* ═══ الخطة والبوّابة ═══
   نصٌّ ⇒ سطور مفحوصة. البوّابة في الكود لا في التعليمات: التعليمات
   يمكن التحدّث حولها، والكود لا.

   وهي قائمةُ سماحٍ: ما لم يُعرَف لا يمرّ. وكان المجهول يمرّ بلا
   bad ثم يسقط عند feedText — أي أن المُثبِّت كان يحرس لا البوّابة،
   وهو عكس الترتيب المقصود. */
import {findTool,isDestruct} from "../tools/registry.js";
import {findById} from "../core/ents.js";
import {pickable} from "../core/layers.js";
import {norm} from "../core/units.js";
import {sanitizeExternal} from "../core/escape.js";

/* لا قائمةَ هنا: علَم destruct في تعريف الأداة نفسها، فلا تتخلّف
   قائمةٌ يدوية عن السجلّ. وكان الجدول القديم يفوته «نقل» و«دوران»
   و«مرآة» — وثلاثتها تحرّك ما هو مرسوم. */
const RX_PT=/^@?-?\d*\.?\d+([,x*]-?\d*\.?\d+|<-?\d+(\.\d+)?)?$/;
const RX_ANG=/^<-?\d+(\.\d+)?$/;
const RX_ID=/^[A-Za-z]+\d+(@-?\d*\.?\d+)?$/;
const RX_OPT=/^[A-Za-z][A-Za-z0-9]*=.*$/;

/* مفاتيح خيارات الخطوات المُعلَنة في الأداة — قائمة سماحٍ مشتقّة
   من التعريف نفسه، فلا جدول يدويّ يتخلّف عنه */
const stepOpts=d=>{
 const o=new Set();
 ((d&&d.steps)||[]).forEach(s=>
  Object.keys(s.opts||{}).forEach(k=>o.add(k)));
 return o;
};

/* ═══ استخراج الكتلة ═══
   كل السياجات، والموسومة plan أولى. وكان النمط غير الملزِم يطابق
   أوّلَ موضع، فكتلةُ json قبل الخطة تجعل سياج إغلاقها بدايةً —
   فيُقرأ الشرح النثري بوصفه خطّة. */
/* ═══ كتلةٌ واحدة — بند 37 ═══
   SYS تقول «كتلةً واحدةً» و«لا كلتيهما معاً»، والتعليماتُ لا تُنفِّذ
   نفسها: كتلتا plan تعنيان أن المزوّد أراد شيئين (والأولى وحدها
   كانت تُنفَّذ ساكتةً)، وplan مع ops تعني تنفيذين بعقدين. كلاهما
   يُرفَض هنا برسالةٍ، لا يُختار أحدُهما خلسة. الأسوار الأخرى
   (json مثلاً) لا تُحسَب: هي شرحٌ لا تنفيذ. تُنادى من الواجهة قبل
   اختيار المسار فلا يفترق ما يُقبَل عمّا يُعرَض. */
export function blockConflict(txt){
 const T=String(txt||"");
 const tags=[...T.matchAll(/```([A-Za-z]*)[ \t]*\r?\n([\s\S]*?)```/g)]
  .map(x=>x[1].toLowerCase());
 const np=tags.filter(t=>t==="plan").length;
 const no=tags.filter(t=>t==="ops").length;
 if(np>1)return "أكثر من كتلة plan — كتلةٌ واحدةٌ فقط";
 if(no>1)return "أكثر من كتلة ops — كتلةٌ واحدةٌ فقط";
 if(np&&no)return "كتلتا plan وops معاً — إحداهما فقط";
 return "";
}
export function extract(txt){
 const T=String(txt||"");
 const err=blockConflict(T);
 if(err)return {body:"",prose:sanitizeExternal(T.trim()),
  hasPlan:false,err};
 const all=[...T.matchAll(/```([A-Za-z]*)[ \t]*\r?\n([\s\S]*?)```/g)];
 const m=all.find(x=>x[1].toLowerCase()==="plan")||null;
 const body=m?m[2]:"";
 const prose=sanitizeExternal(m?T.replace(m[0],"").trim():T.trim());
 return {body,prose,hasPlan:!!m};
}
export function parsePlan(txt,allowDestruct,maxLines){
 const {body,prose,hasPlan,err}=extract(txt);
 const out={prose,hasPlan,lines:[],notes:[],errs:[],destruct:[]};
 if(err){
  /* الرفض يظهر للمستخدم سطراً مرفوضاً بسببه — لا «إجابةً» صامتة */
  out.hasPlan=true;
  out.errs.push(err);
  out.lines.push({i:1,s:"—",raw:"",kind:"text",note:"",bad:err});
  return out;
 }
 if(!hasPlan)return out;
 const raw=body.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 if(raw.length>(maxLines||200)){
  out.errs.push(`الخطة ${raw.length} سطراً — الحدّ `
   +`${maxLines||200}. اطلب تنفيذها على دفعات.`);
  return out;
 }
 let cur=null;
 raw.forEach((s0,i)=>{
  if(s0[0]==="#"){out.notes.push(s0.slice(1).trim()); return}
  /* التطبيع أوّلاً: ٨٫٠ و«8, 0» و«٨,٠» صيغٌ صحيحة يقبلها parsePt،
     وكانت تسقط هنا لأن \d لا يطابق الأرقام الهندية. والمطبَّع هو
     ما يُنفَّذ (run.trial يغذّي rec.s) فلا يفترق المفحوص عن
     المُغذّى. */
 const s=sanitizeExternal(norm(s0)).replace(/٫/g,".").replace(/\s*,\s*/g,",");
  const rec={i:out.lines.length+1,s,raw:s0,kind:"",note:"",bad:""};
  if(s==="."){rec.kind="enter"; rec.note="Enter"}
  else if(s==="esc"){rec.kind="esc"; rec.note="إلغاء"; cur=null}
  else if(RX_OPT.test(s)){rec.kind="opt"; rec.note="خيار"}
  else if(RX_ANG.test(s)){rec.kind="pt"; rec.note="قفل زاوية"}
  else if(RX_PT.test(s)){rec.kind="pt"; rec.note="إحداثي"}
  else if(RX_ID.test(s)){
   /* المعرّف يُطبَّع إلى الأحرف الكبيرة: ops.js تُخرجه كبيرة،
      والمستخدم أو المزوّد قد يكتبانه صغيرة — «w3» و«W3» العنصرُ
      نفسه. والمطبَّع هو ما يُعرَض ويُنفَّذ (rec.s) فلا يفترق
      المفحوصُ عن المُغذّى — مبدأ هذا الملف نفسه. */
   const at=s.includes("@")?s.slice(s.indexOf("@")):"";
   const id=s.split("@")[0].toUpperCase();
   const f=findById(id);
   if(f){
    rec.s=id+at; rec.kind="ent"; rec.note=`عنصر ${f.id}`;
    if(!pickable(f))rec.bad=`${f.id} مخفيّ أو مقفل`;
   }else{
    rec.kind="text";
    rec.bad=`لا عنصر بالمعرّف «${id}» — معرَّفٌ مُختلَق`;
   }
  }
  else{
   const d=findTool(s);
   if(d){
    cur=d;
    rec.kind="tool"; rec.tool=d.id; rec.note=d.label;
    /* أوامر الماكرو تُنفِّذ خططاً بنفسها: تداخلها داخل خطةٍ يعني معاينةً
       داخل معاينة. noplan علَمٌ في تعريف الأداة كما destruct. */
    if(d.noplan)rec.bad=`«${d.label}» لا يُنفَّذ من داخل خطة`;
    if(isDestruct(d)){
     rec.destruct=1;
     out.destruct.push(d.label);
     if(!allowDestruct)
      rec.bad=`«${d.label}» أمرٌ هادم ولم تُصرّح به`;
    }
   }else if(cur&&s.length===1&&stepOpts(cur).has(s)){
    /* حرفُ خيارٍ تُعلنه خطوةٌ في الأداة الجارية: C يغلق المضلّع
       و U يتراجع خطوة. يبقى قائمةَ سماح — الحرف الذي لا تُعلنه
       أداةٌ سابقة في الخطّة نفسها يُرفَض كما كان. */
    rec.kind="sopt"; rec.note=`خيار خطوة في ${cur.label}`;
   }else{
    rec.kind="text";
    rec.bad=`«${s0}» ليس إحداثياً ولا أداةً ولا معرّفاً`;
   }
  }
  if(rec.bad)out.errs.push(`السطر ${rec.i}: ${rec.bad}`);
  out.lines.push(rec);
 });
 return out;
}
export const planReady=p=>p.hasPlan&&p.lines.length&&!p.errs.length;
