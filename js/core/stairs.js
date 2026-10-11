/* ═══ الدرج — B1: رحلات + بسطة ═══
   الأصل المخزَّن: type ("straight" | "L" | "U") و flights=[{a,b,n}].
     straight  رحلة واحدة
     L         رحلتان: a→b ثم b→c، والبسطة مربّعة عند المنعطف b
     U         رحلتان متعاكستان: a→b ثم c→d، والبسطة مستطيلة تصل نهايتيهما
   لكل رحلة هندستها المستقلّة. القياسات تُحسَب وتُعرَض ولا تُصحَّح:
   القائمة والنائمة و2ق+ن تُفحَص هنا وفي inspect.js فتُنبّه ولا تعدّل n
   ولا الطول.
   القائمة واحدة لكل الدرج: ارتفاع الدور ÷ مجموع قوائم الرحلات.
   والدرج القديم (a,b,n) يُرحَّل إلى flights داخل ensureShape. */
import {S,touchView,txtH} from "./state.js";
import {V} from "./validate.js";
import {newId,clamp,R2D,deg,m3,ltr,rng3} from "./units.js";
import {dist,pip,bboxOf,bboxUnion} from "./geom.js";
import {normLevel} from "./level.js";

const R=v=>Math.round(v);
export const stById=id=>S.stairs.find(s=>s.id===id)||null;
export const SMIN_W=600, SMIN_L=600;

/* المدى المريح — يُقاس ولا يُفرَض */
export const RISE_OK=[150,200];
export const TREAD_MIN=250;
export const RULE_OK=[580,650];        /* 2ق + ن */

export const ST_TYPES=["straight","L","U"];
export const stType=st=>(st&&(st.type==="L"||st.type==="U"))?st.type:"straight";

/* ═══ هندسة الرحلات ═══ */
function flightGeom(f,w,H,totalN){
 if(!f||!f.a||!f.b)return null;
 const dx=f.b[0]-f.a[0], dy=f.b[1]-f.a[1];
 const L=Math.hypot(dx,dy);
 if(L<1)return null;
 const ux=dx/L, uy=dy/L, nx=-uy, ny=ux;
 const hw=Math.max(SMIN_W,w)/2;
 const n=clamp(R(f.n)||2,2,80);
 const treads=n-1;                     /* آخر قائمة تصل البسطة */
 const tread=L/treads;
 const rise=H/totalN;
 const a=f.a;
 const P=(s,v)=>[R(a[0]+ux*s+nx*v), R(a[1]+uy*s+ny*v)];
 return {L,ux,uy,nx,ny,hw,n,treads,tread,rise,H,P,a:f.a,b:f.b,
  ang:deg(Math.atan2(uy,ux)*R2D)};
}
const stH=st=>Math.max(200,+st.h||S.meta.wallH);
const totN=st=>st.flights.reduce((s,f)=>s+clamp(R(f&&f.n)||2,2,80),0);

/* هندسة كل الرحلات الصالحة بالترتيب */
export function stGeoms(st){
 if(!st||!Array.isArray(st.flights)||!st.flights.length)return [];
 const w=st.w||1000, H=stH(st), N=totN(st);
 return st.flights.map(f=>flightGeom(f,w,H,N)).filter(Boolean);
}
/* الرحلة الأولى — تُبقي عقد الدرج المستقيم كما كان */
export function stGeom(st){
 const gs=stGeoms(st);
 return gs[0]||null;
}

/* ═══ البسطة ═══
   L: مربّعٌ بعرض الدرج مركزُه المنعطف.
   U: مستطيلٌ يبدأ من نهاية الرحلة 1 بعمق d ويغطّي عرضَي الرحلتين
      جانبياً — فلا تبقى فجوةٌ مهما تباعدت الرحلتان. */
