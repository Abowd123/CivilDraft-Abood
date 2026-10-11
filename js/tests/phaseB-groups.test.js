/* ═══ المرحلة B — المجموعات GRP (1–4) ═══
   node js/tests/phaseB-groups.test.js */
import {shim,group,ok,eq,throws,summary} from "./harness.js";
shim();
const {S,newState,ensureShape,snapshot,pack,loadState,COLL_KIND,KIND_COLL,
 stateVer,touch,pushHistory,historySnapshotAt,historyTotal,undo,clearHistory}=
 await import("../core/state.js");
const {LIM}=await import("../core/limits.js");
const {V}=await import("../core/validate.js");
const W=await import("../core/walls.js");
const CL=await import("../core/cols.js");
const G=await import("../core/groups.js");
const MOD=await import("../core/modify.js");
const ENTS=await import("../core/ents.js");
const OP=await import("../core/opens.js");
const reset=()=>{newState(); ensureShape(); clearHistory()};
const mk=()=>{
 const w1=W.addWall([0,0],[4000,0],200,"int","c");
 const w2=W.addWall([0,0],[0,3000],200,"int","c");
 const c1=CL.addCol("rect",[1000,1000],400,400,0,"conc","C");
 return {w1,w2,c1,m:[{k:"wall",id:w1.id},{k:"wall",id:w2.id},{k:"col",id:c1.id}]};
};

group("الأساس: LIM · V · COLL_KIND",()=>{
 ok(Object.isFrozen(LIM.groups)&&LIM.groups.max===500,"LIM.groups");
 ok(Object.isFrozen(LIM.groupMembers)&&LIM.groupMembers.max===60000,"LIM.groupMembers");
 const v=V("group",{name:"س",members:[{k:"wall",id:"W1"},{k:"col",id:"K1"}]});
 eq(v.members.length,2,"عضوان صالحان");
 throws(()=>V("group",{name:"س",members:[{k:"wall"}]}),null,"عضو بلا id");
 throws(()=>V("group",{name:"س",members:["x"]}),null,"عضو ليس كائناً");
 throws(()=>V("group",{name:"س",members:5}),null,"ليست مصفوفة");
 Object.entries(COLL_KIND).forEach(([c,k])=>{
  ok(ENTS.entDef(k)&&ENTS.entDef(k).coll===c,`COLL_KIND: ${c}↔${k} يطابق entreg`);
  eq(KIND_COLL[k],c,`KIND_COLL[${k}]`);
 });
 reset(); const a=stateVer(); touch(); ok(stateVer()>a,"stateVer يزيد مع touch");
 ok(Array.isArray(S.groups)&&pack().groups===S.groups,"groups في DEF وKEYS");
});

group("groupAdd والتوسيع",()=>{
 reset(); const {w1,w2,c1,m}=mk();
 throws(()=>G.groupAdd("",m),null,"اسمٌ فارغ");
 throws(()=>G.groupAdd("x",[m[0]]),null,"عضو واحد");
 const g=G.groupAdd("زمرة",m);
 ok(/^GR\d+$/.test(g.id),"المعرّف بسابقة GR"); eq(g.members.length,3,"ثلاثة أعضاء");
 ok(G.groupById(g.id)===g&&G.groupByName("زمرة")===g,"byId/byName");
 eq(G.groupMembers(g).length,3,"كلهم قابلون للتحديد");
 eq(G.groupAdd("زمرة",m).members.length,3,"إعادة الاسم لا تكرّر الأعضاء");
 eq(S.groups.length,1,"مجموعة واحدة");
 eq(G.expandGroups([{k:"wall",id:w1.id}]).length,3,"عضو يجرّ مجموعته");
 eq(G.expandGroups([{k:"wall",id:w1.id},{k:"col",id:c1.id}]).length,3,"بلا تكرار");
 const lone=W.addWall([9000,0],[9000,1000],200,"int","c");
 eq(G.expandGroups([{k:"wall",id:lone.id}]).length,1,"من لا مجموعة له كما هو");
 ok(G.groupBounds(g)&&G.groupBounds(g).x1>=4000,"groupBounds");
 ok(G.groupRename(g.id,"جديد")&&g.name==="جديد","rename");
 ok(G.groupDropMember(g.id,m[2])&&g.members.length===2,"dropMember");
 ok(G.groupRemove(g.id)&&!G.groupRemove(g.id),"remove مرّة واحدة");
});

