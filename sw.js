/* Espace client Comptarapide — service worker (modèle LEVIX)
   HTML : réseau d'abord ; fichiers statiques : cache ; autres domaines (Supabase, Stripe) : jamais interceptés */
const CACHE='comptarapide-ec-v1';
const ASSETS=['./','index.html','style.css','i18n.js','textes-app.js','app.js','config.js','manifest.json','logo.png','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()).catch(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;let u;try{u=new URL(r.url)}catch(_){return}
  if(u.origin!==self.location.origin)return;
  const doc=r.mode==='navigate'||r.destination==='document';
  e.respondWith(doc?fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(k=>k.put(r,c));return res}).catch(()=>caches.match(r).then(x=>x||caches.match('index.html')))
    :fetch(r).then(res=>{const c=res.clone();caches.open(CACHE).then(k=>k.put(r,c));return res}).catch(()=>caches.match(r)));
});
