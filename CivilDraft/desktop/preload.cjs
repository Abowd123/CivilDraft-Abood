/* جسرٌ ضيّق وآمن بين الواجهة والنظام — لا Node ولا مسارات حرّة.
   تكتشف الواجهة نسخة سطح المكتب بـ window.civilDesktop?.isDesktop */
"use strict";
const { contextBridge, ipcRenderer } = require("electron");

/* مستمعٌ يمرّر الحمولة فقط — لا كائن الحدث (فيه ipcRenderer) */
const listen = (channel, cb) => {
  if (typeof cb !== "function") return;
  ipcRenderer.on(channel, (_e, payload) => { try { cb(payload); } catch { /* لا يكسر الجسر */ } });
};

contextBridge.exposeInMainWorld("civilDesktop", Object.freeze({
  isDesktop: true,
  /* name: اسم مقترح · data: نص أو Uint8Array · filters: [{name,extensions}] */
  saveFile: (name, data, filters) => ipcRenderer.invoke("desktop:save", { name, data, filters }),
  /* يعيد {ok,name,path,data} — data نصّ، أو Uint8Array مع binary=true */
  openFile: (filters, binary = false) => ipcRenderer.invoke("desktop:open", { filters, binary }),
  info: () => ipcRenderer.invoke("desktop:info"),
  /* أوامر القائمة: "new" | "open" | "save" */
  onCommand: cb => listen("desktop:command", cb),
  /* ملفّ مشروعٍ فُتح من نظام التشغيل: {name, data(نص)} */
  onOpenFile: cb => listen("desktop:open-file", cb),
  /* تُستدعى بعد تسجيل المستمعين ليسلّم الغلاف ما انتظر */
  ready: () => ipcRenderer.invoke("desktop:ready"),
}));
