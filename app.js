/* Espace client Comptarapide — application réelle (Supabase + Stripe)
   Écrans : connexion (lien par e-mail) → rattachement entreprise (code) → essai 48 h → espace (5 onglets). */
const CFG=window.CR_CONFIG; // { url, cle } défini dans config.js
const sb=supabase.createClient(CFG.url,CFG.cle);
const PRIX=9.90;
const S={lang:"fr",user:null,membre:null,ent:null,abo:null,docs:[],reqs:[],pieces:[],ecran:0,rub:"K-Bis",pers:1,photo:null,msg:"",occupe:false};
try{const l=localStorage.getItem("cr-lang");if(l)S.lang=l}catch(e){}

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const loc=()=>({tr:"tr-TR",tn:"ar-TN"})[S.lang]||"fr-FR";
const fmt=v=>{if(!v)return"";const dt=new Date(v);return S.lang==="tn"?`${dt.getDate()} ${MOIS_TN[dt.getMonth()]} ${dt.getFullYear()}`:dt.toLocaleDateString(loc(),{day:"numeric",month:"long",year:"numeric"})};
const eur=n=>n.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
const rn=r=>S.lang==="tr"?RUB_TR[r]:S.lang==="tn"?RUB_TN[r]:r;
const t=()=>Object.assign({},T[S.lang],X[S.lang]);
function toast(m){const e=$("toast");e.textContent=m;e.classList.add("on");clearTimeout(toast.h);toast.h=setTimeout(()=>e.classList.remove("on"),3500)}
async function fn(nom,corps){
  const {data,error}=await sb.functions.invoke(nom,{body:corps||{}});
  if(error){let d={};try{d=await error.context.json()}catch(e){}throw new Error(d.erreur||error.message)}
  return data;
}
const accesOuvert=()=>{const a=S.abo;if(!a)return false;
  const ok=["trialing","active"].includes(a.statut)||(a.statut==="past_due");
  return ok&&(!a.resiliation_effet||new Date(a.resiliation_effet)>new Date())};

/* ---------- chargement des données ---------- */
async function charger(){
  const {data:{session}}=await sb.auth.getSession();
  S.user=session?.user||null;
  if(!S.user){render();return}
  const {data:m}=await sb.from("membres").select("*").eq("id",S.user.id).maybeSingle();
  S.membre=m;
  if(m?.langue&&!localStorage.getItem("cr-lang"))S.lang=m.langue;
  if(m?.entreprise_id){
    const [e,a,d,r,p]=await Promise.all([
      sb.from("entreprises").select("*").eq("id",m.entreprise_id).single(),
      sb.from("abonnements").select("*").eq("entreprise_id",m.entreprise_id).maybeSingle(),
      sb.from("documents").select("*").eq("entreprise_id",m.entreprise_id).order("depose_le",{ascending:false}),
      sb.from("demandes").select("*").eq("entreprise_id",m.entreprise_id).order("cree_le",{ascending:false}),
      sb.from("pieces").select("*").eq("entreprise_id",m.entreprise_id).order("cree_le",{ascending:false}).limit(30)]);
    S.ent=e.data;S.abo=a.data;S.docs=d.data||[];S.reqs=r.data||[];S.pieces=p.data||[];
    if(S.abo?.quantite)S.pers=S.abo.quantite;
  }
  render();
}

/* ---------- gabarits ---------- */
function entete(x){
  return `<header><div class="logo"><img src="logo.png" alt="Comptarapide"></div>
  <div class="who"><div class="t">${S.ent?esc(S.ent.nom):"Comptarapide"}</div><div class="s">${S.ent?esc(S.ent.forme||"")+(S.ent.siren?" · SIREN "+esc(S.ent.siren):""):x.space}</div></div>
  <div class="drapeaux">${["fr","tr","tn"].map(l=>`<button class="dr${S.lang===l?" on":""}" data-l="${l}" aria-label="${l.toUpperCase()}" aria-pressed="${S.lang===l}">${FLAG[l]}</button>`).join("")}</div></header>`}