export function landingPoly(st){
 if(!st||!st.landing||!Array.isArray(st.flights)||st.flights.length<2)
  return null;
 const gs=stGeoms(st);
 if(gs.length<2)return null;
 const g1=gs[0], g2=gs[1];
 const t=stType(st);
 if(t==="L"){
  const c=g1.b, hw=g1.hw;
  const P=(s,v)=>[R(c[0]+g1.ux*s+g1.nx*v), R(c[1]+g1.uy*s+g1.ny*v)];
  return [P(hw,hw),P(hw,-hw),P(-hw,-hw),P(-hw,hw)];
 }
 /* U */
 const d=clamp(R(+st.landing.d||g1.hw*2),SMIN_W,6000);
 const vc=(g2.a[0]-g1.a[0])*g1.nx+(g2.a[1]-g1.a[1])*g1.ny;
 const lo=Math.min(-g1.hw,vc-g2.hw), hi=Math.max(g1.hw,vc+g2.hw);
 return [g1.P(g1.L,lo),g1.P(g1.L+d,lo),g1.P(g1.L+d,hi),g1.P(g1.L,hi)];
}

/* مضلّع الرحلة الأولى — للدرج المستقيم هو المحيط كلُّه */
export const stPoly=st=>{
 const g=stGeom(st);
 if(!g)return null;
 return [g.P(0,-g.hw),g.P(g.L,-g.hw),g.P(g.L,g.hw),g.P(0,g.hw)];
};
/* كل المضلّعات: الرحلات ثم البسطة */
export function stPolys(st){
 const out=stGeoms(st).map(g=>
  [g.P(0,-g.hw),g.P(g.L,-g.hw),g.P(g.L,g.hw),g.P(0,g.hw)]);
 const lp=landingPoly(st);
 if(lp)out.push(lp);
 return out;
}
export const stBBox=st=>{
 let b=null;
 stPolys(st).forEach(p=>{b=bboxUnion(b,bboxOf(p))});
 return b;
};
/* المحيط الخارجي: الغلاف المحدَّب لكل الرؤوس (المستقيم = مضلّعه) */
export function stOutline(st){
 if(stType(st)==="straight")return stPoly(st);
 const pts=[];
 stPolys(st).forEach(p=>p.forEach(q=>pts.push(q)));
 if(pts.length<3)return null;
 pts.sort((p,q)=>p[0]-q[0]||p[1]-q[1]);
 const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const lo=[], up=[];
 pts.forEach(p=>{
  while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();
  lo.push(p);
 });
 for(let i=pts.length-1;i>=0;i--){
  const p=pts[i];
  while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();
  up.push(p);
 }
 lo.pop(); up.pop();
 return lo.concat(up);
}
export const stAt=(x,y)=>{
 for(const s of S.stairs){
  for(const p of stPolys(s)){
   if(p&&pip(p,x,y))return s;
  }
 }
 return null;
};

/* ═══ الإنشاء ═══ */
const cl6=w=>clamp(R(w||1000),SMIN_W,6000);
const mk=(type,w,flights,ex)=>{
 const st={id:newId("S"),type,w:cl6(w),flights,
  level:normLevel(S.meta.level),
  up:(ex&&ex.up==="dn")?"dn":"up",
  cut:0};
 if(type!=="straight")st.landing={w:st.w,d:st.w};
 if(ex){
  if(ex.h)st.h=clamp(R(ex.h),200,8000);
  if(ex.cut!=null&&type==="straight")st.cut=clamp(+ex.cut||0,0,0.95);
 }
 S.stairs.push(st); touchView();
 return st;
};
const pt=p=>[R(p[0]),R(p[1])];

