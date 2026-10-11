/* ═══ guide/engine.js — المعيد التعليمي المعزول ═══
   يشغّل أدوات النواة الحقيقية عبر registry في حالةٍ بديلة،
   ثم يعيد مشروع المستخدم وخيارات الأدوات وسجلّ الأوامر حرفياً.

   الثقة كلّها في restore: أي خطأٍ وسْط السيناريو يستعيد الحالة
   كاملة — لا نِصْف درس (روح عيوب D08/D09 التاريخية).

   لا R.H = {...}: فالحرف H في registry مُصرَّح بالثابت، فلا يُبدَّل
   كائنُه بل خصائصُه فحسب — كما يفعل app.js حرفياً.

   الملاحظة التقنية (مُغلَقة في مرحلة ٨): core/journal.js قُرئ فعلياً
   — jrMute دالّةٌ مُصدَّرة دوماً (export const jrMute=v=>{MUTE=v?1:0})
   فالاستيراد المباشر أدناه مضمونٌ، لا حاجة لفحصٍ دفاعي بعد اليوم. */
import { S, DEF, snapshot, loadState, touch } from "../core/state.js";
import { setIdc } from "../core/units.js";
import { jrMute } from "../core/journal.js";
import * as R from "../tools/registry.js";

const H_KEYS = ["draw", "rep", "prompt", "refresh", "hit", "sel", "setSel", "del"];
const setH = h => { H_KEYS.forEach(k => { R.H[k] = h[k]; }); };

export function createSession(lesson) {
  const L = (lesson && typeof lesson === "string")
    ? { id: lesson, kind: "tool" } : lesson;

  const restSnap = snapshot();
  const restOpt = JSON.parse(JSON.stringify(R.OPT || {}));
  const restHist = Array.isArray(R.T && R.T.hist) ? R.T.hist.slice() : [];
  const realH = Object.assign({}, R.H);

  const s = {
    lesson: L, restSnap, restOpt, restHist, realH,
    events: [], started: false, finished: false, mode: null
  };

  s.start = function () {
    if (this.started) return this;
    this.started = true;

    R.setBatch(1);                              /* لا تاريخ ولا حفظ ولا عرض */
    setH({
      draw: () => {}, prompt: () => {},
      rep: (c, m) => { this.events.push({ c, m }); },
      refresh: () => {},
      hit: () => null, sel: () => [], setSel: () => {}, del: () => null
    });
    jrMute(1);                                  /* سكوت سجل أوامر الرمل */
    setIdc(0);                                  /* كيانات الدرس تبدأ W1/O1/A1 */

    let base = DEF();
    if (L && typeof L.fixture === "function") {
      const prepared = L.fixture(base);
      if (prepared) base = prepared;
    }
    loadState(base, false);
    return this;
  };

  s._step = function (step) {
    if (!step) return this;
    try {
      switch (step.do) {
        case "say": {
          this.events.push({ type: "say", text: step.say || "" });
          break;
        }
        case "setOpt": {
          if (L.kind === "tool" && L.id && R.OPT) {
            const o = R.OPT[L.id] || (R.OPT[L.id] = {});
            if (step.arg && step.arg.k) o[step.arg.k] = step.val;
            this.events.push({ type: "opt", k: (step.arg && step.arg.k) || null, v: step.val });
          }
          break;
        }
        case "begin": {
          const id = (step.val != null)
            ? step.val : ((step.arg != null)
              ? step.arg : ((L.kind === "tool") ? L.id : null));
          R.begin(id);
          break;
        }
        case "feed": {
          const v = step.val;
          if (v == null) break;
          if (typeof v === "string") R.feedText(v);
          else if (Array.isArray(v) && v.length === 2) R.feedPoint(v);
          break;
        }
        case "enter": R.enter(); break;
        case "finish": R.finish(step.say); break;
        case "restore": this.restore(); break;
        default:
          this.events.push({ type: "err", text: `خطوة غير معروفة: ${step.do}` });
      }
    } catch (e) {
      this.events.push({ type: "err", text: (e && e.message) || String(e) });
      this.restore();                           /* لا نِصْف درس */
    }
    return this;
  };

  s.push = function (st) { return this._step(st); };
  s.clear = function () { this.events.length = 0; return this; };
  s.run = function (steps) {
    if (!this.started) this.start();
    (steps || []).forEach(st => this._step(st));
    return this;
  };

  s.restore = function () {
    if (this.finished) return this;
    this.finished = true;

    try { if (R.active()) R.cancel(true); } catch (e) {}
    R.setBatch(0);
    jrMute(0);
    setH(this.realH);

    const d = JSON.parse(this.restSnap);
    try { loadState(d, false); }
    catch (e) { loadState(JSON.parse(JSON.stringify(S)), false); }

    const opt = R.OPT || {};
    Object.keys(opt).forEach(k => { delete opt[k]; });
    Object.assign(opt, this.restOpt);

    if (Array.isArray(R.T && R.T.hist)) R.T.hist = this.restHist;
    touch();
    try {
      if (this.realH.refresh) this.realH.refresh();
      if (this.realH.draw) this.realH.draw();
    } catch (e) {}
    return this;
  };

  return s;
}

/* ═══ تشغيل سيناريو درسٍ كامل ═══
   يبدأ إن لم يكن بدأ، وينفّذ خطواته. لا ينهي الجلسة تلقائياً:
   المعيد يعرض الحالة والعميل يقرّر متى يعيد (restore). */
export function runScript(session, steps) {
  if (!session) return null;
  if (!session.started) session.start();
  (steps || []).forEach(st => session._step(st));
  return session;
}

/* ═══ عرضٌ تلقائي منظوم ═══
   يبني جلسةً من درسٍ ثم يشغّل سيناريوه بالكامل. يُعيد الجلسة —
   على المنادي أن يقرأ أحداثها ثم ينادي restore(). */
export function demoLesson(lesson) {
  return runScript(createSession(lesson), (lesson && lesson.script) || []);
}