group("التطبيع: يتيم وفارغ ومكرّر",()=>{
 reset(); const {w1,w2,c1,m}=mk();
 const g=G.groupAdd("زمرة",m);
 S.cols=S.cols.filter(x=>x.id!==c1.id); ensureShape();
 eq(G.groupById(g.id).members.length,2,"اليتيم يُقصّ وتبقى المجموعة");
 S.walls=S.walls.filter(x=>x.id!==w2.id); ensureShape();
 eq(G.groupById(g.id),null,"عضو واحد ⇒ تُفكّ");
 reset(); const t=mk();
 S.groups=[{id:"GR1",name:"أ",members:[t.m[0],t.m[0],t.m[1]]},
  {id:"GR1",name:"مكرّر",members:t.m},{id:"GR2",name:"",members:"x"},null];
 ensureShape();
 eq(S.groups.length,1,"المكرّر والفاسد والفارغ يُسقَط");
 eq(S.groups[0].members.length,2,"العضو المكرّر داخل المجموعة يُسقَط");
 const before=JSON.stringify(S.groups);
 ensureShape(); eq(JSON.stringify(S.groups),before,"ensureShape متساوي القوة");
});

group("التحريك والتجميع في التحويلات",()=>{
 reset(); const {w1,w2,c1,m}=mk();
 const g=G.groupAdd("زمرة",m);
 const gr=MOD.grab([{k:"wall",id:w1.id}]);
 eq(gr.length,3,"grab يتوسّع بالمجموعة");
 const n=G.groupMove(g,500,250);
 eq(n,3,"groupMove يحرّك 3");
 eq(w1.a[0],500,"الجدار تحرّك"); eq(w2.a[1],250,"والثاني"); eq(c1.p?c1.p[0]:c1.x,1500,"والعمود");
 /* فتحة لا تُحرَّك مزدوجاً */
 const op=OP.addOpen(w1,1000,"door",900,2100,0);
 const g2=G.groupAdd("مع فتحة",[{k:"wall",id:w1.id},{k:"open",id:op.id},{k:"col",id:c1.id}]);
 const s0=op.s;
 eq(MOD.grab([{k:"wall",id:w1.id}]).filter(x=>x.s.k==="open").length,0,"grab يتخطّى الفتحة");
 G.groupMove(g2,300,0);
 eq(op.s,s0,"الفتحة لا تنزلق (تتبع جدارها)");
 /* مقفل/مخفي لا يتحرّك */
 ok(G.groupMembers(g2).length>=2,"الأعضاء القابلون للتحديد");
});

group("historySnapshotAt",()=>{
 reset();
 const s0=snapshot(); pushHistory(s0,"أ");
 W.addWall([0,0],[1000,0],200,"int","c");
 const s1=snapshot(); pushHistory(s1,"ب");
 W.addWall([0,0],[0,1000],200,"int","c");
 eq(historyTotal(),2,"عدد المواضع");
 eq(JSON.parse(historySnapshotAt(0)).walls.length,0,"الموضع 0 = البداية");
 eq(JSON.parse(historySnapshotAt(1)).walls.length,1,"الموضع 1");
 eq(JSON.parse(historySnapshotAt(2)).walls.length,2,"الموضع الجاري = الحالة الآن");
 eq(JSON.parse(historySnapshotAt(99)).walls.length,2,"القصّ إلى الحدّ");
 undo();
 eq(historyTotal(),2,"الإجمالي ثابت بعد undo");
 eq(JSON.parse(historySnapshotAt(1)).walls.length,1,"الجاري بعد undo");
 eq(JSON.parse(historySnapshotAt(2)).walls.length,2,"المستقبل من HIST.r");
 eq(S.walls.length,1,"قراءة اللقطة لم تنفّذ شيئاً");
});

group("الحفظ والفتح",()=>{
 reset(); const {m}=mk(); G.groupAdd("زمرة",m);
 const raw=snapshot();
 newState(); ensureShape();
 loadState(JSON.parse(raw));
 eq(S.groups.length,1,"المجموعات تعود سليمة"); eq(S.groups[0].members.length,3,"بأعضائها");
});

process.exit(summary()?1:0);
