/* Lightweight zero-dependency static server for local dev (npm run serve).
   Serves the repo root (portable — works on Windows/macOS/Linux, no
   hardcoded container path) and mirrors the CSP/security headers from
   _headers / netlify.toml so local runs enforce the same policy as
   production. ES modules require correct MIME types — handled below. */
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = parseInt(process.env.PORT, 10) || 8080;
const HOST = process.env.HOST || "127.0.0.1";

/* يجب أن تطابق _headers و netlify.toml حرفياً — أي تعديل هناك يستلزم
   تعديلاً هنا، وإلا صار الإنفاذ المحلي كذباً لا يكشف ما يكشفه الإنتاج. */
const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; " +
    "img-src 'self' data: blob:; connect-src 'self' " +
    "https://api.openai.com https://api.groq.com " +
    "https://generativelanguage.googleapis.com https://openrouter.ai " +
    "http://localhost:* http://127.0.0.1:*; object-src 'none'; " +
    "base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function safeJoin(root, reqPath) {
  /* decodeURIComponent ترمي URIError على «%E0%A4%A» ونحوه — وكانت تخرج
     غير ممسوكةً فتُسقط الخادم كلَّه بطلبٍ واحد. المُعيد null يعني «رفض». */
  let decoded;
  try {
    decoded = decodeURIComponent(reqPath.split("?")[0].split("#")[0]);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const p = path.normalize(path.join(root, decoded));
  // path traversal guard — compare with a trailing separator so a sibling
  // directory that merely shares the root's name as a prefix (e.g.
  // "/app/civildraft-secrets") is not mistaken for a path inside root.
  if (p !== root && !p.startsWith(root + path.sep)) return null;
  return p;
}

const server = http.createServer((req, res) => {
  /* ملفّاتٌ ساكنة: GET وHEAD فقط. غيرهما 405 بترويسة Allow. */
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", ...SECURITY_HEADERS });
    return res.end("Method Not Allowed");
  }
  const head = req.method === "HEAD";
  let target = safeJoin(ROOT, req.url === "/" ? "/index.html" : req.url);
  if (!target) {
    res.writeHead(403, SECURITY_HEADERS);
    return res.end(head ? undefined : "Forbidden");
  }
  fs.stat(target, (err, st) => {
    if (!err && st.isDirectory()) target = path.join(target, "index.html");
    fs.readFile(target, (err2, data) => {
      if (err2) {
        // SPA-ish fallback to index.html for unknown non-asset routes
        if (!path.extname(target)) {
          return fs.readFile(path.join(ROOT, "index.html"), (e3, d3) => {
            if (e3) {
              res.writeHead(404, SECURITY_HEADERS);
              return res.end("Not found");
            }
            res.writeHead(200, { "Content-Type": TYPES[".html"], ...SECURITY_HEADERS });
            res.end(head ? undefined : d3);
          });
        }
        res.writeHead(404, SECURITY_HEADERS);
        return res.end("Not found");
      }
      const ext = path.extname(target).toLowerCase();
      res.writeHead(200, {
        "Content-Type": TYPES[ext] || "application/octet-stream",
        "Cache-Control": "no-cache",
        ...SECURITY_HEADERS,
      });
      res.end(head ? undefined : data);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[civildraft-static] serving ${ROOT} on http://${HOST}:${PORT}`);
});

/* إيقافٌ نظيف: يُنهي الطلبات الجارية ثم يخرج (Ctrl+C أو إشارة من مشغّل الاختبار). */
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
