import {shim,group,ok,summary} from "./harness.js";
shim();
const {S,newState,ensureShape}=await import("../core/state.js");
const {addWall}=await import("../core/walls.js");

group("منع تكرار المعرّفات — W3",()=>{
 newState();
 const w1=addWall([0,0],[1000,0],200,"int","c");
 const w2=addWall([0,1000],[1000,1000],200,"int","c");
 w2.id=w1.id;                       /* ملفّ محرَّر يدوياً: تكرار */
 ensureShape();
 ok(S.walls.length===1,"أُسقِط اللاحق وبقي الأوّل");
 ok(S.walls[0].id===w1.id,"الهوية باقية للأوّل");
});

process.exit(summary());
