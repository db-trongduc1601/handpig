const C = "hangpig-v540";
const ASSETS = ["./","./index.html","./manifest.webmanifest","./icon-180.png","./icon-192.png","./icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if(e.request.mode === "navigate"){
    e.respondWith(
      fetch(e.request).then(r => {
        const cl = r.clone();
        caches.open(C).then(c => { c.put("./index.html", cl.clone()); c.put("./", cl); });
        return r;
      }).catch(() => caches.match("./index.html"))
    );
  } else {
    e.respondWith(caches.match(e.request, {ignoreSearch:true}).then(r => r || fetch(e.request)));
  }
});