function pied(x){return `<footer><div>${x.contact}</div><div>${x.legal}</div><div><a href="conditions.html" style="color:inherit">${x.cga}</a></div>
  ${S.user?`<p class="btn-row"><button class="btn btn-s mini" id="deco">${x.deco}</button>${window.__install?`<button class="btn btn-s mini" id="inst">${x.installer}</button>`:""}</p>`:""}</footer>`}
const note=()=>S.msg?`<div class="note ok">${S.msg}</div>`:"";

function vConnexion(x){
  return `<div class="login"><div class="logoL"><img src="logo.png" alt="Comptarapide"></div>
  <div class="carte"><h2>${x.cnxT}</h2><p class="lead">${x.cnxS}</p>${note()}
  <form id="fCnx"><div class="champ"><label for="cEmail">${x.email}</label><input id="cEmail" type="email" required autocomplete="email" inputmode="email"></div>
  <button class="btn btn-r" ${S.occupe?"disabled":""}>${x.envoyerLien}</button></form></div></div>`}
function vRejoindre(x){
  return `<div class="login"><div class="carte"><h2>${x.joinT}</h2><p class="lead">${x.joinS}</p>${note()}
  <form id="fJoin"><div class="champ"><label for="jCode">${x.code}</label><input id="jCode" required autocapitalize="characters" style="text-transform:uppercase;letter-spacing:2px"></div>
  <div class="duo"><div class="champ"><label for="jPre">${x.prenom}</label><input id="jPre" required></div><div class="champ"><label for="jNom">${x.nomF}</label><input id="jNom" required></div></div>
  <button class="btn btn-r" ${S.occupe?"disabled":""}>${x.valider}</button></form></div></div>`}
function vEssai(x){
  return `<div class="titre"><h1>${x.hello} ${esc(S.membre?.prenom||"")}</h1><p>${esc(S.ent.nom)}</p></div>${note()}
  <div class="carte"><h2>${x.essaiT}</h2><p class="lead">${x.essaiS}</p>
   <label>${x.pers}</label><div class="stepper"><button id="pm" aria-label="−">−</button><output>${S.pers}</output><button id="pp" aria-label="+">+</button></div>
   <p class="grand" style="margin:10px 0 2px">${eur(PRIX*S.pers)} <span class="lead">/ ${S.lang==="tr"?"ay":S.lang==="tn"?"شهر":"mois"}</span></p>
   <p class="lead">${x.essaiDetail(S.pers,eur(PRIX*S.pers))}</p>
   <p class="lead">${x.accepte} <a href="conditions.html">${x.cga}</a>.</p><button class="btn btn-r" id="go" ${S.occupe?"disabled":""}>${x.essaiBtn}</button></div>
  <div class="carte"><h2>${x.incl}</h2><ul class="arg">${x.args.map(a=>`<li>${a}</li>`).join("")}</ul><div class="note warn" style="margin:10px 0 0">${x.noDisc}</div></div>`}

function ligneDoc(d,x){return `<div class="doc"><div class="pdf">🔒<span>PDF</span></div><div><b>${esc(d.titre)}</b><span>${x.dep} ${fmt(d.depose_le)} · ${esc(rn(d.rubrique))}</span></div><button class="btn btn-p mini" data-dl="${esc(d.chemin)}">⬇️ ${x.dl}</button></div>`}
function bloque(x){return `<div class="note warn">${x.accesFerme}</div><button class="btn btn-r" data-go="4">${x.reactiver}</button>`}