export function addStair(a,b,w,n,ex){
 V("stair",{a,b,w,n});               /* 2.3 */
 const A=pt(a), B=pt(b);
 const L=dist(A,B);
 if(L<SMIN_L)
  throw new Error(`طول القِلعة ${m3(L)} م — الأدنى ${m3(SMIN_L)} م`);
 return mk("straight",w,[{a:A,b:B,n:clamp(R(n)||12,2,80)}],ex);
}
/* L: a→b ثم b→c */
export function addStairL(a,b,c,w,n1,n2,ex){
 V("stair",{a,b,w,n:n1});
 V("stair",{a:b,b:c,w,n:n2});
 const A=pt(a), B=pt(b), C=pt(c);
 if(dist(A,B)<SMIN_L||dist(B,C)<SMIN_L)
  throw new Error(`إحدى الرحلتين أقصر من ${m3(SMIN_L)} م`);
 return mk("L",w,[{a:A,b:B,n:clamp(R(n1)||6,2,80)},
  {a:pt(B),b:C,n:clamp(R(n2)||6,2,80)}],ex);
}
/* U: a→b ثم c→d متوازيتان متعاكستان */
export function addStairU(a,b,c,d,w,n1,n2,ex){
 V("stair",{a,b,w,n:n1});
 V("stair",{a:c,b:d,w,n:n2});
 const A=pt(a), B=pt(b), C=pt(c), D=pt(d);
 if(dist(A,B)<SMIN_L||dist(C,D)<SMIN_L)
  throw new Error(`إحدى الرحلتين أقصر من ${m3(SMIN_L)} م`);
 return mk("U",w,[{a:A,b:B,n:clamp(R(n1)||6,2,80)},
  {a:C,b:D,n:clamp(R(n2)||6,2,80)}],ex);
}
export function delStair(st){
 const i=S.stairs.indexOf(st);
 if(i<0)return false;
 S.stairs.splice(i,1); touchView();
 return true;
}

/* ═══ الفحص — يقيس ولا يعدّل ═══ */
export function stCheck(st){
 const gs=stGeoms(st);
 if(!gs.length)return {ok:0,msgs:["قِلعة صفرية الطول"],
  rise:0,tread:0,rule:0,n:0,treads:0};
 const m=[], multi=gs.length>1;
 const rise=gs[0].rise, N=gs.reduce((s,g)=>s+g.n,0);
 if(rise<RISE_OK[0]||rise>RISE_OK[1])
  m.push(`القائمة ${m3(rise)} م خارج المدى المريح `
   +`${rng3(RISE_OK[0],RISE_OK[1],"م")}`);
 gs.forEach((g,i)=>{
  const pre=multi?`رحلة ${i+1}: `:"";
  const rule=2*rise+g.tread;
  if(g.tread<TREAD_MIN)
   m.push(`${pre}النائمة ${m3(g.tread)} م أقلّ من ${m3(TREAD_MIN)} م`);
  if(rule<RULE_OK[0]||rule>RULE_OK[1])
   m.push(`${pre}قاعدة 2ق+ن = ${m3(rule)} م خارج `
    +`${rng3(RULE_OK[0],RULE_OK[1],"م")}`);
 });
 if(stType(st)==="U"&&gs.length>1){
  const g1=gs[0], g2=gs[1];
  const vc=Math.abs((g2.a[0]-g1.a[0])*g1.nx+(g2.a[1]-g1.a[1])*g1.ny);
  if(vc<st.w-1)
   m.push(`الرحلتان متداخلتان: البُعد بين محوريهما ${m3(vc)} م `
    +`وعرض الدرج ${m3(st.w)} م`);
 }
 if(st.w<900)
  m.push(`العرض ${m3(st.w)} م أقلّ من 0.900 م`);
 const rule0=2*rise+gs[0].tread;
 return {ok:m.length?0:1, msgs:m,
  rise, tread:gs[0].tread, rule:rule0, n:N,
  treads:gs.reduce((s,g)=>s+g.treads,0)};
}

/* ═══ الأوّليات ═══
   خطّ القطع (للمستقيم): ما بعده يُرسَم متقطّعاً — الطابق الأعلى لا يظهر
   مصمَّتاً. في L وU يُهمَل (cut=0 عند الإنشاء). */
