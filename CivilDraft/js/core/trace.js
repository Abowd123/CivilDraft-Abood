/* ═══ استنباط الجدران من الخربشة ═══
   حسابٌ محضٌ لا استشارة: يقرأ ضربات يدك ويعيد «خطّة» — مساراتٍ
   مقترحةً بأطوالها وزواياها وانحرافها عن الشبكة. لا يكتب في الحالة
   ولا يُنشئ جداراً: التطبيق أمرٌ صريح في tools/sketch.js بعد أن ترى
   الخطّة بالمليمتر.

   المراحل: تنظيف · تبسيط RDP · إسقاط القصير · مُدرَّج زوايا يستخرج
   دوران الشبكة السائد · قصّ الزوايا على مضاعفاته · دمج المتطابقات
   المتراكبة · حلّ الأركان (تقاطع محورين · عقدة · وصلة T).

   الأركان تُحَلّ بتقاطع المحورَين لا بمتوسّط النقاط: النقطة الناتجة
   تقع على محور كلٍّ منهما فتبقى الزاوية قائمةً بالضبط، ولا يُقاس
   انحرافٌ صامت. وحيث تعذّر ذلك يُستعمل القطب ويُبلَّغ الانحراف.

   دوال خالصة تُختبَر بلا متصفّح: node js/tests/trace.js            */
import {dist,lineX,nearOnSeg,bboxOf} from "./geom.js";
import {deg,D2R,R2D} from "./units.js";

const R=v=>Math.round(v);
const angOf=(a,b)=>deg(Math.atan2(b[1]-a[1],b[0]-a[0])*R2D);

/* الحدود تُشتقّ من حجم خربشتك نفسها — فلا رقمٌ سحريّ يفسد عند
   تغيير التكبير. وكلٌّ منها يُتجاوَز صراحةً من شريط الخيارات. */
/* حدٌّ أدنى مطلق لا يتبع قُطر الرسمة: خربشةٌ صغيرة (رقمٌ، إشارة) لها
   حجمٌ مادّيٌّ ثابتٌ تقريباً بصرف النظر عن اتساع اللوحة حولها، فحين
   تكبر الرسمة لا يجوز أن يكبر معها حدّ «هل هذه ضجيج؟» فيسمح لخربشةٍ
   صغيرة بالمرور. النسبيّ (أدناه) يبقى لضبط الرسومات الصغيرة جداً. */
const MIN_STROKE_ABS=800;
export function autoOpt(diag,opt){
 const d=Math.max(1000,+diag||10000);
 return Object.assign({
  eps      : Math.max(40, d*0.012),   /* تفاوت التبسيط */
  minSeg   : Math.max(200,d*0.050),   /* أقصر مسار يُقبَل */
  minStroke: Math.max(150,d*0.030,MIN_STROKE_ABS), /* أصغر ضربة ليست ضجيجاً */
  angTol   : 18,                      /* أقصى قصٍّ زاويّ */
  nodeTol  : Math.max(200,d*0.070),   /* تقارب الأطراف */
  offTol   : Math.max(150,d*0.045),   /* تقارب المتوازيات */
  gap      : Math.max(200,d*0.060)    /* فجوة الدمج على المحور */
 },opt||{});
}
/* ═══ التنظيف والتبسيط ═══ */
export function cleanStroke(P,tol){
 const T=Math.max(1,tol||8), o=[];
 (P||[]).forEach(p=>{
  if(!p||!isFinite(p[0])||!isFinite(p[1]))return;
  const q=o[o.length-1];
  const r=[R(p[0]),R(p[1])];
  if(q&&dist(q,r)<T)return;
  o.push(r);
 });
 return o;
}
/* Ramer–Douglas–Peucker — يحفظ الأركان ويُسقط الرجفة */
export function rdp(P,eps){
 if(!P||P.length<3)return (P||[]).slice();
 const keep=new Array(P.length).fill(false);
 keep[0]=keep[P.length-1]=true;
 const st=[[0,P.length-1]];
 let guard=0;
 while(st.length&&guard++<20000){
  const [i,j]=st.pop();
  if(j-i<2)continue;
  let bi=-1, bd=-1;
  for(let k=i+1;k<j;k++){
   const d=nearOnSeg(P[i],P[j],P[k][0],P[k][1]).d;
   if(d>bd){bd=d;bi=k}
  }
  if(bd>eps&&bi>0){keep[bi]=true; st.push([i,bi],[bi,j])}
 }
 return P.filter((p,i)=>keep[i]);
}
const mkSeg=(a,b,snapped,merged)=>({
 a:[R(a[0]),R(a[1])], b:[R(b[0]),R(b[1])],
 L:dist(a,b), ang:angOf(a,b),
 dev:0, snapped:snapped?1:0, merged:merged||1});

