/* ═══ العرض الثلاثي — الواجهة ═══
   الرياضيات في core/proj3d.js والنموذج في core/model3d.js (كلاهما يُختبَر
   بلا DOM). هنا النافذة فقط: قماشٌ بسحبٍ للتدوير وعجلةٍ للتقريب، ولا
   يُكتَب في المشروع شيء — العرض قراءةٌ محضة، لا يدخل التاريخ.
   لا onclick ولا style مضمَّن (CSP): الربط addEventListener والأنماط من
   css/view3d.css. كل نصٍّ من المشروع يمرّ بـesc. */
import {trapFocus} from "./focustrap.js";
import {escapeHtml as esc} from "../core/escape.js";
import {S} from "../core/state.js";
import {levelTag} from "../core/level.js";
import {build3d} from "../core/model3d.js";
import {project,facing,faceDepth,fitCam,shade} from "../core/proj3d.js";
import {defTool,H} from "../tools/registry.js";

const D=Math.PI/180;
const PRESETS={
 axo:{yaw:-35*D, pitch:55*D, n:"أكسونومتري"},
 top:{yaw:0,     pitch:90*D, n:"علويّ"},
 front:{yaw:0,   pitch:8*D,  n:"أماميّ"},
 side:{yaw:-90*D,pitch:8*D,  n:"جانبيّ"}
};
/* لون كل صنفٍ RGB — يُظلَّل بحسب اتجاه الوجه */
const BASE={wall:[201,209,220], col:[176,190,214], slab:[128,140,158],
 roof:[196,120,96]};

let box=null, st=null, raf=0;

export const view3dOpen=()=>!!box;
export function close3d(){
 if(typeof window!=="undefined")window.removeEventListener("resize",onResize);
 if(raf){cancelAnimationFrame(raf); raf=0}
 /* P5-004: يُحرَّر قبل إزالة الصندوق — فيعود التركيزُ إلى ما كان */
 if(release3d){try{release3d()}catch(e){} release3d=null}
 if(box){box.remove(); box=null}
 st=null;
 if(typeof document!=="undefined")
  document.removeEventListener("keydown",onKey,true);
}
let release3d=null;
const onKey=e=>{
 if(!st)return;
 if(e.key==="Escape"){e.stopPropagation(); close3d(); return}
 const t=e.target;
 if(t&&/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName))return;
 const k={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[e.key];
 if(k){
  e.preventDefault();
  st.cam.yaw+=k[0]*5*D;
  st.cam.pitch=Math.min(90*D,Math.max(0,st.cam.pitch+k[1]*5*D));
  refit(); sched();
 }
};

function modelFor(level){
 return build3d(S,{level});
}

function toolbar(m){
 const lv=`<option value="all">كل الطوابق</option>`
  +m.levels.map(L=>`<option value="${L}">${esc(levelTag(L))}</option>`).join("");
 const pre=Object.keys(PRESETS).map(k=>
  `<button type="button" data-pre="${k}">${esc(PRESETS[k].n)}</button>`).join("");
 return `<div class="v3-bar">`
  +`<label>الطابق <select data-v3="level">${lv}</select></label>`
  +`<span class="v3-grp">${pre}</span>`
  +`<span class="v3-grp">`
  +`<button type="button" data-v3="zin" aria-label="تقريب">+</button>`
  +`<button type="button" data-v3="zout" aria-label="تبعيد">−</button>`
  +`<button type="button" data-v3="fit">ملاءمة</button></span></div>`;
}

