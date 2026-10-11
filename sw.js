/* ═══ Service Worker — CivilDraft ═══
   القاعدة: الشبكة أولاً لكل شيءٍ من نفس الأصل، والكاش احتياطٌ عند
   انقطاع الاتصال فقط. لا «كاش أولاً» لأي مورد (HTML منه) — وإلا علق
   المستخدم على نسخةٍ قديمة بعد كل ترقية، وهو ما يمنعه no-cache في
   netlify.toml و_headers. ما نجح جلبُه يُخزَّن (r.ok وحده) فيعمل
   التطبيق بلا اتصال بعد زيارةٍ واحدة.
   طلباتُ المزوّد الخارجيّ (المفتاح في ترويسته) وغير GET لا نعترضها.

   ═══ ما أُصلح في P6-002 ═══
   ١) اسمُ الكاش مرتبطٌ برقم النسخة لا رقماً يدوياً يُنسى. المصدرُ
      الواحد js/core/version.js، والنصُّ هنا مطابقٌ له حرفاً بحارسٍ
      في الاختبار (العاملُ لا يستورد وحدات).
   ٢) CORE يشمل ما يلزم للعمل دون اتصالٍ بعد أوّل زيارة — لا خمسةَ
      ملفّاتٍ فقط. والقائمةُ مولَّدةٌ لا مكتوبةٌ بيد: scripts/gen-sw-core.js
      يقرأ رسمَ الاستيراد ويكتبها، والاختبارُ يتحقّق أنها محدَّثة.
   ٣) التثبيتُ مرِنٌ: ملفٌّ واحدٌ يفشل لا يُسقِط العاملَ كلَّه
      (addAll ذرّيّة — فنضيف واحداً واحداً ونتجاوز الفاشل).
   ٤) التحديثُ يصل المستخدمَ: لا skipWaiting أعمى على صفحةٍ حيّة —
      العاملُ الجديد ينتظر، ويُبلِّغ الصفحةَ برسالة، والصفحةُ تسأل
      المستخدم ثم تُرسل SKIP_WAITING فيُفعَّل ويُعاد التحميل مرّةً
      واحدة. وأوّلُ تثبيتٍ (لا عاملَ قبله) يُفعَّل فوراً بلا سؤال.
   ٥) الكاشاتُ القديمة تُحذَف في activate، وحدُّ عددٍ للمدخلات يمنع
      نموّاً بلا سقف.                                                */
const VERSION="1.1.0";                 /* = js/core/version.js */
const CACHE=`civildraft-v${VERSION}`;
const MAXENTRIES=400;                  /* سقفُ مدخلات الكاش */

/* ═══ CORE ═══ مولَّدة: node scripts/gen-sw-core.js
   لا تُحرَّر بيدٍ — السطرانِ أدناه علامتا التوليد. */