function vAccueil(x){
  const kb=S.docs.find(d=>d.rubrique==="K-Bis");const age=kb?Math.round((Date.now()-new Date(kb.depose_le))/864e5):null;
  const st=S.abo?.statut||"incomplet";
  return `<div class="titre"><h1>${x.hello} ${esc(S.membre?.prenom||"")}</h1><p>${x.space}</p></div>${note()}
  ${accesOuvert()?"":bloque(x)}
  <div class="tuiles">
   <button class="tuile" data-go="4"><div class="i">💳</div><b>${x.tSub}</b><span class="puce ${st==="active"?"p-ok":st==="trialing"?"p-at":"p-re"}">${x.statut[st]||st}</span></button>
   <button class="tuile" data-go="1" data-rub="K-Bis"><div class="i">📄</div><b>${x.tKbis}</b>${kb?`<span class="puce ${age<90?"p-ok":"p-re"}">${x.tKbisS} · ${age} ${x.j}</span>`:`<span>${x.kbisAucun}</span>`}</button>
   <button class="tuile" data-go="2"><div class="i">📷</div><b>${x.tPhoto}</b><span>${x.tPhotoS}</span></button>
   <button class="tuile" data-go="3"><div class="i">📝</div><b>${x.tReq}</b><span>${x.tReqS(S.reqs.filter(r=>r.statut==="en_cours").length)}</span></button>
  </div>
  <div class="carte"><h2>${x.kbisT}</h2>${kb?`<div class="grand">${fmt(kb.depose_le)}</div>`:""}<p class="lead" style="margin-top:6px">${x.kbisTxt}</p><span class="puce p-br">${x.kbisAuto}</span></div>
  ${accesOuvert()?`<div class="carte"><h2>${x.lastT}</h2>${S.docs.length?S.docs.slice(0,3).map(d=>ligneDoc(d,x)).join(""):`<div class="vide">${x.aucunDoc}</div>`}</div>`:""}`}

function vDocs(x){
  if(!accesOuvert())return `<div class="titre"><h1>${x.docsT}</h1></div>`+bloque(x);
  const l=S.docs.filter(d=>d.rubrique===S.rub);
  return `<div class="titre"><h1>${x.docsT}</h1><p>${x.docsS}</p></div>
  <div class="rubs" role="tablist">${RUBS.map(r=>`<button class="${r===S.rub?"on":""}" data-rub="${esc(r)}" role="tab" aria-selected="${r===S.rub}">${esc(rn(r))}<span class="n">${S.docs.filter(d=>d.rubrique===r).length}</span></button>`).join("")}</div>
  <div class="carte"><h2>${esc(rn(S.rub))}</h2>${l.length?l.map(d=>ligneDoc(d,x)).join(""):`<div class="vide">${x.emptyRub}</div>`}</div>`}

function vPhoto(x){
  if(!accesOuvert())return `<div class="titre"><h1>${x.photoT}</h1></div>`+bloque(x);
  const p=S.photo;
  return `<div class="titre"><h1>${x.photoT}</h1><p>${x.photoS}</p></div><div class="note ok">${x.prio}</div>
  <div class="carte"><div class="btn-row"><button class="btn btn-r" id="take">${x.take}</button><button class="btn btn-s" id="pick">${x.pick}</button></div>
   <input type="file" id="fCam" accept="image/*" capture="environment" hidden><input type="file" id="fFile" accept="image/*" hidden>
   ${p?`<div class="apercu"><figure><canvas id="cvO"></canvas><figcaption>${x.orig}</figcaption></figure><figure><canvas id="cvC"></canvas><figcaption>${x.crop}</figcaption></figure></div>
    ${p.ok?`<div class="note ok"><b>${x.good}</b></div><div class="champ"><label for="pRub">${x.rub}</label><select id="pRub">${RUBS.map(r=>`<option value="${esc(r)}">${esc(rn(r))}</option>`).join("")}</select></div>
     <button class="btn btn-p" id="pSend" ${S.occupe?"disabled":""}>${S.occupe?x.envoiEnCours:x.send}</button>`
    :`<div class="illisible" role="alert">${x.bad}</div><p class="lead">${p.why.map(w=>x.badWhy[w]).join(" ")}</p><button class="btn btn-r" id="pRetry">${x.retry}</button>`}`:""}
  </div>
  ${S.pieces.length?`<div class="carte"><h2>${x.sentT}</h2>${S.pieces.map(e=>`<div class="envoi"><span>🧾 ${esc(rn(e.rubrique))} · ${fmt(e.cree_le)}</span><span class="puce ${e.statut==="traitee"?"p-ok":"p-at"}">${e.statut==="traitee"?"✔":x.sentOk}</span></div>`).join("")}</div>`:""}`}