export function stPrims(st){
 const gs=stGeoms(st);
 if(!gs.length)return [];
 const L="A-STRS", out=[], h=txtH();
 const dash=[h*1.5,h*0.9];
 const t=stType(st);
 const push=(a,b,beyond)=>out.push(beyond
  ? {t:"line",L,a,b,dash,sid:st.id}
  : {t:"line",L,a,b,sid:st.id});
 gs.forEach((g,fi)=>{
  const P=g.P;
  const cut=(t==="straight"&&st.cut>0.02)?g.L*st.cut:0;
  /* الجانبان */
  [-g.hw,g.hw].forEach(v=>{
   if(cut){
    push(P(0,v),P(cut,v),0);
    push(P(cut,v),P(g.L,v),1);
   }else push(P(0,v),P(g.L,v),0);
  });
  /* النائمات */
  for(let i=0;i<=g.treads;i++){
   const s=g.tread*i;
   push(P(s,-g.hw),P(s,g.hw),(cut&&s>cut)?1:0);
  }
  /* خطّ القطع: شرطتان مائلتان */
  if(cut){
   const d=g.hw*0.30, k=g.hw*0.34;
   out.push({t:"line",L,sid:st.id,
    a:P(cut-d,-g.hw*1.15), b:P(cut+d,g.hw*1.15)});
   out.push({t:"line",L,sid:st.id,
    a:P(cut-d+k,-g.hw*1.15), b:P(cut+d+k,g.hw*1.15)});
  }
 });
 /* البسطة */
 const lp=landingPoly(st);
 if(lp)out.push({t:"poly",L,pts:lp,cl:1,sid:st.id});

 /* سهم الاتجاه على محور السير */
 const g0=gs[0], gN=gs[gs.length-1];
 if(gs.length===1){
  const cut=(st.cut>0.02)?g0.L*st.cut:0;
  const s0=g0.tread*0.55;
  const s1=(cut?cut:g0.L)-g0.tread*0.55;
  if(s1>s0+h){
   const A=(st.up==="up")?g0.P(s0,0):g0.P(s1,0);
   const B=(st.up==="up")?g0.P(s1,0):g0.P(s0,0);
   arrow(out,L,st,A,B,h,1);
  }
 }else{
  /* مسارٌ واحد: محور الرحلة 1 ← وصلة البسطة ← محور الرحلة 2 */
  const A=g0.P(g0.tread*0.55,0), M1=g0.P(g0.L,0);
  const M2=gN.P(0,0), B=gN.P(gN.L-gN.tread*0.55,0);
  const path=[A,M1,M2,B].filter((p,i,a)=>!i||p[0]!==a[i-1][0]||p[1]!==a[i-1][1]);
  const pts=(st.up==="up")?path:path.slice().reverse();
  for(let i=0;i<pts.length-1;i++)
   out.push({t:"line",L,a:pts[i],b:pts[i+1],sid:st.id});
  if(pts.length>1)
   arrow(out,L,st,pts[pts.length-2],pts[pts.length-1],h,0);
 }
 /* البطاقة */
 let rot=g0.ang;
 if(rot>90.001&&rot<=270)rot=deg(rot+180);
 const m=g0.P(g0.L/2, g0.hw+h*0.45);
 out.push({t:"text",L,sid:st.id,
  s:ltr(`${gs.reduce((s,g)=>s+g.n,0)} × ${m3(g0.rise)} = ${m3(g0.H)}`)+` م  `
   +(t!=="straight"?`(${t}) `:"")
   +`${st.up==="up"?"صاعد":"هابط"}`,
  x:m[0],y:m[1],h:h*0.9,al:"bc",rot});
 return out;
}
/* رأس السهم عند B باتجاه A→B — والدائرة عند A للمستقيم فقط */
function arrow(out,L,st,A,B,h,circle){
 if(circle)out.push({t:"line",L,a:A,b:B,sid:st.id});
 const dx=B[0]-A[0], dy=B[1]-A[1], D=Math.hypot(dx,dy)||1;
 const ux=dx/D, uy=dy/D, nx=-uy, ny=ux, k=h*0.62;
 out.push({t:"poly",L,cl:1,sid:st.id,pts:[[B[0],B[1]],
  [R(B[0]-ux*k*1.9+nx*k*0.44),R(B[1]-uy*k*1.9+ny*k*0.44)],
  [R(B[0]-ux*k*1.9-nx*k*0.44),R(B[1]-uy*k*1.9-ny*k*0.44)]]});
 if(circle)out.push({t:"arc",L,cx:A[0],cy:A[1],r:R(h*0.28),
  a0:0,a1:359.9,sid:st.id});
}
export const stLabel=st=>{
 const c=stCheck(st), t=stType(st);
 return `${c.n} قائمة · ق ${m3(c.rise)} · ن ${m3(c.tread)} م`
  +(t!=="straight"?` · ${t}`:"");
};