export function open3d(){
 const m=modelFor("all");
 if(!m.faces.length){
  H.rep("wr","لا شيء لعرضه ثلاثياً — ارسم جدراناً أو أعمدةً أو أسقفاً أولاً");
  return false;
 }
 close3d();
 box=document.createElement("div");
 box.className="v3";
 box.setAttribute("role","dialog");
 box.setAttribute("aria-modal","true");
 box.setAttribute("aria-label","العرض الثلاثي");
 box.setAttribute("dir","rtl");
 box.innerHTML=`<div class="v3-h"><h3>العرض الثلاثي</h3>`
  +`<button type="button" class="v3-x" data-v3="close" aria-label="إغلاق">×</button></div>`
  +toolbar(m)
  +`<div class="v3-cv"><canvas tabindex="0" aria-label="مجسّم المبنى: اسحب للتدوير وحرّك العجلة للتقريب"></canvas></div>`
  +`<div class="v3-info" data-v3="info" role="status"></div>`;
 document.body.appendChild(box);
 document.addEventListener("keydown",onKey,true);

 const cv=box.querySelector("canvas");
 st={cv, m, level:"all", cam:{yaw:PRESETS.axo.yaw,pitch:PRESETS.axo.pitch,
  scale:1,ox:0,oy:0}, drag:null, zoom:1};
 wire();
 resize();
 refit();
 info();
 sched();
 cv.focus();
 /* P5-004: الحصرُ بعد الإضافة، والبدايةُ على القماش (لوحةُ الأسهم) */
 release3d=trapFocus(box,{onEsc:close3d,initial:cv});
 return true;
}

function info(){
 const el=box&&box.querySelector("[data-v3=info]");
 if(!el)return;
 const c={};
 st.m.faces.forEach(f=>{c[f.kind]=(c[f.kind]||0)+1});
 const nm={wall:"جدار",col:"عمود",slab:"بلاطة",roof:"سقف"};
 const kinds=Object.keys(c).map(k=>`${nm[k]||k}`).join(" · ");
 el.textContent=`${st.m.faces.length} وجهاً${kinds?` — ${kinds}`:""}`
  +(st.m.truncated?` — قُطع ${st.m.truncated} وجهاً لبلوغ الحدّ`:"")
  +(st.m.arcSolid?` — ${st.m.arcSolid} جداراً قوسياً بفتحاتٍ يُرسَم مصمتاً`:"")
  +(st.m.roofFlat?` — ${st.m.roofFlat} سقفاً مائلاً غير مستطيل يُرسَم مسطّحاً`:"");
}

function resize(){
 const cv=st.cv, r=cv.parentNode.getBoundingClientRect();
 const dpr=Math.min(2,window.devicePixelRatio||1);
 const w=Math.max(200,Math.round(r.width)), h=Math.max(160,Math.round(r.height));
 cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr);
 st.w=w; st.h=h; st.dpr=dpr;
}
function refit(){
 if(!st)return;
 const f=fitCam(st.m.pts,st.cam,st.w,st.h,28);
 st.base=f;
 st.cam.scale=f.scale*st.zoom;
 /* التقريب حول مركز اللوحة */
 st.cam.ox=st.w/2+(f.ox-st.w/2)*st.zoom;
 st.cam.oy=st.h/2+(f.oy-st.h/2)*st.zoom;
}
function sched(){
 if(raf||!st)return;
 raf=requestAnimationFrame(()=>{raf=0; if(st)paint()});
}

function bg(){
 const v=getComputedStyle(document.documentElement).getPropertyValue("--bg4");
 return (v&&v.trim())||"#0d1016";
}

function paint(){
 const {cv,cam,m,w,h,dpr}=st;
 const g=cv.getContext("2d");
 g.setTransform(dpr,0,0,dpr,0,0);
 g.fillStyle=bg();
 g.fillRect(0,0,w,h);
 const vis=[];
 for(const f of m.faces){
  if(facing(f.n,cam)<=1e-6)continue;                    /* الأوجه الخلفية */
  vis.push({f,d:faceDepth(f.pts,cam)});
 }
 vis.sort((a,b)=>b.d-a.d);                               /* الأبعد أولاً */
 g.lineJoin="round";
 for(const {f} of vis){
  const c=BASE[f.kind]||BASE.wall;
  const k=shade(f.n);
  g.fillStyle=`rgb(${Math.round(c[0]*k)},${Math.round(c[1]*k)},${Math.round(c[2]*k)})`;
  g.strokeStyle="rgba(10,14,22,.55)";
  g.lineWidth=1;
  g.beginPath();
  f.pts.forEach((p,i)=>{
   const q=project(p,cam);
   const x=cam.ox+q.sx*cam.scale, y=cam.oy-q.sy*cam.scale;
   if(i)g.lineTo(x,y); else g.moveTo(x,y);
  });
  g.closePath(); g.fill(); g.stroke();
 }
 drawAxes(g);
}