function vDemandes(x){
  return `<div class="titre"><h1>${x.reqT}</h1><p>${x.reqS}</p></div>${note()}
  ${accesOuvert()?`<div class="carte"><form id="ask"><div class="duo"><div class="champ"><label for="aRub">${x.rub}</label><select id="aRub">${RUBS.map(r=>`<option value="${esc(r)}"${r===S.rub?" selected":""}>${esc(rn(r))}</option>`).join("")}</select></div>
  <div class="champ"><label for="aDoc">${x.doc}</label><input id="aDoc" required placeholder="${x.ph}"></div></div>
  <div class="champ"><label for="aMsg">${x.msg}</label><textarea id="aMsg"></textarea></div>
  <button class="btn btn-p" ${S.occupe?"disabled":""}>${x.ask}</button></form></div>`:bloque(x)}
  <div class="carte"><h2>${x.reqList}</h2>${S.reqs.length?S.reqs.map(r=>`<div class="envoi"><span><b>${esc(r.document)}</b> · ${esc(rn(r.rubrique))}</span><span class="puce ${r.statut==="traitee"?"p-ok":"p-at"}">${r.statut==="traitee"?"✔":x.pend}</span></div>`).join(""):`<div class="vide">${x.reqNone}</div>`}</div>`}

function vAbo(x){
  const a=S.abo,st=a?.statut||"incomplet";
  if(!a?.stripe_subscription_id||st==="canceled")return vEssai(x);
  const ech=a.prochaine_echeance?new Date(a.prochaine_echeance):null;
  const lim=ech?new Date(ech.getTime()-3*864e5):null;
  return `<div class="titre"><h1>${x.abT}</h1><p>${x.abS}</p></div>${note()}
  <div class="carte"><div class="duo">
   <div><label>${x.tSub}</label><span class="puce ${st==="active"?"p-ok":st==="trialing"?"p-at":"p-re"}">${x.statut[st]||st}</span>
    <p class="lead" style="margin-top:8px">${st==="trialing"?x.finEssai:x.prochain} : <b>${fmt(a.prochaine_echeance)}</b></p></div>
   <div><label>${x.tot}</label><div class="grand">${eur(PRIX*a.quantite)}</div><span class="lead">${a.quantite} × ${eur(PRIX)} ${x.perP}</span></div></div>
   <p class="lead" style="margin:10px 0 0">${x.day}</p></div>
  <div class="carte"><h2>${x.incl}</h2><ul class="arg">${x.args.map(v=>`<li>${v}</li>`).join("")}</ul><div class="note warn" style="margin:10px 0 0">${x.noDisc}</div></div>
  <div class="carte"><h2>${x.resT}</h2>
   ${a.resiliation_effet?`<div class="note warn">${x.resDone(fmt(a.resiliation_effet))}</div><button class="btn btn-s" id="undo" ${S.occupe?"disabled":""}>${x.resUndo}</button>`
   :`<p class="lead">${st==="trialing"?x.resEssai:x.resRuleR(fmt(lim))}</p><button class="btn btn-d" id="res" ${S.occupe?"disabled":""}>${x.resBtn}</button>`}</div>`}

const VUES=[vAccueil,vDocs,vPhoto,vDemandes,vAbo],ICO=["🏠","📁","📷","📝","💳"];
function render(){
  const x=t();document.documentElement.lang=S.lang==="tn"?"aeb":S.lang;document.documentElement.dir=S.lang==="tn"?"rtl":"ltr";
  let corps,nav=false;
  if(!S.user)corps=vConnexion(x);
  else if(!S.membre?.entreprise_id)corps=vRejoindre(x);
  else if(!S.abo?.stripe_subscription_id){corps=S.abo&&location.hash==="#abonnement-ok"?`<div class="note ok">${x.enAttente}</div>`:vEssai(x)}
  else{corps=VUES[S.ecran](x);nav=true}
  $("app").innerHTML=entete(x)+`<main>${corps}</main>`+pied(x)+(nav?`<nav class="bas">${x.nav.map((n,i)=>`<button class="${i===S.ecran?"on":""}" data-go="${i}" aria-current="${i===S.ecran?"page":"false"}"><span class="i">${ICO[i]}</span>${n}</button>`).join("")}</nav>`:"");
  lier(x);
  if(S.ecran===2&&S.photo&&$("cvO")){dessiner($("cvO"),S.photo.orig);dessiner($("cvC"),S.photo.crop)}
}
async function action(f,ok){S.occupe=true;render();try{await f();if(ok)S.msg=ok}catch(e){S.msg="";toast(e.message==="code_invalide"?t().codeInvalide:t().erreur);console.error(e)}S.occupe=false;await charger()}