/* CORE:BEGIN */
const CORE=[
 "./","./index.html","./manifest.json","./favicon.svg",
 "./favicon.ico","./apple-touch-icon.png","./css/about.css","./css/base.css",
 "./css/blocks.css","./css/boot.css","./css/cmd.css","./css/dock.css",
 "./css/guide.css","./css/helpbot.css","./css/history.css","./css/learn.css",
 "./css/modern.css","./css/palette.css","./css/panels.css","./css/pricing.css",
 "./css/report.css","./css/ribbon.css","./css/status.css","./css/studio.css",
 "./css/theme.css","./css/tokens.css","./css/tools.css","./css/touch.css",
 "./css/tour.css","./css/underlay.css","./css/util.css","./css/view3d.css",
 "./css/welcome.css","./icons/college-logo.svg","./icons/icon-192.png","./icons/icon-512.png",
 "./icons/icon-maskable-192.png","./icons/icon-maskable-512.png","./js/ai/ctx.js","./js/ai/generate.js",
 "./js/ai/help/answer.js","./js/ai/help/intent.js","./js/ai/help/kb.js","./js/ai/help/provider.js",
 "./js/ai/lang.js","./js/ai/lint.js","./js/ai/macrorun.js","./js/ai/net.js",
 "./js/ai/ops.js","./js/ai/opsrun.js","./js/ai/plan.js","./js/ai/review.js",
 "./js/ai/run.js","./js/ai/smartblocks.js","./js/ai/templates_lib.js","./js/app.js",
 "./js/bootguard.js","./js/core/arcmath.js","./js/core/areas.js","./js/core/autodim.js",
 "./js/core/batch.js","./js/core/blocks.js","./js/core/boq.js","./js/core/callouts.js",
 "./js/core/clouds.js","./js/core/code.js","./js/core/cols.js","./js/core/compare.js",
 "./js/core/coords.js","./js/core/delegate.js","./js/core/dims.js","./js/core/dimstyles.js",
 "./js/core/elevation.js","./js/core/entreg.js","./js/core/ents.js","./js/core/escape.js",
 "./js/core/fixt.js","./js/core/geom.js","./js/core/groups.js","./js/core/hatches.js",
 "./js/core/inspect.js","./js/core/journal.js","./js/core/laydef.js","./js/core/layers.js",
 "./js/core/level.js","./js/core/levelAlign.js","./js/core/limits.js","./js/core/live.js",
 "./js/core/ltypes.js","./js/core/macros.js","./js/core/migrate-autosave.js","./js/core/model3d.js",
 "./js/core/modify.js","./js/core/opens.js","./js/core/osnap.js","./js/core/parse.js",
 "./js/core/perf.js","./js/core/plines.js","./js/core/pricing.js","./js/core/proj3d.js",
 "./js/core/ref.js","./js/core/render.js","./js/core/roof.js","./js/core/section.js",
 "./js/core/shape.js","./js/core/sheet.js","./js/core/sindex.js","./js/core/stairs.js",
 "./js/core/state.js","./js/core/struct.js","./js/core/tabledef.js","./js/core/tables.js",
 "./js/core/templates.js","./js/core/trace.js","./js/core/underlay.js","./js/core/units.js",
 "./js/core/validate.js","./js/core/version.js","./js/core/walls.js","./js/guide/auto.js",
 "./js/guide/catalog.js","./js/guide/courses.js","./js/guide/dockPane.js","./js/guide/engine.js",
 "./js/guide/floater.js","./js/guide/lessons.js","./js/guide/sketch.js","./js/guide/usage.js",
 "./js/guide/viewer.js","./js/guide/wire.js","./js/io/backup.js","./js/io/boq.js",
 "./js/io/boqcsv.js","./js/io/boqpdf.js","./js/io/boqreport.js","./js/io/cp1256.js",
 "./js/io/dxf.js","./js/io/dxfarc.js","./js/io/dxfin.js","./js/io/elev.js",
 "./js/io/export.js","./js/io/pdf.js","./js/io/platform.js","./js/io/png.js",
 "./js/io/project.js","./js/io/report.js","./js/io/sect.js","./js/io/snaps.js",
 "./js/io/store.js","./js/io/style.js","./js/io/svg.js","./js/io/zip.js",
 "./js/learn/acts.js","./js/learn/cards.js","./js/learn/cert.js","./js/learn/lessons.js",
 "./js/learn/runner.js","./js/learn/sandbox.js","./js/tools/annotate.js","./js/tools/areas.js",
 "./js/tools/blockcollect.js","./js/tools/blockops.js","./js/tools/blocks.js","./js/tools/boq.js",
 "./js/tools/boqreport.js","./js/tools/cleanup.js","./js/tools/clouds.js","./js/tools/dedup.js",
 "./js/tools/draw.js","./js/tools/elev.js","./js/tools/groups.js","./js/tools/levelmgr.js",
 "./js/tools/macros.js","./js/tools/modify.js","./js/tools/openings.js","./js/tools/parts.js",
 "./js/tools/presets.js","./js/tools/ref.js","./js/tools/registry.js","./js/tools/roof.js",
 "./js/tools/section.js","./js/tools/sheet.js","./js/tools/showcase.js","./js/tools/sketch.js",
 "./js/tools/tplscript.js","./js/tutor/engine.js","./js/tutor/lessons.js","./js/ui/about.js",
 "./js/ui/actions.js","./js/ui/ai.js","./js/ui/appcmds.js","./js/ui/appmenu.js",
 "./js/ui/blockdraw.js","./js/ui/blockpanel.js","./js/ui/bus.js","./js/ui/canvas.js",
 "./js/ui/cmdkeys.js","./js/ui/cmdline.js","./js/ui/ctxmenu.js","./js/ui/defaults.js",
 "./js/ui/dock.js","./js/ui/dyninput.js","./js/ui/focustrap.js","./js/ui/gallery.js",
 "./js/ui/gate.js","./js/ui/helpbot.js","./js/ui/helpbutton.js","./js/ui/helppan.js",
 "./js/ui/historypanel.js","./js/ui/hygiene.js","./js/ui/icons.js","./js/ui/inspector.js",
 "./js/ui/install.js","./js/ui/keymap.js","./js/ui/layout.js","./js/ui/learn.js",
 "./js/ui/levelManager.js","./js/ui/levelbar.js","./js/ui/navbar.js","./js/ui/optbar.js",
 "./js/ui/overlay.js","./js/ui/palette.js","./js/ui/panels.js","./js/ui/presenter.js",
 "./js/ui/pricingPanel.js","./js/ui/props.js","./js/ui/quickprops.js","./js/ui/recentbar.js",
 "./js/ui/ribbon/beginner.js","./js/ui/ribbon/custom.js","./js/ui/ribbon/editor.js","./js/ui/ribbon/overflow.js",
 "./js/ui/ribbon/render.js","./js/ui/ribbon/schema.js","./js/ui/ribbon/wire.js","./js/ui/rpt.js",
 "./js/ui/searchIndex.js","./js/ui/searchcommon.js","./js/ui/statusbar.js","./js/ui/store.js",
 "./js/ui/studio.js","./js/ui/styleManager.js","./js/ui/sugg.js","./js/ui/theme.js",
 "./js/ui/tour.js","./js/ui/underlayPanel.js","./js/ui/view3d.js","./js/ui/viewcmds.js",
 "./js/ui/viewport.js","./js/ui/welcome-model.js","./js/ui/welcome.js","./js/boot-splash.js"
];
/* CORE:END */

