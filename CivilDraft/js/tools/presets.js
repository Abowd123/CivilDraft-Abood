/* ═══ المقاسات والقوالب ═══
   المقاس يضبط خيارات أداة موجودة ثم يتركها فعّالة. القالب يمرّ
   من بوابة الخطط نفسها قبل تثبيته كي لا يكون له مسار تنفيذ خاص. */
import {setOpt,begin} from "./registry.js";

export const SIZES=[
 {id:"s.door.room",tool:"door",cat:"أبواب",label:"باب غرفة",
  sub:"0.90 × 2.10",set:{w:"0.9",h:"2.1",kind:"door",hinge:"start"}},
 {id:"s.door.main",tool:"door",cat:"أبواب",label:"باب مدخل",
  sub:"1.20 × 2.20 مزدوج",set:{w:"1.2",h:"2.2",kind:"double"}},
 {id:"s.door.wet",tool:"door",cat:"أبواب",label:"باب دورة مياه",
  sub:"0.70 × 2.00",set:{w:"0.7",h:"2",kind:"door"}},
 {id:"s.door.slide",tool:"door",cat:"أبواب",label:"باب سحب",
  sub:"1.60 × 2.10",set:{w:"1.6",h:"2.1",kind:"sliding"}},
 {id:"s.win.majlis",tool:"win",cat:"شبابيك",label:"شباك مجلس",
  sub:"2.00 × 1.60 · جلسة 0.90",set:{w:"2",h:"1.6",sill:"0.9",pan:2}},
 {id:"s.win.room",tool:"win",cat:"شبابيك",label:"شباك غرفة نوم",
  sub:"1.50 × 1.40 · جلسة 0.90",set:{w:"1.5",h:"1.4",sill:"0.9",pan:2}},
 {id:"s.win.wet",tool:"win",cat:"شبابيك",label:"شباك دورة مياه",
  sub:"0.60 × 0.60 · جلسة 1.60",set:{w:"0.6",h:"0.6",sill:"1.6",pan:1}},
 {id:"s.win.kitchen",tool:"win",cat:"شبابيك",label:"شباك مطبخ",
  sub:"1.20 × 1.00 · جلسة 1.10",set:{w:"1.2",h:"1",sill:"1.1",pan:2}},
 {id:"s.wall.ext",tool:"wall",cat:"جدران",label:"جدار خارجي",
  sub:"0.25 م",set:{t:"0.25",type:"ext",align:"c"}},
 {id:"s.wall.int",tool:"wall",cat:"جدران",label:"جدار داخلي",
  sub:"0.12 م",set:{t:"0.12",type:"int",align:"c"}},
 {id:"s.wall.part",tool:"wall",cat:"جدران",label:"قاطع خفيف",
  sub:"0.07 م",set:{t:"0.07",type:"int",align:"c"}},
 {id:"s.wall.low",tool:"wall",cat:"جدران",label:"سترة",
  sub:"0.15 م · ارتفاع 1.10",set:{t:"0.15",type:"low",h:"1.1"}}
];

export function applySize(p){
 Object.keys(p.set).forEach(k=>setOpt(p.tool,k,p.set[k]));
 return begin(p.tool);
}

const F=v=>(Math.round(v*1000)/1000).toFixed(2);
const P=(at,dx,dy)=>`${F(at[0]+dx)},${F(at[1]+dy)}`;
export const TPL=[
 {id:"t.room",label:"قالب: غرفة 4 × 3",sub:"مستطيل صافٍ 0.25 + منطقة",
  lines:at=>["rect","t=0.25","type=ext","align=l",P(at,0,0),"4x3","esc",
   "area","num=1","showArea=1",P(at,2,1.5),"esc"]},
 {id:"t.wet",label:"قالب: دورة مياه 2.4 × 1.6",sub:"قاطع 0.12 + منطقة مسمّاة",
  lines:at=>["rect","t=0.12","type=int","align=l",P(at,0,0),"2.4x1.6","esc",
   "area","name=دورة مياه","num=1",P(at,1.2,0.8),"esc"]},
 {id:"t.flat",label:"قالب: شقّة بثلاثة فراغات 10 × 8",
  sub:"خارجي 0.25 · قواطع 0.12 · ثلاث مناطق",
  lines:at=>["rect","t=0.25","type=ext","align=l",P(at,0,0),"10x8","esc",
   "wall","t=0.12","type=int","align=c",P(at,6,0),P(at,6,8),"esc",
   "wall",P(at,6,4),P(at,10,4),"esc",
   "area","num=1","showArea=1",P(at,3,4),P(at,8,2),P(at,8,6),"esc"]}
];