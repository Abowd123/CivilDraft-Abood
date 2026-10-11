/* ═══ اختبار 3.1: السجلّ يلتقط ما يُدخَل ═══
   jrAdd تُسجّل كل إدخالٍ قابلٍ لتمثيله بسطر — إحداثيّاً كان أو
   اسم أداة أو enter/esc — وتُدمج الإسكيب المتتالي في سطرٍ واحد.

   التشغيل:  node js/tests/journal.test.js                        */
import {shim,group,ok,eq,summary} from "./harness.js";
shim();

const {jrAdd,jrTaint,jrText,jrClear,jrCount,jrTainted}=
 await import("../core/journal.js");

group("jrAdd — الالتقاط الأساسيّ",()=>{
 jrClear();
 eq(jrCount(),0,"السجلّ فارغٌ بعد المسح");

 jrAdd("wall");
 jrAdd("3,4");
 jrAdd("@5,0");
 jrAdd("esc");
 eq(jrCount(),4,"أربعة سطور دخلت السجلّ");
});

group("jrAdd — دمج الإسكيب المتتالي",()=>{
 jrClear();
 jrAdd("wall"); jrAdd("esc");
 jrAdd("esc"); jrAdd("esc");
 eq(jrCount(),2,"الإسكيبات المتتالية سطرٌ واحد");
});

group("jrText — الترويسة والشائبة",()=>{
 jrClear();
 jrAdd("wall");
 jrTaint("تراجع");
 jrAdd("5,5");
 const txt=jrText();
 ok(/مشوب/.test(txt),"الترويسة تذكر الشائبة");
 ok(/تراجع/.test(txt),"الشائبة مُسمّاة");
 eq(jrTainted(),1,"شائبةٌ واحدة مُسجَّلة");
});

process.exit(summary());