function lier(x){
  document.querySelectorAll("[data-l]").forEach(b=>b.onclick=async()=>{S.lang=b.dataset.l;try{localStorage.setItem("cr-lang",S.lang)}catch(e){}
    if(S.membre)sb.from("membres").update({langue:S.lang}).eq("id",S.user.id);render()});
  if($("deco"))$("deco").onclick=async()=>{await sb.auth.signOut();Object.assign(S,{user:null,membre:null,ent:null,abo:null,ecran:0});render()};
  if($("inst"))$("inst").onclick=()=>window.__install.prompt();
  if($("fCnx"))$("fCnx").onsubmit=e=>{e.preventDefault();const email=$("cEmail").value.trim();
    action(async()=>{const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error},x.lienEnvoye(esc(email)))};
  if($("fJoin"))$("fJoin").onsubmit=e=>{e.preventDefault();
    action(()=>fn("rejoindre",{code:$("jCode").value,prenom:$("jPre").value,nom:$("jNom").value,langue:S.lang}),"")};
  if($("pm"))$("pm").onclick=()=>{if(S.pers>1){S.pers--;render()}};
  if($("pp"))$("pp").onclick=()=>{if(S.pers<50){S.pers++;render()}};
  if($("go"))$("go").onclick=()=>action(async()=>{const r=await fn("abonnement",{quantite:S.pers,retour:location.origin+location.pathname});location.href=r.url});
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{S.ecran=+b.dataset.go;if(b.dataset.rub)S.rub=b.dataset.rub;S.msg="";render();scrollTo(0,0)});
  document.querySelectorAll(".rubs [data-rub]").forEach(b=>b.onclick=()=>{S.rub=b.dataset.rub;render()});
  document.querySelectorAll("[data-dl]").forEach(b=>b.onclick=async()=>{
    const {data,error}=await sb.storage.from("documents").createSignedUrl(b.dataset.dl,120,{download:true});
    if(error)return toast(x.erreur);location.href=data.signedUrl});
  if($("take")){$("take").onclick=()=>$("fCam").click();$("pick").onclick=()=>$("fFile").click();
    $("fCam").onchange=$("fFile").onchange=e=>{const f=e.target.files[0];if(f)analyser(f)}}
  if($("pRetry"))$("pRetry").onclick=()=>{S.photo=null;render();$("fCam").click()};
  if($("pSend"))$("pSend").onclick=()=>{const rub=$("pRub").value;
    action(async()=>{const blob=await new Promise(r=>S.photo.crop.toBlob(r,"image/jpeg",.85));
      const chemin=`${S.ent.id}/${Date.now()}-${crypto.randomUUID().slice(0,8)}.jpg`;
      const up=await sb.storage.from("pieces").upload(chemin,blob,{contentType:"image/jpeg"});if(up.error)throw up.error;
      const {error}=await sb.from("pieces").insert({entreprise_id:S.ent.id,membre_id:S.user.id,rubrique:rub,chemin});if(error)throw error;
      S.photo=null},x.sentOk)};
  if($("ask"))$("ask").onsubmit=e=>{e.preventDefault();
    action(async()=>{const {error}=await sb.from("demandes").insert({entreprise_id:S.ent.id,membre_id:S.user.id,rubrique:$("aRub").value,document:$("aDoc").value.trim(),precisions:$("aMsg").value.trim()||null});if(error)throw error},x.asked)};
  if($("res"))$("res").onclick=()=>{const a=S.abo;
    $("modale").innerHTML=`<h3>${x.resQ}</h3><p class="lead">${a.statut==="trialing"?x.resEssai:x.resTxt(fmt(a.prochaine_echeance))}</p><div class="btn-row"><button class="btn btn-s" id="mNo">${x.cancel}</button><button class="btn btn-d" id="mOk">${x.resOk}</button></div>`;
    $("voile").classList.add("on");$("mNo").onclick=()=>$("voile").classList.remove("on");
    $("mOk").onclick=()=>{$("voile").classList.remove("on");action(()=>fn("resilier",{}),"")}};
  if($("undo"))$("undo").onclick=()=>action(()=>fn("resilier",{action:"annuler"}),"");
}