/* ═══ دوران الشبكة السائد ═══
   مُدرَّج بدرجةٍ واحدة موزونٌ بالطول، ثم متوسّطٌ موزون داخل النافذة
   ليعطي كسور الدرجة. الالتفاف حول ٩٠ محسوبٌ في الحالتين. */
export function gridAngle(segs){
 if(!segs||!segs.length)return 0;
 const B=new Array(90).fill(0);
 segs.forEach(s=>{B[R(s.ang)%90]+=s.L});
 let bi=0, bv=-1;
 for(let i=0;i<90;i++){
  let v=0;
  for(let d=-2;d<=2;d++)v+=B[(i+d+90)%90]*(3-Math.abs(d))/3;
  if(v>bv){bv=v;bi=i}
 }
 let w=0, m=0;
 segs.forEach(s=>{
  let d=(s.ang%90)-bi;
  while(d>45)d-=90;
  while(d<-45)d+=90;
  if(Math.abs(d)>4)return;
  w+=s.L; m+=s.L*d;
 });
 return ((bi+(w?m/w:0))%90+90)%90;
}
/* القصّ حول منتصف المسار: الطول والمركز محفوظان، الزاوية وحدها
   تُصحَّح — فلا يزحف مسارٌ عن موضع رسمك. */
export function snapAngles(segs,rot,tol){
 (segs||[]).forEach(s=>{
  let best=null, bd=1/0;
  for(let k=0;k<4;k++){
   const t=deg(rot+k*90);
   let d=Math.abs(t-s.ang);
   if(d>180)d=360-d;
   if(d<bd){bd=d;best=t}
  }
  s.dev=Math.round(bd*100)/100;
  if(bd>tol)return;                    /* حرّ — يُبلَّغ ولا يُقصّ */
  const mx=(s.a[0]+s.b[0])/2, my=(s.a[1]+s.b[1])/2;
  const ux=Math.cos(best*D2R), uy=Math.sin(best*D2R);
  s.a=[R(mx-ux*s.L/2), R(my-uy*s.L/2)];
  s.b=[R(mx+ux*s.L/2), R(my+uy*s.L/2)];
  s.ang=best; s.snapped=1; s.dev=0;
 });
 return segs;
}
/* ═══ دمج المتطابقات ═══
   الضربة المزدوجة على الجدار نفسه، والركن المرسوم مرّتين. يُعمَل على
   المقصوص وحده: الحرّ لا يُدمَج لأن زاويته غير موثوقة. */