/* إضافةٌ واحدةً واحدة: الفاشلُ يُتجاوَز ولا يُسقِط التثبيت */
async function warm(){
 const c=await caches.open(CACHE);
 let ok=0, bad=0;
 for(const u of CORE){
  try{
   const r=await fetch(u,{cache:"reload"});
   if(r&&r.ok){await c.put(u,r.clone()); ok++} else bad++;
  }catch(e){bad++}
 }
 return {ok,bad};
}
async function trim(){
 try{
  const c=await caches.open(CACHE);
  const ks=await c.keys();
  if(ks.length<=MAXENTRIES)return 0;
  const drop=ks.slice(0,ks.length-MAXENTRIES);
  await Promise.all(drop.map(k=>c.delete(k)));
  return drop.length;
 }catch(e){return 0}
}
self.addEventListener("install",e=>{
 /* لا skipWaiting هنا: الترقيةُ لا تُفرَض على صفحةٍ حيّة (البند ٤) */
 e.waitUntil(warm());
});
self.addEventListener("activate",e=>{
 e.waitUntil((async()=>{
  const ks=await caches.keys();
  await Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
  /* أعلِم كلَّ صفحةٍ أنّ نسخةً جديدةً صارت فعّالة */
  const cs=await self.clients.matchAll({type:"window"});
  cs.forEach(c=>{try{c.postMessage({type:"SW_ACTIVATED",version:VERSION})}catch(e){}});
 })());
});
/* الصفحةُ تطلب التفعيل بعد موافقة المستخدم */
self.addEventListener("message",e=>{
 const d=e&&e.data;
 if(d&&d.type==="SKIP_WAITING")self.skipWaiting();
 if(d&&d.type==="VERSION"&&e.source&&e.source.postMessage)
  e.source.postMessage({type:"SW_VERSION",version:VERSION});
});
self.addEventListener("fetch",e=>{
 const req=e.request;
 if(req.method!=="GET")return;
 let url;
 try{url=new URL(req.url)}catch(err){return}
 if(url.origin!==self.location.origin)return;
 e.respondWith(
  fetch(req).then(r=>{
   if(r&&r.ok&&r.type==="basic"){
    const c=r.clone();
    caches.open(CACHE).then(cache=>cache.put(req,c))
     .then(()=>trim()).catch(()=>{});
   }
   return r;
  }).catch(()=>caches.match(req).then(hit=>
   hit||(req.mode==="navigate"?caches.match("./index.html"):undefined)))
 );
});
