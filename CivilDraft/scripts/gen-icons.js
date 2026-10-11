#!/usr/bin/env node
/* ═══ توليدُ أيقونات PWA من favicon.svg ═══ P6-001
   الأيقوناتُ المولَّدة مُلتزَمةٌ في المستودع (icons/) فلا يحتاجها
   البناءُ ولا النشر. هذا السكربتُ لإعادة توليدها إن تغيّر الشعار.

   يجرّب الأدواتَ بالترتيب ويستعمل أوّلَ متوفّرة:
     1) rsvg-convert   2) ImageMagick (magick/convert)   3) Python CairoSVG
   وإن لم تتوفّر أيٌّ منها طبع ما يلزم وخرج بـ1 — لا ملفٌّ فارغٌ يُلتزَم.

   و«maskable» ليست المقاس نفسَه: المنطقةُ الآمنة هي الـ80% الداخلية،
   فالشعارُ يُصغَّر إليها ويُحاط بخلفيةٍ مالئةٍ بلون #0D111C — وإلّا
   قصّ أندرويد أطرافَه في القناع الدائريّ.
   التشغيل:  node scripts/gen-icons.js                              */
import {execFileSync} from "node:child_process";
import {existsSync,mkdirSync} from "node:fs";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=join(dirname(fileURLToPath(import.meta.url)),"..");
const SVG=join(ROOT,"favicon.svg");
const OUT=join(ROOT,"icons");
const BG="#0D111C";
export const TARGETS=[
 {file:"icon-192.png",            size:192, maskable:false},
 {file:"icon-512.png",            size:512, maskable:false},
 {file:"icon-maskable-192.png",   size:192, maskable:true},
 {file:"icon-maskable-512.png",   size:512, maskable:true},
];
const has=cmd=>{
 try{execFileSync("sh",["-c",`command -v ${cmd}`],{stdio:"ignore"}); return true}
 catch(e){return false}
};
function pick(){
 if(has("rsvg-convert"))return "rsvg";
 if(has("magick"))return "magick";
 if(has("convert"))return "convert";
 try{
  execFileSync("python3",["-c","import cairosvg"],{stdio:"ignore"});
  return "cairosvg";
 }catch(e){}
 return null;
}
function render(tool,t){
 const dst=join(OUT,t.file);
 const inner=t.maskable?Math.round(t.size*0.8):t.size;
 const pad=Math.round((t.size-inner)/2);
 if(tool==="cairosvg"){
  const py=t.maskable
   ? `import cairosvg\nfrom PIL import Image\n`
     +`cairosvg.svg2png(url=${JSON.stringify(SVG)},write_to="/tmp/_i.png",`
     +`output_width=${inner},output_height=${inner})\n`
     +`g=Image.open("/tmp/_i.png").convert("RGBA")\n`
     +`bg=Image.new("RGBA",(${t.size},${t.size}),(13,17,28,255))\n`
     +`bg.alpha_composite(g,(${pad},${pad}))\n`
     +`bg.convert("RGB").save(${JSON.stringify(dst)})\n`
   : `import cairosvg\ncairosvg.svg2png(url=${JSON.stringify(SVG)},`
     +`write_to=${JSON.stringify(dst)},output_width=${t.size},`
     +`output_height=${t.size})\n`;
  execFileSync("python3",["-c",py],{stdio:"inherit"});
  return;
 }
 if(tool==="rsvg"){
  execFileSync("rsvg-convert",
   ["-w",String(inner),"-h",String(inner),SVG,"-o",dst],{stdio:"inherit"});
  if(t.maskable&&(has("magick")||has("convert"))){
   const m=has("magick")?"magick":"convert";
   execFileSync(m,[dst,"-background",BG,"-gravity","center",
    "-extent",`${t.size}x${t.size}`,dst],{stdio:"inherit"});
  }
  return;
 }
 const m=(tool==="magick")?"magick":"convert";
 const a=["-background",t.maskable?BG:"none",SVG,
  "-resize",`${inner}x${inner}`];
 if(t.maskable)a.push("-gravity","center","-extent",`${t.size}x${t.size}`);
 a.push(dst);
 execFileSync(m,a,{stdio:"inherit"});
}
const isMain=process.argv[1]
 &&fileURLToPath(import.meta.url)===process.argv[1];
if(isMain){
 if(!existsSync(SVG)){console.error("favicon.svg مفقود"); process.exit(1)}
 const tool=pick();
 if(!tool){
  console.error("لا أداةَ رسمٍ متاحة. ثبّت إحداها ثم أعِد التشغيل:");
  console.error("  apt install librsvg2-bin      # rsvg-convert");
  console.error("  apt install imagemagick        # magick / convert");
  console.error("  pip install cairosvg pillow    # CairoSVG");
  process.exit(1);
 }
 mkdirSync(OUT,{recursive:true});
 console.log(`الأداة: ${tool}`);
 TARGETS.forEach(t=>{render(tool,t); console.log(`✓ icons/${t.file}`)});
 console.log("تمّ. والأيقوناتُ مُلتزَمةٌ في المستودع — لا يُنتِجها البناء.");
}
