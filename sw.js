/* OVA · service worker v1
   RED PRIMERO: con internet siempre baja la version nueva (nunca te quedas con un archivo viejo).
   Solo si no hay red (o tarda mas de 4 s) responde con la copia guardada.
   No toca las APIs (MLB, ESPN, Kalshi, Railway...): solo archivos de este mismo sitio. */
var CACHE = 'ova-shell-v1';
var SHELL = ['hub.html','panel.html','index.html','futbol.html','nba.html','ovaextra.js','hubestilos.js','interior.js','obsidiana.js','mejoras.js','selecciones.js',
  'historial.js','railway.js','pinnacle.js','diseno.js','manifest.json','icon-180.png','icon-192.png','icon-512.png'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      /* uno por uno: si algun archivo no existe, no se cae la instalacion entera */
      return Promise.all(SHELL.map(function(u){ return c.add(u).catch(function(){}); }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(ks.filter(function(k){ return k!==CACHE && k.indexOf('ova-shell-')===0; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url;
  try{ url = new URL(req.url); }catch(err){ return; }
  if(url.origin !== self.location.origin) return;   /* APIs y fuentes: pasan directo */
  e.respondWith(
    new Promise(function(resolve, reject){
      var listo = false;
      var t = setTimeout(function(){
        caches.match(req, {ignoreSearch:true}).then(function(m){ if(m && !listo){ listo = true; resolve(m); } });
      }, 4000);
      fetch(req).then(function(r){
        clearTimeout(t);
        if(r && r.ok){
          var copia = r.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copia); }).catch(function(){});
        }
        if(!listo){ listo = true; resolve(r); }
      }).catch(function(err){
        clearTimeout(t);
        caches.match(req, {ignoreSearch:true}).then(function(m){
          if(listo) return;
          listo = true;
          if(m) resolve(m); else reject(err);
        });
      });
    })
  );
});