/* ---- photo : recadrage automatique + contrôle de lisibilité ---- */
function dessiner(cv,src){cv.width=src.width;cv.height=src.height;cv.getContext("2d").drawImage(src,0,0)}
function analyser(file){
  const img=new Image();img.onload=()=>{
    const max=1800,k=Math.min(1,max/Math.max(img.width,img.height));
    const o=document.createElement("canvas");o.width=Math.round(img.width*k);o.height=Math.round(img.height*k);
    const ox=o.getContext("2d",{willReadFrequently:true});ox.drawImage(img,0,0,o.width,o.height);
    const {data,width:w,height:h}=ox.getImageData(0,0,o.width,o.height);
    const g=new Float32Array(w*h);let sum=0;
    for(let i=0;i<w*h;i++){const v=.299*data[i*4]+.587*data[i*4+1]+.114*data[i*4+2];g[i]=v;sum+=v}
    const moy=sum/(w*h);
    let bs=0,bn=0;const bord=Math.max(2,Math.round(Math.min(w,h)*.03));
    for(let y=0;y<h;y++)for(let xx=0;xx<w;xx++)if(xx<bord||y<bord||xx>=w-bord||y>=h-bord){bs+=g[y*w+xx];bn++}
    const fond=bs/bn,seuil=35;let x0=w,y0=h,x1=0,y1=0;
    for(let y=0;y<h;y+=2)for(let xx=0;xx<w;xx+=2)if(Math.abs(g[y*w+xx]-fond)>seuil){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(y<y0)y0=y;if(y>y1)y1=y}
    let cw=x1-x0,ch=y1-y0;
    if(cw<w*.25||ch<h*.25||(cw>w*.97&&ch>h*.97)){x0=0;y0=0;cw=w;ch=h}
    else{const m=Math.round(Math.min(w,h)*.015);x0=Math.max(0,x0-m);y0=Math.max(0,y0-m);cw=Math.min(w-x0,cw+2*m);ch=Math.min(h-y0,ch+2*m)}
    const c=document.createElement("canvas");c.width=cw;c.height=ch;c.getContext("2d").drawImage(o,x0,y0,cw,ch,0,0,cw,ch);
    let ls=0,ls2=0,n=0;
    for(let y=Math.max(1,y0);y<Math.min(h-1,y0+ch);y+=2)for(let xx=Math.max(1,x0);xx<Math.min(w-1,x0+cw);xx+=2){
      const i=y*w+xx,l=g[i-1]+g[i+1]+g[i-w]+g[i+w]-4*g[i];ls+=l;ls2+=l*l;n++}
    const varL=n?ls2/n-(ls/n)**2:0;const why=[];
    if(Math.min(img.width,img.height)<500)why.push("petit");
    if(moy<55)why.push("sombre");else if(moy>245)why.push("clair");
    if(varL<40)why.push("flou");
    S.photo={orig:o,crop:c,ok:!why.length,why};render();
  };
  img.src=URL.createObjectURL(file);
}

/* ---- installation (PWA) ---- */
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();window.__install=e;render()});
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
sb.auth.onAuthStateChange((ev)=>{if(ev==="SIGNED_IN"||ev==="SIGNED_OUT")charger()});
if(location.hash==="#abonnement-ok"){S.msg=t().essaiOk;setTimeout(charger,4000)}
charger();
