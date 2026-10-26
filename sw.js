/* Office Manager service worker
   - The page (index.html) is ALWAYS fetched from the network first; the cached copy is only a fallback.
     (An old cached page pointing at an old setup is what caused "Cannot reach the server" until site data was cleared.)
   - Requests to Google Apps Script and every non-GET / cross-origin request are left alone (no respondWith).
   - Every older cache is deleted on activate, and the new worker takes over immediately. */
var CACHE = "om-shell-v2";

self.addEventListener("install", function(e){
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){ return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); })
      .then(function(){ return self.clients.claim(); })
  );
});

function networkFirst(req){
  return fetch(req, { cache: "no-cache" }).then(function(res){
    if(res && res.ok){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(req.url, copy); }).catch(function(){});
    }
    return res;
  }).catch(function(){
    return caches.open(CACHE).then(function(c){ return c.match(req.url, { ignoreSearch: true }); }).then(function(hit){
      return hit || new Response("Offline. Please check your internet connection and reopen the app.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    });
  });
}

function staleWhileRevalidate(req){
  return caches.open(CACHE).then(function(c){
    return c.match(req.url).then(function(hit){
      var net = fetch(req).then(function(res){ if(res && res.ok) c.put(req.url, res.clone()); return res; }).catch(function(){ return hit; });
      return hit || net;
    });
  });
}

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;                              // saves / logins (POST) go straight to the network
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;               // script.google.com etc.: not ours, do not touch
  if(url.pathname.slice(-6) === "/sw.js") return;
  if(req.mode === "navigate" || url.pathname.slice(-5) === ".html" || url.pathname.slice(-1) === "/"){
    e.respondWith(networkFirst(req));
  } else {
    e.respondWith(staleWhileRevalidate(req));                   // icons, manifest
  }
});