/* بوصلةٌ صغيرة: اتجاها X (شرق) وY (شمال المخطّط) بحسب الدوران الحاليّ */
function drawAxes(g){
 const {cam}=st, ox=34, oy=st.h-34, L=22;
 const ax=[[1,0,0,"x"],[0,1,0,"y"]];
 g.lineWidth=2; g.font="12px sans-serif"; g.textAlign="center";
 g.textBaseline="middle";
 ax.forEach(([x,y,z,t])=>{
  const q=project([x,y,z],{yaw:cam.yaw,pitch:cam.pitch});
  const ex=ox+q.sx*L, ey=oy-q.sy*L;
  g.strokeStyle=t==="x"?"#e0806a":"#7ab8e0";
  g.fillStyle=g.strokeStyle;
  g.beginPath(); g.moveTo(ox,oy); g.lineTo(ex,ey); g.stroke();
  g.fillText(t.toUpperCase(),ox+q.sx*(L+9),oy-q.sy*(L+9));
 });
}

function setPreset(k){
 const p=PRESETS[k]; if(!p)return;
 st.cam.yaw=p.yaw; st.cam.pitch=p.pitch; st.zoom=1;
 refit(); sched();
}
function setZoom(z){
 st.zoom=Math.min(20,Math.max(0.2,z));
 refit(); sched();
}
function setLevel(v){
 st.level=v;
 st.m=modelFor(v);
 st.zoom=1; refit(); info(); sched();
}

function wire(){
 box.addEventListener("click",e=>{
  const p=e.target.closest&&e.target.closest("[data-pre]");
  if(p){setPreset(p.dataset.pre); return}
  const t=e.target.closest&&e.target.closest("[data-v3]");
  if(!t)return;
  const a=t.dataset.v3;
  if(a==="close")close3d();
  else if(a==="zin")setZoom(st.zoom*1.25);
  else if(a==="zout")setZoom(st.zoom/1.25);
  else if(a==="fit"){st.zoom=1; refit(); sched()}
 });
 box.addEventListener("change",e=>{
  const t=e.target;
  if(t&&t.dataset&&t.dataset.v3==="level")setLevel(t.value);
 });
 const cv=st.cv;
 cv.addEventListener("pointerdown",e=>{
  st.drag={x:e.clientX,y:e.clientY};
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
 });
 cv.addEventListener("pointermove",e=>{
  if(!st||!st.drag)return;
  const dx=e.clientX-st.drag.x, dy=e.clientY-st.drag.y;
  st.drag.x=e.clientX; st.drag.y=e.clientY;
  st.cam.yaw+=dx*0.008;
  st.cam.pitch=Math.min(90*D,Math.max(0,st.cam.pitch+dy*0.006));
  refit(); sched();
 });
 /* P5-014: التحريرُ صريحٌ، والفقدانُ يُنظِّف — لا سحبٌ معلَّق */
 const end=e=>{
  if(st)st.drag=null;
  try{
   if(e&&cv.releasePointerCapture&&cv.hasPointerCapture
      &&cv.hasPointerCapture(e.pointerId))
    cv.releasePointerCapture(e.pointerId);
  }catch(_){}
 };
 cv.addEventListener("pointerup",end);
 cv.addEventListener("pointercancel",end);
 cv.addEventListener("lostpointercapture",()=>{if(st)st.drag=null});
 cv.addEventListener("wheel",e=>{
  e.preventDefault();
  setZoom(st.zoom*(e.deltaY<0?1.1:1/1.1));
 },{passive:false});
 window.addEventListener("resize",onResize);
}
function onResize(){
 if(!st){window.removeEventListener("resize",onResize); return}
 resize(); refit(); sched();
}

defTool({
 id:"view3d", alias:"3d axo iso مجسم ثلاثي عرض_ثلاثي اكسونومتري",
 label:"العرض الثلاثي",
 hint:"مجسّمٌ أكسونومتريّ للمبنى: اسحب للتدوير وحرّك العجلة للتقريب",
 ico:"grid", own:1, nojr:1, noplan:1,
 start(){ open3d(); return false; }
});