function mergeGroup(arr,offTol,gap){
 const t=arr[0].ang;
 const u=[Math.cos(t*D2R),Math.sin(t*D2R)];
 const n=[-u[1],u[0]];
 const M=arr.map(s=>{
  const t0=u[0]*s.a[0]+u[1]*s.a[1];
  const t1=u[0]*s.b[0]+u[1]*s.b[1];
  return {L:s.L, off:n[0]*s.a[0]+n[1]*s.a[1],
   lo:Math.min(t0,t1), hi:Math.max(t0,t1)};
 });
 M.sort((p,q)=>p.off-q.off||p.lo-q.lo);
 const bins=[];
 M.forEach(m=>{
  const b=bins.find(x=>Math.abs(x.off-m.off)<=offTol);
  if(b){
   b.off=(b.off*b.w+m.off*m.L)/(b.w+m.L);
   b.w+=m.L; b.items.push(m);
  }else bins.push({off:m.off,w:m.L,items:[m]});
 });
 const out=[];
 bins.forEach(b=>{
  b.items.sort((p,q)=>p.lo-q.lo);
  let cur=null;
  b.items.forEach(m=>{
   if(cur&&m.lo-cur.hi<=gap){
    cur.hi=Math.max(cur.hi,m.hi); cur.n++; return;
   }
   if(cur)out.push(cur);
   cur={lo:m.lo,hi:m.hi,n:1};
  });
  if(cur)out.push(cur);
  out.forEach(c=>{if(c.off==null)c.off=b.off});
 });
 return out.map(c=>{
  const A=[c.off*n[0]+c.lo*u[0], c.off*n[1]+c.lo*u[1]];
  const B=[c.off*n[0]+c.hi*u[0], c.off*n[1]+c.hi*u[1]];
  const s=mkSeg(A,B,1,c.n);
  s.ang=t;
  return s;
 });
}
export function mergeCollinear(segs,offTol,gap){
 const free=(segs||[]).filter(s=>!s.snapped);
 const G=new Map();
 (segs||[]).filter(s=>s.snapped).forEach(s=>{
  const k=R(s.ang*2);                  /* نصف درجة */
  if(!G.has(k))G.set(k,[]);
  G.get(k).push(s);
 });
 let out=[];
 G.forEach(arr=>{out=out.concat(mergeGroup(arr,offTol,gap))});
 return out.concat(free);
}
/* ═══ حلّ الأركان ═══ */
export function joinNodes(segs,tol,ext){
 const E=[];
 (segs||[]).forEach((s,i)=>{
  E.push({i,k:"a",p:s.a}); E.push({i,k:"b",p:s.b});
 });
 const used=new Array(E.length).fill(false);
 const joined=new Array(E.length).fill(false);
 const stat={node:0,axis:0,tee:0};

 for(let i=0;i<E.length;i++){
  if(used[i])continue;
  const cl=[i]; used[i]=true;
  for(let j=i+1;j<E.length;j++){
   if(used[j]||E[j].i===E[i].i)continue;
   if(!cl.some(x=>dist(E[x].p,E[j].p)<=tol))continue;
   used[j]=true; cl.push(j);
  }
  if(cl.length<2)continue;
  let P=null;
  if(cl.length===2){
   const A=segs[E[cl[0]].i], B=segs[E[cl[1]].i];
   const par=(Math.abs(A.ang-B.ang)%180)<1;
   if(A.snapped&&B.snapped&&!par){
    const x=lineX(A.a,A.b,B.a,B.b);
    if(x&&dist(x,E[cl[0]].p)<=tol*2.5){P=x; stat.axis++}
   }
  }
  if(!P){
   P=[cl.reduce((s,x)=>s+E[x].p[0],0)/cl.length,
      cl.reduce((s,x)=>s+E[x].p[1],0)/cl.length];
   stat.node++;
  }
  const q=[R(P[0]),R(P[1])];
  cl.forEach(x=>{
   const s=segs[E[x].i];
   if(E[x].k==="a")s.a=q.slice(); else s.b=q.slice();
   E[x].p=q; joined[x]=true;
  });
 }
 /* وصلة T: طرفٌ وحيد يستند إلى جسم مسارٍ آخر */
 const EX=Math.max(1,ext||tol);
 E.forEach((e,x)=>{
  if(joined[x])return;
  const s=segs[e.i];
  let best=null, bd=tol;
  segs.forEach((o,j)=>{
   if(j===e.i)return;
   const par=(Math.abs(s.ang-o.ang)%180)<1;
   const r=nearOnSeg(o.a,o.b,e.p[0],e.p[1]);
   if(r.d>bd)return;
   let q=r.p;
   if(s.snapped&&o.snapped&&!par){
    const ix=lineX(s.a,s.b,o.a,o.b);
    if(ix&&nearOnSeg(o.a,o.b,ix[0],ix[1]).d<=EX
     &&dist(ix,e.p)<=tol)q=ix;
   }
   bd=r.d; best=q;
  });
  if(!best)return;
  const q=[R(best[0]),R(best[1])];
  if(e.k==="a")s.a=q; else s.b=q;
  e.p=q; stat.tee++;
 });
 return stat;
}
/* ═══ المدخل ═══ */
export function trace(strokes,opt){
 const raw=(strokes||[]).map(s=>cleanStroke(s,8))
  .filter(s=>s.length>1);
 const all=[];
 raw.forEach(s=>s.forEach(p=>all.push(p)));
 const bb=bboxOf(all);
 const diag=bb?Math.hypot(bb.x1-bb.x0,bb.y1-bb.y0):0;
 const O=autoOpt(diag,opt);
 const stat={strokes:raw.length,pts:all.length,
  noise:0,short:0,segs:0,free:0,merged:0,
  node:0,axis:0,tee:0,tiny:0};

 /* دوران الشبكة يُستخرَج من قِطَع RDP الخام (المُسقَط قصيرها فقط، بلا
    جسر) — عيّنةٌ كثيفة تُنصِّت الرجفة بالمتوسّط الموزون. الجسر أدناه
    يُبنى لاحقاً على هذا الدوران نفسه فلا يتأثّر برأيه الخاص. */
 let voteSegs=[];
 raw.forEach(P=>{
  const b=bboxOf(P);
  if(!b||Math.hypot(b.x1-b.x0,b.y1-b.y0)<O.minStroke)return;
  const Q=rdp(P,O.eps);
  for(let i=0;i<Q.length-1;i++){
   if(dist(Q[i],Q[i+1])<O.minSeg)continue;
   voteSegs.push(mkSeg(Q[i],Q[i+1],0,1));
  }
 });
 const rot=gridAngle(voteSegs);

 let segs=[];
 raw.forEach(P=>{
  const b=bboxOf(P);
  if(!b||Math.hypot(b.x1-b.x0,b.y1-b.y0)<O.minStroke){
   stat.noise++; return;
  }
  let Q=rdp(P,O.eps);
  /* اجسر رؤوس RDP الداخلية التي تُنتج قطعةً أقصر من minSeg بدل إسقاطها:
     رجفةٌ وسطية تقسم ضلعاً واحداً لا يجوز أن تكسر استمراريته. الطرفان
     (بداية الضربة ونهايتها) لا يُمسّان — القصّ يبقى داخلياً فقط. */
  let changed=true;
  while(changed&&Q.length>2){
   changed=false;
   for(let i=1;i<Q.length-1;i++){
    if(dist(Q[i-1],Q[i])<O.minSeg||dist(Q[i],Q[i+1])<O.minSeg){
     stat.short++;
     Q=Q.slice(0,i).concat(Q.slice(i+1));
     changed=true; break;
    }
   }
  }
  for(let i=0;i<Q.length-1;i++){
   const L=dist(Q[i],Q[i+1]);
   if(L<O.minSeg){stat.short++; continue}
   segs.push(mkSeg(Q[i],Q[i+1],0,1));
  }
 });
 snapAngles(segs,rot,O.angTol);
 const before=segs.length;
 segs=mergeCollinear(segs,O.offTol,O.gap);
 stat.merged=Math.max(0,before-segs.length);
 const js=joinNodes(segs,O.nodeTol,O.gap);
 stat.node=js.node; stat.axis=js.axis; stat.tee=js.tee;

 /* إعادة القياس بعد اللحم، ثم إسقاط ما تلاشى */
 segs.forEach(s=>{
  s.L=dist(s.a,s.b);
  s.ang=angOf(s.a,s.b);
  let bd=1/0;
  for(let k=0;k<4;k++){
   let d=Math.abs(deg(rot+k*90)-s.ang);
   if(d>180)d=360-d;
   if(d<bd)bd=d;
  }
  s.dev=Math.round(bd*100)/100;
 });
 /* المقصوص على الشبكة زاويته موثوقة فيكفيه حدٌّ أدنى صغير بعد اللحم؛
    الحرّ غير المقصوص لم يثبت انتماءه لمحورٍ فيبقى محكوماً بـ minSeg كاملاً */
 const keep=segs.filter(s=>s.L>=(s.snapped?Math.min(O.minSeg,200):O.minSeg));
 stat.tiny=segs.length-keep.length;
 stat.segs=keep.length;
 stat.free=keep.filter(s=>!s.snapped).length;
 keep.sort((p,q)=>q.L-p.L);
 return {segs:keep, rot, stat, opt:O, bbox:bboxOf(all)};
}
/* ═══ المعايرة ═══
   الخربشة بلا مقياس. تُعطي طولاً تعرفه لأطول مسار فتُضرَب الخطّة
   كلّها حول مركزها — تحويلٌ متشابه واحد، لا تعديلٌ متفرّق. */
