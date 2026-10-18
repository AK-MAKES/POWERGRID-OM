/* KOZHIKODE SS service worker – makes the app installable and lets the page shell open offline.
   Live data (Google Apps Script) is NEVER cached: only same-origin files of this site are. */
var CACHE = "kss-shell-v18.44";
var SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).catch(function(){}).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  var r = e.request, u = new URL(r.url);
  if(r.method !== "GET" || u.origin !== self.location.origin) return;     // server calls go straight to the network
  e.respondWith(
    fetch(r).then(function(res){                                           // network first: always the newest page when online
      if(res && res.ok){ var copy = res.clone(); caches.open(CACHE).then(function(c){ c.put(r, copy); }); }
      return res;
    }).catch(function(){
      return caches.match(r).then(function(m){ return m || caches.match("./index.html"); });
    })
  );
});