export function scalePlan(segs,k,c){
 const K=+k||1;
 if(!(K>0)||Math.abs(K-1)<1e-9)return segs;
 const P=[];
 (segs||[]).forEach(s=>{P.push(s.a); P.push(s.b)});
 const b=bboxOf(P);
 const o=c||(b?[(b.x0+b.x1)/2,(b.y0+b.y1)/2]:[0,0]);
 const M=p=>[R(o[0]+(p[0]-o[0])*K), R(o[1]+(p[1]-o[1])*K)];
 (segs||[]).forEach(s=>{
  s.a=M(s.a); s.b=M(s.b);
  s.L=dist(s.a,s.b);
 });
 return segs;
}
export const snapPts=(segs,step)=>{
 const st=Math.max(1,step||1);
 let mx=0;
 const Q=p=>{
  const q=[Math.round(p[0]/st)*st, Math.round(p[1]/st)*st];
  mx=Math.max(mx,dist(p,q));
  return q;
 };
 (segs||[]).forEach(s=>{
  s.a=Q(s.a); s.b=Q(s.b);
  s.L=dist(s.a,s.b);
  s.ang=angOf(s.a,s.b);
 });
 return R(mx);
};
export const planSay=P=>{
 const t=P.stat;
 return `${t.segs} مساراً من ${t.strokes} ضربة`
  +` · دوران الشبكة ${P.rot.toFixed(2)}°`
  +(t.free?` · ${t.free} حرّاً لم يُقصّ`:"")
  +(t.merged?` · دُمج ${t.merged}`:"")
  +(t.short?` · تُخطّي ${t.short} قصيراً`:"")
  +(t.noise?` · ${t.noise} ضربة ضجيج`:"")
  +(t.tiny?` · تلاشى ${t.tiny} باللحم`:"");
};
export const cornerSay=P=>
 `الأركان: ${P.stat.axis} تقاطع محورَين · ${P.stat.node} عقدة`
 +` · ${P.stat.tee} وصلة T`;
