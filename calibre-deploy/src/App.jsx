import { useState, useRef, useEffect } from "react";

const SUPA_URL="https://wzygqvtexcyamoqayidf.supabase.co";
const SUPA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eWdxdnRleGN5YW1vcWF5aWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDczMzgsImV4cCI6MjA5NTYyMzMzOH0.fvQO5s7-XH9DxzHfWzDBqLbtqbIJ7Tp1h2c_IdsP-a4";
const SH={"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+SUPA_KEY};
const db={async get(t){try{const r=await fetch(SUPA_URL+"/rest/v1/"+t+"?order=created_at.asc",{headers:SH});return await r.json();}catch{return [];}},async upsert(t,d){try{await fetch(SUPA_URL+"/rest/v1/"+t,{method:"POST",headers:{...SH,"Prefer":"resolution=merge-duplicates"},body:JSON.stringify(d)});}catch{}},async remove(t,id){try{await fetch(SUPA_URL+"/rest/v1/"+t+"?id=eq."+encodeURIComponent(id),{method:"DELETE",headers:SH});}catch{}}};
const getLS=()=>{try{return localStorage.getItem("cal_v8_s");}catch{return null;}};
const setLS=(id)=>{try{localStorage.setItem("cal_v8_s",id||"");}catch{}};

const CODE_AGENCE = "CALIBRE2026";
const LAC_BG = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80&fit=crop";
const LAC_BG_2 = "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=75&fit=crop";

const C = {
  bg:"#f0f6f8", white:"#ffffff", blue:"#0a3d62", blueMid:"#1a6b9e",
  blueLight:"#2e9bd6", teal:"#0d7a8a", tealLight:"#1ab5cc",
  gold:"#c8972a", goldLight:"#f0c040",
  text:"#0a2540", textSub:"#4a6fa5", textMuted:"#8aaac8",
  border:"rgba(255,255,255,0.45)", borderDark:"rgba(10,61,98,0.12)",
  success:"#0d9e6e", warning:"#c8820a", danger:"#c0392b",
};

const ROLES = ["Directeur","Agent","Agente","Négociateur","Négociatrice","Commercial","Assistante"];
const STAGES = [
  { id:"nouveau", label:"Nouveau", color:"#64748b" },
  { id:"qualification", label:"Qualifié", color:"#c8820a" },
  { id:"recherche", label:"En recherche", color:"#2563eb" },
  { id:"visite", label:"Visites", color:"#7c3aed" },
  { id:"offre", label:"Offre", color:"#db2777" },
  { id:"compromis", label:"Compromis", color:"#0d9e6e" },
];
const DPE_ORDER = ["A","B","C","D","E","F","G"];
const AGENT_COLORS = ["#0a3d62","#1a6b9e","#0d7a8a","#7c3aed","#db2777","#c8820a","#0d9e6e","#c0392b","#6366f1","#0d9488"];

// ── STORAGE ───────────────────────────────────────────────────────────────────
const SK = { agents:"cal_v7_agents", acq:"cal_v7_acq", biens:"cal_v7_biens", notifs:"cal_v7_notifs", session:"cal_v7_session" };
const load = (k, fb) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } };
const save = (k, d) => { try { localStorage.setItem(k, JSON.stringify(d)); } catch {} };

const DEFAULT_AGENTS = [
  { id:"romain", nom:"Romain", prenom:"Calibre", role:"Directeur", color:"#0a3d62", avatar:"R", statut:"approuve", photo:null, dateInscription:"2026-01-01" },
];

const getInitiale = n => (n||"?").charAt(0).toUpperCase();
const getColor = i => AGENT_COLORS[i % AGENT_COLORS.length];

// ── IMPORT PDF ────────────────────────────────────────────────────────────────
async function callClaude(body) {
  try {
    const r = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, model: "claude-sonnet-4-6" })
    });
    const d = await r.json();
    if (d.error) { console.error("API:", d.error); return null; }
    const t = d.content?.[0]?.text || "{}";
    return JSON.parse(t.replace(/```json|```/g,"").trim());
  } catch(e) { console.error("Claude:", e); return null; }
}

async function importerPDF(file) {
  try {
    // Charger PDF.js via script tag si pas encore chargé
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          window.pdfjsLib = window['pdfjs-dist/build/pdf'];
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let texte = '';
    const nbPages = Math.min(pdfDoc.numPages, 15);
    for (let i = 1; i <= nbPages; i++) {
      const page = await pdfDoc.getPage(i);
      const content = await page.getTextContent();
      texte += content.items.map(item => item.str).join(' ') + '\n';
    }
    texte = texte.replace(/\s+/g, ' ').trim().substring(0, 6000);
    
    if (!texte) { alert("Impossible d'extraire le texte du PDF."); return {}; }
    
    const prompt = "Extrais les données immobilières de ce texte en JSON pur sans backticks. Champs: type,prix,surface,surface_terrain,pieces,chambres,salles_de_bain,adresse,ville,code_postal,dpe,annee_construction,taxe_fonciere,numero_mandat,description,caracteristiques:[],detail_pieces:[{nom,surface,niveau}],surfaces_annexes:[{nom,surface}]. null si absent.";
    
    const res = await callClaude({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages:[{ role:"user", content: prompt + "\n\n" + texte }]
    });
    return res || {};
  } catch(e) {
    console.error("importerPDF:", e);
    alert("Erreur: " + e.message);
    return {};
  }
}

async function importerAnnonce(url) {
  let contenu = `URL de l'annonce: ${url}`;
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy);
    const data = await res.json();
    contenu = (data.contents || "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .substring(0, 5000) || contenu;
  } catch { /* utilise l'URL brute */ }

  const prompt = `Extrais les caractéristiques de ce bien immobilier depuis cette annonce.
Contenu: "${contenu}"
Réponds UNIQUEMENT en JSON valide sans backticks:
{
  "type":"Appartement"|"Maison"|"Studio"|"Terrain",
  "prix":number|null,
  "surface":number|null,
  "surface_terrain":number|null,
  "pieces":number|null,
  "chambres":number|null,
  "salles_de_bain":number|null,
  "etage":number|null,
  "adresse":"adresse complète"|null,
  "ville":"ville"|null,
  "code_postal":"CP"|null,
  "caracteristiques":["piscine","jardin","terrasse","garage","parking","cave","balcon","dressing","buanderie","bureau","plancher_chauffant","cuisine_equipee"],
  "dpe":"A"|"B"|"C"|"D"|"E"|"F"|"G"|null,
  "annee_construction":number|null,
  "taxe_fonciere":number|null,
  "description":"description du bien en 2-3 phrases",
  "titre":"titre de l'annonce",
  "source":"IAD"|"SeLoger"|"Leboncoin"|"BienIci"|"PAP"|"Logic-Immo"|"autre"
}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:800,
        messages:[{ role:"user", content:prompt }]
      })
    });
    const d = await r.json();
    return JSON.parse((d.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim());
  } catch { return {}; }
}

// ── IA ACQUÉREUR ──────────────────────────────────────────────────────────────
async function analyserCriteresAcquereur(note) {
  const prompt = `Extrais les critères de recherche d'un acquéreur immobilier.
Note: "${note}"
Réponds UNIQUEMENT en JSON sans backticks:
{
  "budget_max":number|null,
  "budget_min":number|null,
  "type":"Appartement"|"Maison"|"Studio"|"Terrain"|null,
  "pieces_min":number|null,
  "chambres_min":number|null,
  "surface_min":number|null,
  "surface_terrain_min":number|null,
  "villes":["ville ou CP"],
  "exigences":["piscine","jardin","terrasse","garage","parking","cave","balcon","dressing","bureau","cuisine_equipee","plancher_chauffant","panneaux_solaires"],
  "exclusions":["RDC","travaux"],
  "criteres_pieces":[{"nom":"nom de la pièce cherchée","surface_min":number|null,"surface_max":number|null}],
  "dpe_max":"A"|"B"|"C"|"D"|"E"|"F"|"G"|null,
  "annee_construction_min":number|null,
  "resume":"1 phrase courte"
}`;
  const res = await callClaude({ max_tokens:800, messages:[{ role:"user", content:prompt }] });
  return res || {};
}

// ── MATCHING BIDIRECTIONNEL ───────────────────────────────────────────────────
function calculerScore(bien, criteres) {
  const c = criteres || {}; let score = 0; const ok = []; const ko = []; const pieceMatches = [];

  // Type (20pts)
  if (c.type && bien.type === c.type) { score += 20; ok.push(`Type ${bien.type} ✓`); }
  else if (c.type) ko.push(`Type souhaité: ${c.type}`);

  // Prix (20pts)
  if (c.budget_max && bien.prix <= c.budget_max) { score += 20; ok.push(`Prix ${(bien.prix/1000).toFixed(0)}k€ ✓`); }
  else if (c.budget_max) ko.push(`Prix ${(bien.prix/1000).toFixed(0)}k€ > budget`);

  // Surface habitable (10pts)
  if (c.surface_min && bien.surface >= c.surface_min) { score += 10; ok.push(`${bien.surface}m² ≥ ${c.surface_min}m² ✓`); }
  else if (c.surface_min) ko.push(`Surface ${bien.surface||0}m² < ${c.surface_min}m²`);

  // Surface terrain (5pts)
  if (c.surface_terrain_min) {
    if (bien.surface_terrain >= c.surface_terrain_min) { score += 5; ok.push(`Terrain ${bien.surface_terrain}m² ✓`); }
    else ko.push(`Terrain ${bien.surface_terrain||0}m² < ${c.surface_terrain_min}m²`);
  }

  // Pièces (8pts)
  if (c.pieces_min && bien.pieces >= c.pieces_min) { score += 8; ok.push(`${bien.pieces}p ≥ ${c.pieces_min}p ✓`); }
  else if (c.pieces_min) ko.push(`${bien.pieces||0}p < ${c.pieces_min}p min`);

  // Chambres (5pts)
  if (c.chambres_min && bien.chambres >= c.chambres_min) { score += 5; ok.push(`${bien.chambres} ch. ✓`); }
  else if (c.chambres_min) ko.push(`${bien.chambres||0} ch. < ${c.chambres_min} min`);

  // Équipements (3pts chacun)
  const caract = [...(bien.caracteristiques||[]),
    bien.piscine&&"piscine", bien.jardin&&"jardin", bien.terrasse&&"terrasse",
    bien.garage&&"garage", bien.parking&&"parking"
  ].filter(Boolean);
  (c.exigences||[]).forEach(ex => {
    if (caract.some(x => x?.toLowerCase().includes(ex.toLowerCase()))) { score += 3; ok.push(`${ex} ✓`); }
    else ko.push(`${ex} absent`);
  });

  // Exclusions
  if (c.exclusions?.includes("RDC") && bien.etage > 0) { score += 2; ok.push("Pas RDC ✓"); }
  if (c.exclusions?.includes("travaux") && bien.annee_construction >= 2000) { score += 2; ok.push("Récent ✓"); }

  // DPE (3pts)
  if (c.dpe_max && bien.dpe && DPE_ORDER.indexOf(bien.dpe) <= DPE_ORDER.indexOf(c.dpe_max)) {
    score += 3; ok.push(`DPE ${bien.dpe} ✓`);
  }

  // Secteur (10pts)
  const vm = (c.villes||[]).some(v =>
    bien.adresse?.toLowerCase().includes(v.toLowerCase()) ||
    bien.ville?.toLowerCase().includes(v.toLowerCase()) ||
    bien.code_postal?.includes(v)
  );
  if (vm) { score += 10; ok.push("Secteur ✓"); }
  else if ((c.villes||[]).length) ko.push(`Secteur: ${c.villes.join(", ")}`);

  // MATCHING PAR PIÈCE (8pts chacune)
  if (c.criteres_pieces?.length && bien.detail_pieces?.length) {
    c.criteres_pieces.forEach(cp => {
      if (!cp.nom) return;
      const nomC = cp.nom.toLowerCase();
      const piecesBien = bien.detail_pieces.filter(p => {
        const nomP = p.nom?.toLowerCase()||"";
        if (nomC.includes("salon")||nomC.includes("pièce de vie")||nomC.includes("séjour")||nomC.includes("salle à manger")||nomC.includes("living"))
          return nomP.includes("salon")||nomP.includes("séjour")||nomP.includes("salle à manger")||nomP.includes("pièce de vie")||nomP.includes("living");
        if (nomC.includes("chambre")) return nomP.includes("chambre");
        if (nomC.includes("cuisine")) return nomP.includes("cuisine");
        if (nomC.includes("bureau")) return nomP.includes("bureau");
        if (nomC.includes("salle de bain")||nomC.includes("sdb")) return nomP.includes("salle de bain")||nomP.includes("salle d'eau");
        if (nomC.includes("garage")) return nomP.includes("garage");
        if (nomC.includes("terrasse")) return nomP.includes("terrasse");
        return nomP.includes(nomC);
      });
      if (!piecesBien.length) { ko.push(`${cp.nom}: non présent`); return; }
      const pieceOk = piecesBien.find(p => {
        if (!p.surface) return true;
        return (!cp.surface_min||p.surface>=cp.surface_min) && (!cp.surface_max||p.surface<=cp.surface_max);
      });
      if (pieceOk) {
        score += 8;
        const range = cp.surface_min&&cp.surface_max?`${cp.surface_min}-${cp.surface_max}m²`:cp.surface_min?`≥${cp.surface_min}m²`:cp.surface_max?`≤${cp.surface_max}m²`:"";
        ok.push(cp.nom+(pieceOk.surface?' '+pieceOk.surface+'m²':'')+' '+(range?'→'+range:'')+' ✓');
        pieceMatches.push({ nom:cp.nom, surface:pieceOk.surface, ok:true, range });
      } else {
        const best = piecesBien[0];
        ko.push(`${cp.nom} ${best.surface||"?"}m² hors critères`);
        pieceMatches.push({ nom:cp.nom, surface:best.surface, ok:false });
      }
    });
  }

  return { score:Math.min(score,100), ok, ko, pieceMatches };
}

function matcherBiensPourAcquereur(acq, biens) {
  return biens.map(b => ({ ...b, ...calculerScore(b, acq.criteres) }))
    .filter(b => b.score >= 25).sort((a,b) => b.score - a.score);
}

function matcherAcquereursPourBien(bien, acquereurs) {
  return acquereurs.map(acq => ({ ...acq, ...calculerScore(bien, acq.criteres) }))
    .filter(a => a.score >= 25).sort((a,b) => b.score - a.score);
}

// ── PHOTO PICKER ──────────────────────────────────────────────────────────────
function PhotoPicker({ current, onPhoto, size=80, label="" }) {
  const ref = useRef(null);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <div onClick={()=>ref.current?.click()} style={{
        width:size, height:size, borderRadius:"50%", cursor:"pointer", overflow:"hidden",
        background:current?"transparent":`linear-gradient(135deg,${C.teal},${C.blueLight})`,
        border:`3px solid ${C.goldLight}`, boxShadow:`0 4px 20px rgba(10,61,98,0.25)`,
        display:"flex", alignItems:"center", justifyContent:"center", position:"relative",
      }}>
        {current ? <img src={current} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:size*0.35}}>📷</span>}
        <div style={{position:"absolute",bottom:0,right:0,width:22,height:22,borderRadius:"50%",background:C.gold,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>✏️</div>
      </div>
      {label&&<span style={{fontSize:11,color:C.textMuted}}>{label}</span>}
      <input ref={ref} type="file" accept="image/*" capture="environment" onChange={e=>{
        const f=e.target.files[0]; if(!f) return;
        const r=new FileReader(); r.onload=ev=>onPhoto(ev.target.result); r.readAsDataURL(f);
      }} style={{display:"none"}}/>
    </div>
  );
}

function Avatar({ photo, initiale, color, size=40, border=false }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%", flexShrink:0, overflow:"hidden",
      background:photo?"transparent":`linear-gradient(135deg,${color}ee,${color}88)`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontWeight:900, fontSize:size*0.4, color:"#fff",
      border:border?`2px solid ${C.goldLight}`:"none",
      boxShadow:border?`0 2px 12px rgba(10,61,98,0.2)`:"none",
    }}>
      {photo?<img src={photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initiale}
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [agents, setAgents] = useState(DEFAULT_AGENTS);
  const [acquereurs, setAcquereurs] = useState([]);
  const [biens, setBiens] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [sessionId,setSessionId]=useState(()=>getLS());
  const [appLoading,setAppLoading]=useState(true);
  const [authScreen, setAuthScreen] = useState("login");

  useEffect(()=>{const load=async()=>{const[ag,acq,bi,no]=await Promise.all([db.get("agents"),db.get("acquereurs"),db.get("biens"),db.get("notifications")]);if(ag&&ag.length)setAgents(ag.map(a=>({...a,agentId:a.agent_id,dateInscription:a.date_inscription,biens_visites:a.biens_visites||[],criteres:a.criteres||{}})));if(acq&&acq.length)setAcquereurs(acq.map(a=>({...a,agentId:a.agent_id,biens_visites:a.biens_visites||[],criteres:a.criteres||{}})));if(bi&&bi.length)setBiens(bi.map(b=>({...b,agentId:b.agent_id,caracteristiques:b.caracteristiques||[],detail_pieces:b.detail_pieces||[],surfaces_annexes:b.surfaces_annexes||[]})));if(no&&no.length)setNotifs(no.map(n=>({...n,toAgentId:n.to_agent_id,fromAgentId:n.from_agent_id})));setAppLoading(false);};load();const t=setInterval(load,8000);return()=>clearInterval(t);},[]);

  const agentCo=sessionId?agents.find(a=>a.id===sessionId):null;
  const enAttente = agents.filter(a=>a.statut==="en_attente");

  const inscrire = async data => {
    const na={...data,id:Date.now().toString(),color:getColor(agents.length),avatar:getInitiale(data.nom),statut:"en_attente",photo:null,dateInscription:new Date().toISOString().split("T")[0]};
    await db.upsert("agents",{id:na.id,nom:na.nom,prenom:na.prenom||"",role:na.role,color:na.color,avatar:na.avatar,statut:na.statut,photo:null,date_inscription:na.dateInscription});
    setAgents(l=>[...l,na]);
    const dirId=agents.find(a=>a.role==="Directeur")?.id||"romain";
    setNotifs(ns=>[{id:Date.now(),type:"inscription",toAgentId:dirId,fromAgentId:na.id,msg:`🆕 ${na.nom} ${na.prenom} (${na.role}) demande à rejoindre l'agence`,lu:false,date:new Date().toLocaleString("fr-FR")},...ns]);
    setLS(na.id); setSessionId(na.id); setAuthScreen("pending");
  };
  const approuver=async id=>{await db.upsert("agents",{id,statut:"approuve"});const n={id:Date.now().toString(),type:"approuve",to_agent_id:id,msg:"✅ Votre compte a été approuvé ! Bienvenue dans l'équipe.",lu:false,date:new Date().toLocaleString("fr-FR")};await db.upsert("notifications",n);setAgents(l=>l.map(a=>a.id===id?{...a,statut:"approuve"}:a));setNotifs(ns=>[{...n,toAgentId:id,fromAgentId:""},...ns]);};
  const refuser=async id=>{await db.upsert("agents",{id,statut:"refuse"});setAgents(l=>l.map(a=>a.id===id?{...a,statut:"refuse"}:a));};
  const sendNotif=async(from,toId,msg)=>{const n={id:Date.now().toString(),to_agent_id:toId,from_agent_id:from.id,msg,lu:false,date:new Date().toLocaleString("fr-FR")};await db.upsert("notifications",n);setNotifs(ns=>[{...n,toAgentId:toId,fromAgentId:from.id},...ns]);};
  const updateAgent=async u=>{await db.upsert("agents",{id:u.id,nom:u.nom,prenom:u.prenom||"",role:u.role,color:u.color,avatar:u.avatar,statut:u.statut,photo:u.photo||null,date_inscription:u.dateInscription||""});setAgents(l=>l.map(a=>a.id===u.id?u:a));};

  if(appLoading)return(<div style={S.shell}><div style={S.phone}><div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"linear-gradient(160deg,#0a3d62,#0d7a8a)"}}><div style={{fontSize:56}}>🏠</div><div style={{fontSize:22,fontWeight:900,color:"#fff",marginTop:8}}>Calibre</div><div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:4}}>Synchronisation...</div></div></div></div>);
  if (!agentCo) {
    if (authScreen==="signup") return <SignupScreen onBack={()=>setAuthScreen("login")} onInscrire={inscrire}/>;
    if (authScreen==="pending") {
      const me=session?agents.find(a=>a.id===session):null;
      if (me?.statut!=="approuve") return <PendingScreen nom={me?.nom} onLogout={()=>(setSessionId(null)||setAuthScreen("login"))}/>;
    }
    return <LoginScreen agents={agents.filter(a=>a.statut==="approuve")} onLogin={id=>setSessionId(id)} onSignup={()=>setAuthScreen("signup")}/>;
  }
  if (agentCo.statut==="en_attente") return <PendingScreen nom={agentCo.nom} onLogout={()=>(setSessionId(null)||setAuthScreen("login"))}/>;
  if (agentCo.statut==="refuse") return <div style={S.shell}><div style={S.phone}><div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}><div style={{fontSize:56,marginBottom:16}}>❌</div><div style={{fontSize:20,fontWeight:900,color:C.danger}}>Accès refusé</div><button onClick={()=>(setSessionId(null)||setAuthScreen("login"))} style={{...S.primaryBtn,marginTop:24}}>Retour</button></div></div></div>;

  return <CRMApp agent={agentCo} agents={agents.filter(a=>a.statut==="approuve")} acquereurs={acquereurs} setAcquereurs={setAcquereurs} biens={biens} setBiens={setBiens} notifs={notifs} setNotifs={setNotifs} enAttente={enAttente} onApprouver={approuver} onRefuser={refuser} onLogout={()=>(setSessionId(null)||setAuthScreen("login"))} onNotif={sendNotif} onUpdateAgent={updateAgent}/>;
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({ agents, onLogin, onSignup }) {
  return (
    <div style={S.shell}><div style={S.phone}>
      <div style={{position:"absolute",inset:0,borderRadius:36,overflow:"hidden",zIndex:0}}>
        <img src={LAC_BG} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(5,25,50,0.55) 0%,rgba(10,61,98,0.8) 50%,rgba(5,20,40,0.95) 100%)"}}/>
      </div>
      <div style={{position:"relative",zIndex:1,flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 28px"}}>
        <div style={{fontSize:60,filter:"drop-shadow(0 4px 20px rgba(0,0,0,0.4))"}}>🏠</div>
        <div style={{fontSize:36,fontWeight:900,color:"#fff",letterSpacing:"-0.03em",textShadow:"0 2px 20px rgba(0,0,0,0.5)",marginTop:6}}>Calibre</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.55)",fontStyle:"italic",marginBottom:36,letterSpacing:"0.05em"}}>Toit toit mon toit</div>
        <div style={{width:"100%",background:"rgba(255,255,255,0.12)",backdropFilter:"blur(20px)",borderRadius:24,border:"1px solid rgba(255,255,255,0.25)",padding:20,boxShadow:"0 8px 32px rgba(0,0,0,0.3)"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",textAlign:"center",marginBottom:14}}>Choisir mon profil</div>
          {agents.length===0?<button onClick={onSignup} style={S.glassBtn}>Créer le premier compte</button>:<>
            {agents.map(a=>(
              <button key={a.id} onClick={()=>onLogin(a.id)} style={S.agentLoginBtn}>
                <Avatar photo={a.photo} initiale={a.avatar} color={a.color} size={42} border/>
                <div style={{flex:1,textAlign:"left"}}><div style={{fontWeight:700,color:"#fff",fontSize:15}}>{a.nom} {a.prenom}</div><div style={{fontSize:12,color:"rgba(255,255,255,0.55)"}}>{a.role}</div></div>
                <span style={{color:C.goldLight,fontSize:18}}>›</span>
              </button>
            ))}
            <button onClick={onSignup} style={{...S.glassBtn,marginTop:10}}>+ Créer un compte</button>
          </>}
        </div>
        <div style={{marginTop:16,fontSize:11,color:"rgba(255,255,255,0.25)",letterSpacing:"0.06em"}}>Lac de Saint-Cassien • Var</div>
      </div>
    </div></div>
  );
}

function SignupScreen({ onBack, onInscrire }) {
  const [nom,setNom]=useState(""); const [prenom,setPrenom]=useState(""); const [role,setRole]=useState("Agent");
  const [code,setCode]=useState(""); const [err,setErr]=useState("");
  const soumettre = () => {
    if (!nom.trim()||!prenom.trim()) { setErr("Renseignez votre nom et prénom."); return; }
    if (code.trim().toUpperCase()!==CODE_AGENCE) { setErr("Code agence incorrect."); return; }
    onInscrire({nom:nom.trim(),prenom:prenom.trim(),role});
  };
  return (
    <div style={S.shell}><div style={S.phone}>
      <div style={{position:"absolute",inset:0,borderRadius:36,overflow:"hidden",zIndex:0}}>
        <img src={LAC_BG_2} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(5,25,50,0.6),rgba(5,20,40,0.92))"}}/>
      </div>
      <div style={{position:"relative",zIndex:1,flex:1,overflowY:"auto"}}>
        <div style={{padding:"52px 20px 16px",display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={S.glassBackBtn}>←</button>
          <div><div style={{fontSize:20,fontWeight:900,color:"#fff"}}>Créer mon compte</div><div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>Agence Calibre</div></div>
        </div>
        <div style={{padding:"0 20px 32px"}}>
          <div style={{background:"rgba(255,255,255,0.1)",backdropFilter:"blur(16px)",borderRadius:20,border:"1px solid rgba(255,255,255,0.2)",padding:20,marginBottom:16}}>
            <GlassInput label="Nom *" val={nom} set={setNom} ph="Dupont"/>
            <GlassInput label="Prénom *" val={prenom} set={setPrenom} ph="Sophie"/>
            <div style={{marginBottom:12}}><label style={S.glassLabel}>Rôle</label><select value={role} onChange={e=>setRole(e.target.value)} style={S.glassSelect}>{ROLES.map(r=><option key={r}>{r}</option>)}</select></div>
            <GlassInput label="Code agence *" val={code} set={setCode} ph="Demandez à votre directeur" type="password"/>
            {err&&<div style={{background:"rgba(192,57,43,0.2)",border:"1px solid rgba(192,57,43,0.4)",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#ff8a7a",marginTop:4}}>⚠️ {err}</div>}
          </div>
          <button onClick={soumettre} disabled={!nom||!prenom||!code} style={{...S.primaryGlassBtn,opacity:!nom||!prenom||!code?0.5:1}}>Envoyer ma demande →</button>
        </div>
      </div>
    </div></div>
  );
}

function PendingScreen({ nom, onLogout }) {
  return (
    <div style={S.shell}><div style={S.phone}>
      <div style={{position:"absolute",inset:0,borderRadius:36,overflow:"hidden",zIndex:0}}>
        <img src={LAC_BG} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
        <div style={{position:"absolute",inset:0,background:"rgba(5,20,40,0.85)"}}/>
      </div>
      <div style={{position:"relative",zIndex:1,flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
        <div style={{fontSize:56,marginBottom:16}}>⏳</div>
        <div style={{fontSize:22,fontWeight:900,color:"#fff",marginBottom:8}}>Demande envoyée !</div>
        <div style={{fontSize:14,color:"rgba(255,255,255,0.6)",lineHeight:1.7,marginBottom:28}}>Bonjour {nom} !<br/>Votre directeur va valider votre compte.</div>
        <button onClick={onLogout} style={{...S.glassBtn,width:"auto",padding:"10px 24px"}}>Retour à l'accueil</button>
      </div>
    </div></div>
  );
}

// ── CRM ───────────────────────────────────────────────────────────────────────
function CRMApp({ agent, agents, acquereurs, setAcquereurs, biens, setBiens, notifs, setNotifs, enAttente, onApprouver, onRefuser, onLogout, onNotif, onUpdateAgent }) {
  const [nav, setNav] = useState("acquereurs");
  const [stack, setStack] = useState([{screen:"list"}]);
  const push = s => setStack(x=>[...x,s]);
  const pop  = () => setStack(x=>x.length>1?x.slice(0,-1):x);
  const cur  = stack[stack.length-1];
  const myNotifs = notifs.filter(n=>n.toAgentId===agent.id&&!n.lu).length;
  const isDir = agent.role==="Directeur";
  const totalBadge = myNotifs+(isDir?enAttente.length:0);

  // Stats globales
  const nbBiens = biens.length;
  const nbAcq = acquereurs.length;
  const nbMatchTotal = acquereurs.reduce((acc,acq)=>acc+matcherBiensPourAcquereur(acq,biens).length,0);

  return (
    <div style={S.shell}><div style={S.phone}>
      <div style={{position:"absolute",inset:0,borderRadius:36,overflow:"hidden",zIndex:0}}>
        <img src={LAC_BG} alt="" style={{width:"100%",height:"35%",objectFit:"cover",objectPosition:"center top"}} onError={e=>e.target.style.display="none"}/>
        <div style={{position:"absolute",top:0,left:0,right:0,height:"35%",background:"linear-gradient(180deg,rgba(5,25,50,0.7) 0%,rgba(240,246,248,1) 100%)"}}/>
        <div style={{position:"absolute",top:"35%",left:0,right:0,bottom:0,background:C.bg}}/>
      </div>
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
        {/* TOP BAR */}
        <div style={{padding:"18px 18px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:26,filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.35))"}}>🏠</span>
            <div>
              <div style={{fontSize:20,fontWeight:900,color:"#fff",letterSpacing:"-0.02em",textShadow:"0 2px 10px rgba(0,0,0,0.4)"}}>Calibre</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.5)",fontStyle:"italic"}}>Toit toit mon toit</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {totalBadge>0&&<button onClick={()=>{setNav("notifs");setStack([{screen:"list"}]);}} style={{background:"rgba(255,255,255,0.2)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:20,padding:"5px 10px",color:"#fff",fontSize:13,cursor:"pointer",position:"relative"}}>🔔<span style={{position:"absolute",top:-3,right:-3,background:C.danger,color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{totalBadge}</span></button>}
            <div onClick={onLogout} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.18)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:24,padding:"4px 10px 4px 4px",cursor:"pointer"}}>
              <Avatar photo={agent.photo} initiale={agent.avatar} color={agent.color} size={28} border/>
              <span style={{fontSize:12,fontWeight:700,color:"#fff"}}>{agent.nom}</span>
            </div>
          </div>
        </div>

        {/* STATS RAPIDES */}
        <div style={{display:"flex",gap:8,padding:"0 16px 10px"}}>
          {[[nbAcq,"Acquéreurs","👤",C.teal],[nbBiens,"Biens","🏡",C.gold],[nbMatchTotal,"Matchs","🎯",C.success]].map(([n,lb,ic,col])=>(
            <div key={lb} style={{flex:1,background:"rgba(255,255,255,0.85)",backdropFilter:"blur(10px)",borderRadius:12,padding:"8px 6px",textAlign:"center",border:`1px solid ${col}20`}}>
              <div style={{fontSize:9,marginBottom:2}}>{ic}</div>
              <div style={{fontSize:18,fontWeight:900,color:col}}>{n}</div>
              <div style={{fontSize:9,color:C.textMuted,textTransform:"uppercase"}}>{lb}</div>
            </div>
          ))}
        </div>

        {/* NAV */}
        <div style={{display:"flex",background:"rgba(255,255,255,0.9)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${C.borderDark}`,margin:"0 12px",borderRadius:"14px 14px 0 0",overflow:"hidden"}}>
          {[["acquereurs","👤","Acquéreurs"],["biens","🏡","Biens"],["equipe","👥","Équipe"],["notifs","🔔","Notifs"]].map(([id,ic,lb])=>(
            <button key={id} onClick={()=>{setNav(id);setStack([{screen:"list"}]);}}
              style={{flex:1,background:"none",border:"none",borderBottom:`2px solid ${nav===id?C.teal:"transparent"}`,padding:"10px 0 8px",fontSize:11,fontWeight:700,color:nav===id?C.teal:C.textMuted,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
              <span style={{position:"relative"}}>{ic}{id==="notifs"&&totalBadge>0&&<span style={{position:"absolute",top:-4,right:-5,background:C.danger,color:"#fff",borderRadius:"50%",width:14,height:14,fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{totalBadge}</span>}</span>
              <span style={{fontSize:9}}>{lb}</span>
            </button>
          ))}
        </div>

        <div style={{flex:1,background:C.bg,margin:"0 12px",borderRadius:"0 0 14px 14px",overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {nav==="acquereurs"&&cur.screen==="list"&&<AcqList acquereurs={acquereurs} biens={biens} agents={agents} agent={agent} onSelect={a=>push({screen:"detail",id:a.id})} onNew={()=>push({screen:"new"})}/>}
          {nav==="acquereurs"&&cur.screen==="detail"&&<AcqDetail acq={acquereurs.find(a=>a.id===cur.id)} biens={biens} agents={agents} agent={agent} onBack={pop} onUpdate={async a=>{await db.upsert("acquereurs",{id:a.id,agent_id:a.agentId,nom:a.nom||"",prenom:a.prenom||"",tel:a.tel||"",email:a.email||"",photo:a.photo||null,stage:a.stage||"nouveau",qualification:a.qualification||null,note_brute:a.note_brute||"",criteres:a.criteres||{},situation:a.situation||"",nb_enfants:a.nb_enfants||0,metier_m:a.metier_m||"",metier_f:a.metier_f||"",notes_profil:a.notes_profil||"",biens_visites:a.biens_visites||[],alerte:a.alerte||false,date:a.date||""});setAcquereurs(l=>l.map(x=>x.id===a.id?a:x));}} onNotif={onNotif}/>}
          {nav==="acquereurs"&&cur.screen==="new"&&<NewAcq agent={agent} onBack={pop} onSave={async a=>{const na={...a,id:Date.now().toString(),biens_visites:[],alerte:false,date:new Date().toISOString().split("T")[0]};await db.upsert("acquereurs",{id:na.id,agent_id:na.agentId,nom:na.nom||"",prenom:na.prenom||"",tel:na.tel||"",email:na.email||"",photo:null,stage:na.stage||"nouveau",criteres:na.criteres||{},biens_visites:[],alerte:false,date:na.date});setAcquereurs(l=>[...l,na]);pop();}}/>}
          {nav==="biens"&&cur.screen==="list"&&<BienList biens={biens} acquereurs={acquereurs} agents={agents} agent={agent} onSelect={b=>push({screen:"detail",id:b.id})} onNew={()=>push({screen:"new"})}/>}
          {nav==="biens"&&cur.screen==="detail"&&<BienDetail bien={biens.find(b=>b.id===cur.id)} acquereurs={acquereurs} agents={agents} agent={agent} onBack={pop} onNotif={onNotif} onDelete={async id=>{await db.remove("biens",id);setBiens(l=>l.filter(b=>b.id!==id));pop();}}/>}
          {nav==="biens"&&cur.screen==="new"&&<NewBien agent={agent} onBack={pop} onSave={async b=>{const nb={...b,id:Date.now().toString(),date:new Date().toISOString().split("T")[0],statut:"disponible"};await db.upsert("biens",{id:nb.id,agent_id:nb.agentId,adresse:nb.adresse||"",ville:nb.ville||"",type:nb.type||"Maison",prix:nb.prix||0,surface:nb.surface||0,surface_terrain:nb.surface_terrain||0,pieces:nb.pieces||0,chambres:nb.chambres||0,dpe:nb.dpe||"",description:nb.description||"",caracteristiques:nb.caracteristiques||[],detail_pieces:nb.detail_pieces||[],surfaces_annexes:nb.surfaces_annexes||[],piscine:nb.piscine||false,jardin:nb.jardin||false,terrasse:nb.terrasse||false,garage:nb.garage||false,parking:nb.parking||false,statut:"disponible",date:nb.date});setBiens(l=>[...l,nb]);pop();}}/>}
          {nav==="equipe"&&<EquipeView agents={agents} acquereurs={acquereurs} biens={biens} agent={agent} enAttente={enAttente} onApprouver={onApprouver} onRefuser={onRefuser} onUpdateAgent={onUpdateAgent}/>}
          {nav==="notifs"&&<NotifsView notifs={notifs.filter(n=>n.toAgentId===agent.id)} agents={agents} enAttente={isDir?enAttente:[]} onApprouver={onApprouver} onRefuser={onRefuser} onRead={async id=>{await db.upsert("notifications",{id,lu:true});setNotifs(ns=>ns.map(n=>n.id===id?{...n,lu:true}:n));}} onReadAll={async()=>{const mine=notifs.filter(n=>n.toAgentId===agent.id&&!n.lu);for(const n of mine)await db.upsert("notifications",{id:n.id,lu:true});setNotifs(ns=>ns.map(n=>n.toAgentId===agent.id?{...n,lu:true}:n));}}/>}
        </div>
      </div>
    </div></div>
  );
}

// ── LISTE ACQUÉREURS ──────────────────────────────────────────────────────────
function AcqList({ acquereurs, biens, agents, agent, onSelect, onNew }) {
  const [search,setSearch]=useState(""); const [filter,setFilter]=useState("tous");
  const filtered=acquereurs.filter(a=>{const q=a.nom.toLowerCase().includes(search.toLowerCase());if(filter==="moi")return q&&a.agentId===agent.id;if(filter==="equipe")return q&&a.agentId!==agent.id;return q;});
  return (
    <div style={S.si}>
      <div style={S.listTop}><input placeholder="🔍 Rechercher…" value={search} onChange={e=>setSearch(e.target.value)} style={S.searchInput}/><button onClick={onNew} style={S.fab}>+</button></div>
      <div style={S.filterRow}>{[["tous",`Tous (${acquereurs.length})`],["moi",`Les miens (${acquereurs.filter(a=>a.agentId===agent.id).length})`],["equipe","Équipe"]].map(([id,lb])=>(<button key={id} onClick={()=>setFilter(id)} style={{...S.chip,...(filter===id?S.chipOn:{})}}>{lb}</button>))}</div>
      <div style={S.scroll}>
        {filtered.length===0&&<div style={S.empty}>Aucun acquéreur.<br/>Appuyez sur + pour commencer.</div>}
        {filtered.map(acq=>{
          const st=STAGES.find(x=>x.id===acq.stage)||STAGES[0];
          const ag=agents.find(a=>a.id===acq.agentId);
          const isOwn=acq.agentId===agent.id;
          const nbMatchs=matcherBiensPourAcquereur(acq,biens).length;
          return (
            <div key={acq.id} onClick={()=>onSelect(acq)} style={S.card}>
              <Avatar photo={acq.photo} initiale={isOwn?getInitiale(acq.nom):"?"} color={ag?.color||C.teal} size={48} border/>
              <div style={{flex:1,minWidth:0}}>
                <div style={S.cardName}>{isOwn?acq.nom:"Acquéreur confidentiel"}</div>
                <div style={S.cardSub}>{acq.criteres?.budget_max?`${(acq.criteres.budget_max/1000).toFixed(0)}k€`:"—"} • {acq.criteres?.type||"—"} • {acq.criteres?.villes?.[0]||"—"}</div>
                <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{...S.pill,background:st.color+"18",color:st.color}}>{st.label}</span>
                  <span style={{...S.tag,background:ag?.color||C.teal}}>{isOwn?"Moi":ag?.nom}</span>
                  {nbMatchs>0&&<span style={{...S.pill,background:C.success+"18",color:C.success}}>🎯 {nbMatchs} match{nbMatchs>1?"s":""}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DÉTAIL ACQUÉREUR ──────────────────────────────────────────────────────────
// ── HELPERS CONTACT ───────────────────────────────────────────────────────────
function telClean(tel) { return (tel||"").replace(/\s/g,"").replace(/^0/,"33"); }
function waUrl(tel, msg="") { const base="https://wa.me/"+telClean(tel); return msg ? base+"?text="+encodeURIComponent(msg) : base; }
function vCardBlob(acq) {
  const v = `BEGIN:VCARD\nVERSION:3.0\nFN:${acq.nom||""}\nTEL:${acq.tel||""}\nEMAIL:${acq.email||""}\nNOTE:Budget ${acq.criteres?.budget_max?acq.criteres.budget_max+"€":""} - ${acq.criteres?.type||""} - ${acq.criteres?.villes?.join(", ")||""}\nEND:VCARD`;
  return URL.createObjectURL(new Blob([v],{type:"text/vcard"}));
}

const QUALIF_COLORS = { A:C.success, B:"#2563eb", C:C.warning, D:C.danger };
const QUALIF_LABELS = { A:"A — Client chaud 🔥", B:"B — Sérieux 👍", C:"C — En réflexion 🤔", D:"D — Froid ❄️" };

function AcqDetail({ acq, biens, agents, agent, onBack, onUpdate, onNotif }) {
  const [tab,setTab]=useState("fiche");
  const [note,setNote]=useState(acq.note_brute||"");
  const [editNote,setEditNote]=useState(false);
  const [loading,setLoading]=useState(false);
  const [recording,setRecording]=useState(false);
  const [showQualif,setShowQualif]=useState(false);
  const recRef=useRef(null);
  const isOwn=acq.agentId===agent.id;
  const owner=agents.find(a=>a.id===acq.agentId);
  const matchs=matcherBiensPourAcquereur(acq,biens);
  const qualif = acq.qualification || null;

  const startVoice=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;const r=new SR();r.lang="fr-FR";r.continuous=true;r.interimResults=true;r.onresult=e=>setNote(Array.from(e.results).map(x=>x[0].transcript).join(" "));r.onend=()=>setRecording(false);r.start();recRef.current=r;setRecording(true);};
  const analyser=async()=>{setLoading(true);const c=await analyserCriteresAcquereur(note);onUpdate({...acq,note_brute:note,criteres:c});setEditNote(false);setLoading(false);};

  // Messages WhatsApp prédéfinis
  const msgProjet = `Bonjour ${acq.prenom||acq.nom||""} 👋\n\nJ'espère que vous allez bien !\nJe voulais vous contacter pour savoir si votre projet immobilier est toujours d'actualité et si je peux vous aider dans vos recherches.\n\nN'hésitez pas à me tenir au courant 🏠\n\nCordialement,\n${agent.nom} ${agent.prenom}\nAgence Calibre`;

  const envoyerFicheBien = (bien) => {
    const terrain = bien.surface_terrain ? " • Terrain "+bien.surface_terrain+"m²" : "";
    const chambres = bien.chambres ? " • "+bien.chambres+" ch." : "";
    const dpe = bien.dpe ? "🔋 DPE "+bien.dpe+"\n" : "";
    const equip = (bien.caracteristiques||[]).slice(0,3).map(c=>"✓ "+c).join("\n");
    const prenom = acq.prenom||acq.nom||"";
    const msg = "Bonjour "+prenom+" 👋\n\nJ'ai un bien qui pourrait vous intéresser :\n\n🏠 "+bien.type+" — "+bien.adresse+"\n💰 "+(bien.prix?(bien.prix/1000).toFixed(0)+"k€":"—")+"\n📐 "+(bien.surface||"—")+"m²"+terrain+"\n🚪 "+(bien.pieces||"—")+" pièces"+chambres+"\n"+dpe+equip+"\n\n"+(bien.description||"")+"\n\nCordialement,\n"+agent.nom+" "+agent.prenom+" — Agence Calibre";
    window.open(waUrl(acq.tel, msg), "_blank");
  };

  return (
    <div style={S.si}>
      <div style={S.dh}>
        <button onClick={onBack} style={S.backBtn}>←</button>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <Avatar photo={acq.photo} initiale={isOwn?getInitiale(acq.nom):"?"} color={owner?.color||C.teal} size={36} border/>
          <div>
            <div style={{...S.detailName,display:"flex",alignItems:"center",gap:6}}>
              {isOwn?acq.nom:"Acquéreur confidentiel"}
              {qualif&&<span style={{background:QUALIF_COLORS[qualif],color:"#fff",borderRadius:6,padding:"1px 7px",fontSize:11,fontWeight:900}}>{qualif}</span>}
            </div>
            <div style={{display:"flex",gap:5,marginTop:2,flexWrap:"wrap"}}>
              <span style={{...S.pill,background:(STAGES.find(x=>x.id===acq.stage)||STAGES[0]).color+"25",color:(STAGES.find(x=>x.id===acq.stage)||STAGES[0]).color}}>{(STAGES.find(x=>x.id===acq.stage)||STAGES[0]).label}</span>
              <span style={{...S.tag,background:owner?.color||C.teal}}>{isOwn?"Moi":owner?.nom}</span>
            </div>
          </div>
        </div>
        {isOwn&&<button onClick={()=>onUpdate({...acq,alerte:!acq.alerte})} style={{...S.iconBtn,color:acq.alerte?C.gold:C.textMuted}}>🔔</button>}
      </div>

      {/* ACTIONS RAPIDES */}
      {isOwn&&acq.tel&&(
        <div style={{display:"flex",gap:6,padding:"10px 16px 4px",overflowX:"auto"}}>
          {/* Enregistrer contact */}
          <a href={vCardBlob(acq)} download={`${acq.nom||"contact"}.vcf`}
            style={{...S.actionBtn,background:`${C.teal}12`,color:C.teal,border:`1px solid ${C.teal}25`}}>
            📱 Contact
          </a>
          {/* WhatsApp direct */}
          <a href={waUrl(acq.tel)} target="_blank" rel="noreferrer"
            style={{...S.actionBtn,background:"#25d36612",color:"#25d366",border:"1px solid #25d36625"}}>
            💬 WhatsApp
          </a>
          {/* Message "Toujours un projet ?" */}
          <a href={waUrl(acq.tel, msgProjet)} target="_blank" rel="noreferrer"
            style={{...S.actionBtn,background:`${C.gold}12`,color:C.gold,border:`1px solid ${C.gold}25`,whiteSpace:"nowrap"}}>
            🔄 Projet actif ?
          </a>
          {/* Qualification */}
          <div style={{position:"relative",flexShrink:0}}>
            <button onClick={()=>setShowQualif(!showQualif)}
              style={{...S.actionBtn,background:qualif?QUALIF_COLORS[qualif]+"20":`${C.textMuted}12`,color:qualif?QUALIF_COLORS[qualif]:C.textMuted,border:`1px solid ${qualif?QUALIF_COLORS[qualif]+"35":C.borderDark}`}}>
              ⭐ {qualif||"Qualif"}
            </button>
            {showQualif&&(
              <div style={{position:"absolute",top:"110%",left:0,background:C.white,borderRadius:12,border:`1px solid ${C.borderDark}`,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:50,width:180,padding:8}}>
                {Object.entries(QUALIF_LABELS).map(([k,v])=>(
                  <button key={k} onClick={()=>{onUpdate({...acq,qualification:k});setShowQualif(false);}}
                    style={{width:"100%",background:acq.qualification===k?QUALIF_COLORS[k]+"15":"none",border:"none",borderRadius:8,padding:"8px 10px",fontSize:12,fontWeight:700,color:QUALIF_COLORS[k],cursor:"pointer",textAlign:"left",marginBottom:2}}>
                    {v}
                  </button>
                ))}
                {qualif&&<button onClick={()=>{onUpdate({...acq,qualification:null});setShowQualif(false);}} style={{width:"100%",background:"none",border:"none",borderRadius:8,padding:"6px 10px",fontSize:11,color:C.textMuted,cursor:"pointer",textAlign:"left"}}>✕ Retirer</button>}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={S.tabs}>
        {[["fiche","📋 Fiche"],["profil","👤 Profil"],["matchs",`🎯 Matchs (${matchs.length})`]].map(([id,lb])=>(
          <button key={id} onClick={()=>setTab(id)} style={{...S.tab,...(tab===id?{...S.tabOn,color:C.teal,borderColor:C.teal}:{})}}>
            {lb}{id==="matchs"&&matchs.length>0&&<span style={S.tabBadge}>{matchs.length}</span>}
          </button>
        ))}
      </div>

      <div style={S.scroll}>
        {tab==="fiche"&&<>
          {!isOwn&&<div style={S.confBanner}>🔒 Informations masquées — appartient à <b>{owner?.nom}</b></div>}
          {isOwn&&<div style={{display:"flex",justifyContent:"center",padding:"14px 0 4px"}}><PhotoPicker current={acq.photo} label="Photo du client" size={80} onPhoto={p=>onUpdate({...acq,photo:p})}/></div>}
          <Sec title="Coordonnées">
            {isOwn?<>
              <Row icon="📞" val={acq.tel||"—"}/>
              <Row icon="✉️" val={acq.email||"—"}/>
              {acq.tel&&<div style={{display:"flex",gap:8,marginTop:8}}>
                <a href={`tel:${acq.tel}`} style={S.contactA}>📞 Appeler</a>
                <a href={`mailto:${acq.email}`} style={S.contactA}>✉️ Email</a>
                <a href={waUrl(acq.tel)} target="_blank" rel="noreferrer" style={{...S.contactA,background:"#25d36610",border:"1px solid #25d36625",color:"#25d366"}}>💬 WA</a>
              </div>}
            </>:<>
              <Row icon="📞" val="●●● ●● ●● ●● ●●"/>
              <Row icon="✉️" val="●●●●@●●●●.●●"/>
            </>}
            <Row icon="👤" val={isOwn?"Mon client":`Agent: ${owner?.nom}`}/>
          </Sec>
          <Sec title="🎤 Note vocale" action={isOwn&&<button onClick={()=>setEditNote(!editNote)} style={S.editLink}>{editNote?"Annuler":"✏️"}</button>}>
            {isOwn&&editNote?<>
              <textarea value={note} onChange={e=>setNote(e.target.value)} style={S.textarea} rows={4}/>
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <button onClick={recording?()=>{recRef.current?.stop();setRecording(false);}:startVoice} style={{...S.voiceBtn,...(recording?S.voiceBtnRec:{})}}>{recording?"⏹ Stop":"🎤 Dicter"}</button>
                <button onClick={analyser} disabled={loading} style={S.analyseBtn}>{loading?"⏳…":"✨ IA → Critères"}</button>
              </div>
              {recording&&<RecBar/>}
            </>:<div style={S.noteBox}>{isOwn?(acq.note_brute||<em style={{color:C.textMuted}}>Aucune note</em>):<em style={{color:C.textMuted}}>Confidentiel</em>}</div>}
          </Sec>
          {acq.criteres&&<Sec title="🎯 Critères de recherche"><CriteresGrid c={acq.criteres}/></Sec>}
        </>}

        {tab==="profil"&&<>
          {!isOwn?<div style={S.confBanner}>🔒 Profil masqué — appartient à <b>{owner?.nom}</b></div>:<>
            <Sec title="Situation personnelle">
              <Row icon="👶" val={`${acq.nb_enfants||0} enfant${(acq.nb_enfants||0)>1?"s":""}`}/>
              {acq.situation&&<Row icon="💑" val={acq.situation}/>}
            </Sec>
            <Sec title="Profession">
              <Row icon="👨‍💼" val={"M. : "+(acq.metier_m||"—")+(acq.secteur_travail_m?" ("+acq.secteur_travail_m+")":"")}/>
              <Row icon="👩‍💼" val={"Mme : "+(acq.metier_f||"—")+(acq.secteur_travail_f?" ("+acq.secteur_travail_f+")":"")}/>
            </Sec>
            <Sec title="Projet immobilier">
              <Row icon="💰" val={`Budget : ${acq.budget_min?acq.budget_min+"€ min — ":""}${acq.budget_max?acq.budget_max+"€ max":"NC"}`}/>
              <Row icon="📐" val={`Surface : ${acq.surface_min||"—"}m² à ${acq.surface_max||"—"}m²`}/>
              {(acq.terrain_min||acq.terrain_max)&&<Row icon="🌿" val={`Terrain : ${acq.terrain_min||"—"}m² à ${acq.terrain_max||"—"}m²`}/>}
              <Row icon="📍" val={`Secteurs : ${(acq.secteurs||[]).join(", ")||"—"}`}/>
            </Sec>
            {acq.notes_profil&&<Sec title="Notes"><div style={S.noteBox}>{acq.notes_profil}</div></Sec>}
          </>}
        </>}

        {tab==="matchs"&&<>
          {matchs.length===0?<div style={S.empty}>Aucun bien ne correspond encore.<br/><br/>Ajoutez des biens dans l'onglet Biens pour commencer le matching.</div>:<>
            <div style={{...S.matchBanner,margin:"12px 16px 0"}}>
              <div style={{...S.matchNum,color:C.teal}}>{matchs.length}</div>
              <div style={S.matchLbl}>bien{matchs.length>1?"s":""} du stock correspondent</div>
            </div>
            {matchs.map(b=>{
              const bAg=agents.find(a=>a.id===b.agentId);const isOwnBien=b.agentId===agent.id;
              const visite=(acq.biens_visites||[]).includes(b.id);
              return (
                <div key={b.id} style={S.matchCard}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13,color:C.teal}}>{b.type} — {b.ville||b.adresse?.split(",").pop()?.trim()}</div>
                      <div style={{fontSize:12,color:C.text,fontWeight:600,marginTop:2}}>{b.adresse}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                      <ScoreCircle score={b.score}/>
                      <span style={{...S.tag,background:bAg?.color||C.teal,fontSize:9}}>{isOwnBien?"Moi":bAg?.nom}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:12,margin:"6px 0",flexWrap:"wrap"}}>
                    <MiniStat val={`${(b.prix/1000).toFixed(0)}k€`} lbl="Prix" col={C.success}/>
                    <MiniStat val={`${b.surface}m²`} lbl="Hab." col={C.teal}/>
                    {b.surface_terrain&&<MiniStat val={`${b.surface_terrain}m²`} lbl="Terrain" col="#7c3aed"/>}
                    <MiniStat val={`${b.pieces||"—"}p`} lbl="Pièces" col={C.gold}/>
                    {b.dpe&&<MiniStat val={b.dpe} lbl="DPE" col={b.dpe<="C"?C.success:b.dpe<="D"?C.warning:C.danger}/>}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                    {b.ok.map((r,i)=><span key={i} style={S.okTag}>{r}</span>)}
                    {b.ko.slice(0,3).map((r,i)=><span key={i} style={S.koTag}>{r}</span>)}
                  </div>
                  {b.pieceMatches?.length>0&&(
                    <div style={{background:`${C.teal}06`,borderRadius:8,padding:"8px 10px",marginBottom:8}}>
                      <div style={{fontSize:10,fontWeight:800,color:C.textSub,textTransform:"uppercase",marginBottom:5}}>📐 Pièces</div>
                      {b.pieceMatches.map((pm,i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                          <span style={{color:C.text}}>{pm.nom}</span>
                          <span style={{fontWeight:700,color:pm.ok?C.success:C.danger}}>{pm.surface?`${pm.surface}m²`:""} {pm.ok?"✓":"✗"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Boutons action */}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {/* Visité / Pas visité */}
                    {isOwn&&<button onClick={()=>{const v=acq.biens_visites||[];onUpdate({...acq,biens_visites:visite?v.filter(x=>x!==b.id):[...v,b.id]});}}
                      style={{...S.visitBtn,...(visite?{background:C.success+"15",color:C.success,border:`1px solid ${C.success}30`}:{})}}>
                      {visite?"✅ Visité":"👁 Marquer visité"}
                    </button>}
                    {/* Envoyer par WhatsApp */}
                    {isOwn&&acq.tel&&<button onClick={()=>envoyerFicheBien(b)}
                      style={{...S.visitBtn,background:"#25d36612",color:"#25d366",border:"1px solid #25d36625"}}>
                      💬 Envoyer WA
                    </button>}
                    {/* Envoyer par email */}
                    {isOwn&&acq.email&&<a href={"mailto:"+acq.email+"?subject=Bien+immobilier+pour+vous&body="+encodeURIComponent("Bonjour "+(acq.prenom||acq.nom||"")+",\n\nJ'ai un bien qui pourrait vous intéresser :\n\n"+b.type+" — "+b.adresse+"\n"+(b.prix?(b.prix/1000).toFixed(0)+"k€":"")+" • "+(b.surface||"—")+"m²\n\n"+(b.description||"")+"\n\nCordialement,\n"+agent.nom+" "+agent.prenom+"\nAgence Calibre")}
                      style={{...S.visitBtn,background:C.blueLight+"12",color:C.blueLight,border:"1px solid "+C.blueLight+"25",textDecoration:"none"}}>
                      📧 Email
                    </a>}
                    {(!isOwn||!isOwnBien)&&<MiseEnRelation isOwnAcq={isOwn} isOwnBien={isOwnBien} acqAgent={owner} bienAgent={bAg} onSend={(toId,msg)=>onNotif(agent,toId,msg)}/>}
                  </div>
                </div>
              );
            })}
          </>}
        </>}
      </div>
    </div>
  );
}

// ── LISTE BIENS ───────────────────────────────────────────────────────────────
function BienList({ biens, acquereurs, agents, agent, onSelect, onNew }) {
  const [search,setSearch]=useState("");
  const filtered=biens.filter(b=>b.adresse?.toLowerCase().includes(search.toLowerCase())||b.ville?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={S.si}>
      <div style={S.listTop}><input placeholder="🔍 Rechercher…" value={search} onChange={e=>setSearch(e.target.value)} style={S.searchInput}/><button onClick={onNew} style={S.fab}>+</button></div>
      <div style={S.scroll}>
        {filtered.length===0&&<div style={S.empty}>Aucun bien.<br/>Importez une fiche PDF IAD ou saisissez manuellement.</div>}
        {filtered.map(b=>{
          const ag=agents.find(a=>a.id===b.agentId);
          const nbMatchs=matcherAcquereursPourBien(b,acquereurs).length;
          return (
            <div key={b.id} onClick={()=>onSelect(b)} style={S.card}>
              <div style={{width:48,height:48,borderRadius:14,background:`linear-gradient(135deg,${C.teal}20,${C.blueLight}15)`,border:`1px solid ${C.teal}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                {b.type==="Maison"?"🏡":b.type==="Terrain"?"🌿":"🏢"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={S.cardName}>{b.adresse||b.ville||"Bien sans adresse"}</div>
                <div style={S.cardSub}>{b.prix?(b.prix/1000).toFixed(0)+"k€":"—"} • {b.surface||"—"}m² • {b.pieces||"—"}p {b.dpe?`• DPE ${b.dpe}`:""}</div>
                <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{...S.pill,background:C.teal+"15",color:C.teal}}>{b.type||"—"}</span>
                  <span style={{...S.tag,background:ag?.color||C.teal}}>{ag?.id===agent.id?"Moi":ag?.nom}</span>
                  {nbMatchs>0&&<span style={{...S.pill,background:C.success+"18",color:C.success}}>🎯 {nbMatchs} acq.</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DÉTAIL BIEN ───────────────────────────────────────────────────────────────
function BienDetail({ bien, acquereurs, agents, agent, onBack, onNotif, onDelete }) {
  const [tab,setTab]=useState("fiche");
  const owner=agents.find(a=>a.id===bien.agentId);
  const isOwn=bien.agentId===agent.id;
  const matchs=matcherAcquereursPourBien(bien,acquereurs);

  return (
    <div style={S.si}>
      <div style={S.dh}>
        <button onClick={onBack} style={S.backBtn}>←</button>
        <div style={{flex:1}}>
          <div style={S.detailName}>{bien.type} — {bien.ville||bien.adresse?.split(",")[0]||"Bien"}</div>
          <div style={{display:"flex",gap:5,marginTop:2,flexWrap:"wrap"}}>
            <span style={{...S.tag,background:owner?.color||C.teal}}>{isOwn?"Mon bien":owner?.nom}</span>
            {bien.numero_mandat&&<span style={{...S.pill,background:C.teal+"15",color:C.teal}}>N°{bien.numero_mandat}</span>}{isOwn&&<button onClick={()=>{if(window.confirm("Supprimer ce bien ?"))onDelete(bien.id);}} style={{background:"rgba(192,57,43,0.15)",border:"1px solid rgba(192,57,43,0.3)",borderRadius:8,width:30,height:30,color:C.danger,fontSize:14,cursor:"pointer",flexShrink:0}}>🗑️</button>}
          </div>
        </div>
      </div>

      {/* Banner matchs */}
      <div style={{...S.matchBanner,margin:"10px 16px 0"}}>
        <div style={{...S.matchNum,color:C.teal}}>{matchs.length}</div>
        <div style={S.matchLbl}>acquéreur{matchs.length>1?"s":""} correspondent dans le portefeuille</div>
      </div>

      <div style={S.tabs}>
        {[["fiche","🏠 Fiche"],["matchs",`🎯 Acquéreurs (${matchs.length})`]].map(([id,lb])=>(
          <button key={id} onClick={()=>setTab(id)} style={{...S.tab,...(tab===id?{...S.tabOn,color:C.teal,borderColor:C.teal}:{})}}>{lb}</button>
        ))}
      </div>

      <div style={S.scroll}>
        {tab==="fiche"&&<>
          {/* Stats principales */}
          <Sec title="Caractéristiques">
            <div style={S.bienGrid}>
              <StatBox val={`${(bien.prix/1000||0).toFixed(0)}k€`} lbl="Prix" col={C.success}/>
              <StatBox val={`${bien.surface||"—"}m²`} lbl="Hab." col={C.teal}/>
              {bien.surface_terrain&&<StatBox val={`${bien.surface_terrain}m²`} lbl="Terrain" col="#7c3aed"/>}
              <StatBox val={`${bien.pieces||"—"}p`} lbl="Pièces" col={C.gold}/>
              {bien.chambres&&<StatBox val={bien.chambres} lbl="Chambres" col="#db2777"/>}
              {bien.salles_de_bain&&<StatBox val={bien.salles_de_bain} lbl="SDB" col={C.blueLight}/>}
              {bien.dpe&&<StatBox val={bien.dpe} lbl="DPE" col={bien.dpe<="C"?C.success:bien.dpe<="D"?C.warning:C.danger}/>}
              {bien.annee_construction&&<StatBox val={bien.annee_construction} lbl="Année" col={C.textSub}/>}
            </div>
            {bien.adresse&&<Row icon="📍" val={bien.adresse}/>}
            {bien.taxe_fonciere&&<Row icon="💼" val={`Taxe foncière : ${bien.taxe_fonciere}€/an`}/>}
            {bien.exposition&&<Row icon="🧭" val={`Exposition ${bien.exposition}`}/>}
            {bien.description&&<div style={{...S.noteBox,marginTop:8}}>{bien.description}</div>}
            {/* Équipements */}
            {(bien.caracteristiques||[]).length>0&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                {(bien.caracteristiques||[]).map((c,i)=><Chip key={i}>{c}</Chip>)}
              </div>
            )}
          </Sec>

          {/* Détail pièces */}
          {bien.detail_pieces?.length>0&&(
            <Sec title={`📐 Pièces (${bien.detail_pieces.length})`}>
              <div style={{background:`${C.teal}06`,border:`1px solid ${C.teal}12`,borderRadius:12,overflow:"hidden"}}>
                {bien.detail_pieces.map((p,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderBottom:i<bien.detail_pieces.length-1?`1px solid ${C.teal}08`:"none",background:i%2===0?"transparent":`${C.teal}03`}}>
                    <div style={{flex:1}}>
                      <span style={{fontWeight:600,fontSize:13,color:C.text}}>{p.nom}</span>
                      {p.niveau!==undefined&&<span style={{fontSize:10,color:C.textMuted,marginLeft:6}}>{p.niveau===0?"RDC":`Étage ${p.niveau}`}</span>}
                      {p.equipements?.length>0&&<div style={{fontSize:10,color:C.textMuted,marginTop:1}}>{p.equipements.slice(0,3).join(" • ")}</div>}
                    </div>
                    {p.surface&&<div style={{background:`linear-gradient(135deg,${C.teal},${C.blueLight})`,borderRadius:8,padding:"3px 9px",fontSize:12,fontWeight:800,color:"#fff",flexShrink:0}}>{p.surface} m²</div>}
                  </div>
                ))}
              </div>
            </Sec>
          )}

          {/* Surfaces annexes */}
          {bien.surfaces_annexes?.length>0&&(
            <Sec title="🏗️ Surfaces annexes">
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {bien.surfaces_annexes.map((s,i)=>(
                  <div key={i} style={{background:C.accent,border:`1px solid ${C.teal}20`,borderRadius:10,padding:"6px 12px",fontSize:12}}>
                    <span style={{fontWeight:600,color:C.teal}}>{s.nom}</span>
                    {s.surface&&<span style={{color:C.textSub,marginLeft:6}}>{s.surface}m²</span>}
                  </div>
                ))}
              </div>
            </Sec>
          )}
        </>}

        {tab==="matchs"&&<>
          {matchs.length===0&&<div style={S.empty}>Aucun acquéreur ne correspond encore.<br/><br/>Ajoutez des acquéreurs via le + dans l'onglet Acquéreurs.</div>}
          {matchs.map(acq=>{
            const acqAg=agents.find(a=>a.id===acq.agentId);const isOwnAcq=acq.agentId===agent.id;
            return (
              <div key={acq.id} style={S.matchCard}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Avatar photo={isOwnAcq?acq.photo:null} initiale={isOwnAcq?getInitiale(acq.nom):"?"} color={acqAg?.color||C.teal} size={36} border/>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:C.text}}>{isOwnAcq?acq.nom:"Acquéreur confidentiel"}</div>
                      <div style={{fontSize:11,color:C.textSub}}>{isOwnAcq?acq.email:`Agent: ${acqAg?.nom}`}</div>
                      {acq.criteres?.resume&&<div style={{fontSize:10,color:C.teal,fontStyle:"italic",marginTop:1}}>{acq.criteres.resume}</div>}
                    </div>
                  </div>
                  <ScoreCircle score={acq.score}/>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                  {acq.ok.map((r,i)=><span key={i} style={S.okTag}>{r}</span>)}
                  {acq.ko.slice(0,3).map((r,i)=><span key={i} style={S.koTag}>{r}</span>)}
                </div>
                {acq.pieceMatches?.length>0&&(
                  <div style={{background:`${C.teal}06`,borderRadius:8,padding:"8px 10px",marginBottom:6}}>
                    <div style={{fontSize:10,fontWeight:800,color:C.textSub,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>📐 Matching pièces</div>
                    {acq.pieceMatches.map((pm,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                        <span style={{color:C.text}}>{pm.nom}</span>
                        <span style={{fontWeight:700,color:pm.ok?C.success:C.danger}}>{pm.surface?`${pm.surface}m²`:""} {pm.ok?"✓":"✗"}</span>
                      </div>
                    ))}
                  </div>
                )}
                {isOwnAcq?(<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <a href={`tel:${acq.tel}`} style={S.contactA}>📞 Appeler</a>
                  <a href={`mailto:${acq.email}`} style={S.contactA}>✉️ Email</a>
                  {acq.tel&&<a href={waUrl(acq.tel)} target="_blank" rel="noreferrer" style={{...S.contactA,background:"#25d36610",color:"#25d366",border:"1px solid #25d36625"}}>💬 WA</a>}
                  {/* Marquer visité depuis le bien */}
                  <button onClick={()=>{const v=acq.biens_visites||[];const visite=v.includes(bien.id);/* on ne peut pas modifier acq depuis BienDetail directement, on notifie */alert(`✅ Pour marquer comme visité, ouvrez la fiche de ${acq.nom} → onglet Matchs`);}}
                    style={{...S.visitBtn}}>👁 Visité ?</button>
                </div>)
                :(<MiseEnRelation isOwnAcq={false} isOwnBien={isOwn} acqAgent={acqAg} bienAgent={owner} onSend={(toId,msg)=>onNotif(agent,toId,msg)}/>)}
              </div>
            );
          })}
        </>}
      </div>
    </div>
  );
}

// ── NEW ACQUÉREUR ─────────────────────────────────────────────────────────────
function NewAcq({ agent, onBack, onSave }) {
  const [tab,setTab]=useState("identite"); // identite | profil | criteres
  const [nom,setNom]=useState(""); const [prenom,setPrenom]=useState("");
  const [tel,setTel]=useState(""); const [email,setEmail]=useState("");
  const [stage,setStage]=useState("nouveau"); const [photo,setPhoto]=useState(null);
  // Profil
  const [situation,setSituation]=useState("");
  const [nb_enfants,setNbEnfants]=useState("0");
  const [metier_m,setMetierM]=useState(""); const [secteur_travail_m,setSecteurM]=useState("");
  const [metier_f,setMetierF]=useState(""); const [secteur_travail_f,setSecteurF]=useState("");
  const [notes_profil,setNotesProfil]=useState("");
  // Critères
  const [budget_min,setBudgetMin]=useState(""); const [budget_max,setBudgetMax]=useState("");
  const [surface_min,setSurfMin]=useState(""); const [surface_max,setSurfMax]=useState("");
  const [terrain_min,setTerrMin]=useState(""); const [terrain_max,setTerrMax]=useState("");
  const [secteurs,setSecteurs]=useState(""); // communes séparées par virgule
  const [note,setNote]=useState("");
  const [criteres,setCriteres]=useState(null); const [loading,setLoading]=useState(false);
  const [recording,setRecording]=useState(false);
  const recRef=useRef(null);

  const startV=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;const r=new SR();r.lang="fr-FR";r.continuous=true;r.interimResults=true;r.onresult=e=>setNote(Array.from(e.results).map(x=>x[0].transcript).join(" "));r.onend=()=>setRecording(false);r.start();recRef.current=r;setRecording(true);};
  const analyser=async()=>{
    setLoading(true);
    const c=await analyserCriteresAcquereur(note);
    // Enrichir avec les champs manuels
    const secteursList = secteurs.split(",").map(s=>s.trim()).filter(Boolean);
    const merged={
      ...c,
      budget_min:budget_min?Number(budget_min):c.budget_min,
      budget_max:budget_max?Number(budget_max):c.budget_max,
      surface_min:surface_min?Number(surface_min):c.surface_min,
      surface_max:surface_max?Number(surface_max):undefined,
      surface_terrain_min:terrain_min?Number(terrain_min):c.surface_terrain_min,
      surface_terrain_max:terrain_max?Number(terrain_max):undefined,
      villes:secteursList.length?secteursList:c.villes,
    };
    setCriteres(merged);
    setLoading(false);
  };

  const sauvegarder = () => {
    const secteursList = secteurs.split(",").map(s=>s.trim()).filter(Boolean);
    const criteresFinaux = {
      ...(criteres||{}),
      budget_min:budget_min?Number(budget_min):(criteres?.budget_min||null),
      budget_max:budget_max?Number(budget_max):(criteres?.budget_max||null),
      surface_min:surface_min?Number(surface_min):(criteres?.surface_min||null),
      surface_terrain_min:terrain_min?Number(terrain_min):(criteres?.surface_terrain_min||null),
      villes:secteursList.length?secteursList:(criteres?.villes||[]),
    };
    onSave({nom:`${prenom} ${nom}`.trim(),prenom,tel,email,stage,note_brute:note,criteres:criteresFinaux,agentId:agent.id,photo,
      situation,nb_enfants:Number(nb_enfants)||0,metier_m,secteur_travail_m,metier_f,secteur_travail_f,notes_profil,
      budget_min:budget_min||null,budget_max:budget_max||null,
      surface_min:surface_min||null,surface_max:surface_max||null,
      terrain_min:terrain_min||null,terrain_max:terrain_max||null,
      secteurs:secteursList,biens_visites:[],
    });
  };

  return (
    <div style={S.si}>
      <div style={S.dh}><button onClick={onBack} style={S.backBtn}>←</button><div style={S.detailName}>Nouvel acquéreur</div><span style={{...S.tag,background:agent.color}}>{agent.nom}</span></div>

      {/* Onglets de saisie */}
      <div style={S.tabs}>
        {[["identite","👤 Identité"],["profil","💼 Profil"],["criteres","🎯 Critères"]].map(([id,lb])=>(
          <button key={id} onClick={()=>setTab(id)} style={{...S.tab,...(tab===id?{...S.tabOn,color:C.teal,borderColor:C.teal}:{})}}>{lb}</button>
        ))}
      </div>

      <div style={S.scroll}>
        {tab==="identite"&&<>
          <div style={{display:"flex",justifyContent:"center",padding:"14px 0 4px"}}><PhotoPicker current={photo} label="Photo (optionnel)" size={80} onPhoto={setPhoto}/></div>
          <Sec title="Identité">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Inp label="Prénom" val={prenom} set={setPrenom} ph="Martin"/>
              <Inp label="Nom *" val={nom} set={setNom} ph="Dupont"/>
            </div>
            <Inp label="Téléphone" val={tel} set={setTel} ph="06 XX XX XX XX" type="tel"/>
            <Inp label="Email" val={email} set={setEmail} ph="email@exemple.fr" type="email"/>
            <div style={S.ig}><label style={S.lbl}>Étape</label><select value={stage} onChange={e=>setStage(e.target.value)} style={S.select}>{STAGES.map(st=><option key={st.id} value={st.id}>{st.label}</option>)}</select></div>
          </Sec>
          <div style={{padding:"8px 16px 0"}}>
            <button onClick={()=>setTab("profil")} style={S.primaryBtn}>Suivant — Profil →</button>
          </div>
        </>}

        {tab==="profil"&&<>
          <Sec title="Situation personnelle">
            <div style={S.ig}>
              <label style={S.lbl}>Situation familiale</label>
              <select value={situation} onChange={e=>setSituation(e.target.value)} style={S.select}>
                {["","Célibataire","En couple","Marié(e)","Pacsé(e)","Divorcé(e)","Veuf/Veuve"].map(s=><option key={s} value={s}>{s||"— Choisir —"}</option>)}
              </select>
            </div>
            <Inp label="Nombre d'enfants" val={nb_enfants} set={setNbEnfants} ph="0" type="number"/>
          </Sec>
          <Sec title="Professions">
            <div style={{fontSize:11,fontWeight:700,color:C.textSub,textTransform:"uppercase",marginBottom:8}}>Monsieur</div>
            <Inp label="Métier" val={metier_m} set={setMetierM} ph="ex: Médecin, Chef d'entreprise..."/>
            <Inp label="Secteur de travail" val={secteur_travail_m} set={setSecteurM} ph="ex: Nice, Cannes..."/>
            <div style={{fontSize:11,fontWeight:700,color:C.textSub,textTransform:"uppercase",margin:"12px 0 8px"}}>Madame</div>
            <Inp label="Métier" val={metier_f} set={setMetierF} ph="ex: Infirmière, Enseignante..."/>
            <Inp label="Secteur de travail" val={secteur_travail_f} set={setSecteurF} ph="ex: Fréjus, Draguignan..."/>
          </Sec>
          <Sec title="Notes profil">
            <textarea value={notes_profil} onChange={e=>setNotesProfil(e.target.value)} placeholder="Notes libres sur le profil du client..." style={S.textarea} rows={3}/>
          </Sec>
          <div style={{padding:"8px 16px 0"}}>
            <button onClick={()=>setTab("criteres")} style={S.primaryBtn}>Suivant — Critères →</button>
          </div>
        </>}

        {tab==="criteres"&&<>
          <Sec title="Budget">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Inp label="Budget min (€)" val={budget_min} set={setBudgetMin} ph="300000" type="number"/>
              <Inp label="Budget max (€)" val={budget_max} set={setBudgetMax} ph="650000" type="number"/>
            </div>
          </Sec>
          <Sec title="Surface habitable">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Inp label="Min (m²)" val={surface_min} set={setSurfMin} ph="100" type="number"/>
              <Inp label="Max (m²)" val={surface_max} set={setSurfMax} ph="200" type="number"/>
            </div>
          </Sec>
          <Sec title="Terrain">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <Inp label="Min (m²)" val={terrain_min} set={setTerrMin} ph="500" type="number"/>
              <Inp label="Max (m²)" val={terrain_max} set={setTerrMax} ph="2000" type="number"/>
            </div>
          </Sec>
          <Sec title="Secteurs de recherche">
            <Inp label="Communes (séparées par des virgules)" val={secteurs} set={setSecteurs} ph="Montauroux, Fayence, Callian, Seillans..."/>
            {secteurs&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:6}}>{secteurs.split(",").map(s=>s.trim()).filter(Boolean).map((s,i)=><Chip key={i}>📍 {s}</Chip>)}</div>}
          </Sec>
          <Sec title="🎤 Autres critères (vocal ou texte)">
            <div style={{fontSize:12,color:C.textSub,marginBottom:8}}>Dictez les critères restants : type de bien, équipements souhaités, tailles de pièces…</div>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder='Ex: "Maison avec piscine, 4 chambres, pièce de vie entre 60 et 80m², pas de RDC, DPE max C"' style={S.textarea} rows={3}/>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button onClick={recording?()=>{recRef.current?.stop();setRecording(false);}:startV} style={{...S.voiceBtn,...(recording?S.voiceBtnRec:{})}}>{recording?"⏹ Stop":"🎤 Dicter"}</button>
              <button onClick={analyser} disabled={!note.trim()&&!budget_max&&!secteurs} style={{...S.analyseBtn,opacity:!note.trim()&&!budget_max&&!secteurs?0.5:1}}>{loading?"⏳…":"✨ IA → Critères"}</button>
            </div>
            {recording&&<RecBar/>}
            {criteres&&<div style={{marginTop:10}}><CriteresGrid c={criteres}/></div>}
          </Sec>
          <div style={{padding:"0 16px 32px"}}>
            <button onClick={sauvegarder} disabled={!nom} style={{...S.primaryBtn,opacity:!nom?0.4:1}}>✓ Créer l'acquéreur</button>
          </div>
        </>}
      </div>
    </div>
  );
}

// ── NEW BIEN ──────────────────────────────────────────────────────────────────
function NewBien({ agent, onBack, onSave }) {
  const [mode,setMode]=useState("pdf");
  const [loading,setLoading]=useState(false);
  const [pdfNom,setPdfNom]=useState(null);
  const [urlInput,setUrlInput]=useState("");
  const [imported,setImported]=useState(null);
  const [note,setNote]=useState("");
  const [recording,setRecording]=useState(false);
  const [f,setF]=useState({adresse:"",prix:"",surface:"",surface_terrain:"",pieces:"",chambres:"",salles_de_bain:"",type:"Maison",dpe:"C",etage:"0",annee_construction:"",taxe_fonciere:"",numero_mandat:"",piscine:false,jardin:false,terrasse:false,garage:false,parking:false});
  const recRef=useRef(null); const pdfRef=useRef(null);
  const upd=v=>setF(x=>({...x,...v}));

  const appliquer = c => {
    if (!c||!Object.keys(c).length) return;
    setImported(c);
    const loc = c.ville ? (c.code_postal ? c.ville+" "+c.code_postal : c.ville) : (c.adresse||f.adresse);
    upd({
      adresse: loc,
      prix: c.prix ? String(c.prix) : f.prix,
      surface: c.surface ? String(c.surface) : f.surface,
      surface_terrain: c.surface_terrain ? String(c.surface_terrain) : f.surface_terrain,
      pieces: c.pieces ? String(c.pieces) : f.pieces,
      chambres: c.chambres ? String(c.chambres) : f.chambres,
      salles_de_bain: c.salles_de_bain ? String(c.salles_de_bain) : f.salles_de_bain,
      type: c.type||f.type, dpe: c.dpe||f.dpe,
      etage: c.etage!=null ? String(c.etage) : f.etage,
      annee_construction: c.annee_construction ? String(c.annee_construction) : f.annee_construction,
      taxe_fonciere: c.taxe_fonciere ? String(c.taxe_fonciere) : f.taxe_fonciere,
      numero_mandat: c.numero_mandat||f.numero_mandat,
      piscine: c.caracteristiques?.includes("piscine")||f.piscine,
      jardin: c.caracteristiques?.includes("jardin")||f.jardin,
      terrasse: c.caracteristiques?.includes("terrasse")||f.terrasse,
      garage: c.caracteristiques?.includes("garage")||f.garage,
      parking: c.caracteristiques?.includes("parking")||f.parking,
    });
    // Basculer vers le formulaire après mise à jour du state
    setTimeout(()=>setMode("manuel"), 50);
  };

  const handlePDF=async e=>{const file=e.target.files[0];if(!file)return;setPdfNom(file.name);setLoading(true);const c=await importerPDF(file);if(c&&Object.keys(c).length>0){appliquer(c);}else{alert("Impossible de lire le PDF. Vérifiez le format.");}setLoading(false);};
  const handleUrl=async()=>{if(!urlInput.trim())return;setLoading(true);const c=await importerAnnonce(urlInput.trim());appliquer(c);setLoading(false);};
  const startV=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;const r=new SR();r.lang="fr-FR";r.continuous=true;r.interimResults=true;r.onresult=e=>setNote(Array.from(e.results).map(x=>x[0].transcript).join(" "));r.onend=()=>setRecording(false);r.start();recRef.current=r;setRecording(true);};
  const analyseVocal=async()=>{setLoading(true);const c=await analyserCriteresAcquereur(note);appliquer({...c,type:c.type,prix:null,surface:null});setLoading(false);};

  const sauvegarder = () => onSave({
    ...f, prix:Number(f.prix)||0, surface:Number(f.surface)||0,
    surface_terrain:Number(f.surface_terrain)||0, pieces:Number(f.pieces)||0,
    chambres:Number(f.chambres)||0, salles_de_bain:Number(f.salles_de_bain)||0,
    etage:Number(f.etage)||0, annee_construction:Number(f.annee_construction)||0,
    taxe_fonciere:Number(f.taxe_fonciere)||0,
    agentId:agent.id, note_brute:note,
    caracteristiques:imported?.caracteristiques||[],
    detail_pieces:imported?.detail_pieces||[],
    surfaces_annexes:imported?.surfaces_annexes||[],
    description:imported?.description||"",
    ville:imported?.ville||"", code_postal:imported?.code_postal||"",
    exposition:imported?.exposition||"",
  });

  return (
    <div style={S.si}>
      <div style={S.dh}><button onClick={onBack} style={S.backBtn}>←</button><div style={S.detailName}>Nouveau bien</div><span style={{...S.tag,background:agent.color}}>{agent.nom}</span></div>
      <div style={S.scroll}>
        {/* Sélecteur mode */}
        <div style={{padding:"14px 16px 8px"}}>
          <div style={{fontSize:11,fontWeight:800,color:C.textSub,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Comment ajouter ce bien ?</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["pdf","📄 Fiche PDF IAD"],["url","🔗 Lien annonce"],["vocal","🎤 Description vocale"],["manuel","✏️ Saisie manuelle"]].map(([id,lb])=>(
              <button key={id} onClick={()=>setMode(id)} style={{background:mode===id?`linear-gradient(135deg,${C.teal},${C.blueLight})`:`${C.teal}08`,border:`1px solid ${mode===id?"transparent":C.teal+"20"}`,borderRadius:12,padding:"12px 8px",color:mode===id?"#fff":C.teal,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {lb}
              </button>
            ))}
          </div>
        </div>

        {/* MODE PDF */}
        {mode==="pdf"&&(
          <Sec title="📄 Importer une fiche PDF IAD">
            <div style={{background:`linear-gradient(135deg,${C.teal}06,${C.blueLight}04)`,border:`1px solid ${C.teal}18`,borderRadius:14,padding:16,marginBottom:12}}>
              <div style={{textAlign:"center",marginBottom:14}}>
                <div style={{fontSize:40,marginBottom:6}}>📄</div>
                <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Fiche de mandat IAD</div>
                <div style={{fontSize:12,color:C.textSub,lineHeight:1.6}}>Exportez votre bien depuis votre logiciel IAD → PDF<br/><span style={{color:C.teal}}>L'IA lit toutes les pièces avec leurs mesures exactes.</span></div>
              </div>
              <div onClick={()=>pdfRef.current?.click()} style={{border:`2px dashed ${pdfNom?C.success:C.teal}40`,borderRadius:12,padding:20,textAlign:"center",cursor:"pointer",background:pdfNom?C.success+"06":"rgba(255,255,255,0.7)"}}>
                {loading?(<div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}><div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${C.teal}30`,borderTop:`2px solid ${C.teal}`}}/>
                <div style={{fontSize:13,color:C.teal,fontWeight:600}}>L'IA analyse votre PDF…</div></div>)
                :pdfNom?(<><div style={{fontSize:28,marginBottom:4}}>✅</div><div style={{fontWeight:700,fontSize:13,color:C.success}}>{pdfNom}</div><div style={{fontSize:11,color:C.textMuted}}>Appuyez pour changer</div></>)
                :(<><div style={{fontSize:32,marginBottom:6}}>📁</div><div style={{fontWeight:700,fontSize:14,color:C.teal}}>Sélectionner le PDF</div><div style={{fontSize:11,color:C.textMuted}}>Format PDF uniquement</div></>)}
              </div>
              <input ref={pdfRef} type="file" accept="application/pdf" onChange={handlePDF} style={{display:"none"}}/>
            </div>
            {!pdfNom&&<div style={{background:C.white,border:`1px solid ${C.borderDark}`,borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:11,fontWeight:800,color:C.textSub,textTransform:"uppercase",marginBottom:8}}>Depuis votre logiciel IAD :</div>
              {["1. Ouvrez votre bien dans IAD","2. Cliquez Exporter / Imprimer → PDF","3. Importez ici → l'IA remplit tout ✅"].map((t,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:6}}>
                  <div style={{width:20,height:20,borderRadius:"50%",background:`linear-gradient(135deg,${C.teal},${C.blueLight})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:"#fff",flexShrink:0}}>{i+1}</div>
                  <div style={{fontSize:12,color:C.textSub,paddingTop:2}}>{t.substring(3)}</div>
                </div>
              ))}
            </div>}
          </Sec>
        )}

        {/* MODE URL */}
        {mode==="url"&&(
          <Sec title="🔗 Lien d'une annonce">
            <div style={{background:`linear-gradient(135deg,${C.teal}06,${C.blueLight}04)`,border:`1px solid ${C.teal}18`,borderRadius:14,padding:16,marginBottom:12}}>
              <div style={{textAlign:"center",marginBottom:14}}>
                <div style={{fontSize:40,marginBottom:6}}>🔗</div>
                <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>Importer depuis un lien</div>
                <div style={{fontSize:12,color:C.textSub,lineHeight:1.6}}>
                  Copiez l'URL d'une annonce depuis :<br/>
                  <span style={{color:C.teal}}>IAD • SeLoger • Leboncoin • BienIci • PAP • Logic-Immo…</span>
                </div>
              </div>
              <input
                value={urlInput}
                onChange={e=>setUrlInput(e.target.value)}
                placeholder="https://www.iadfrance.fr/annonce/vente-maison-..."
                style={{...S.input,marginBottom:10,fontSize:12}}
              />
              <button
                onClick={handleUrl}
                disabled={!urlInput.trim()||loading}
                style={{...S.primaryBtn,opacity:!urlInput.trim()||loading?0.5:1}}>
                {loading?"⏳ L'IA analyse l'annonce…":"✨ Importer ce bien"}
              </button>
            </div>
            <div style={{background:`#fff8e8`,border:"1px solid #fde68a",borderRadius:10,padding:"10px 12px",fontSize:12,color:"#92400e"}}>
              💡 <b>Si le lien ne fonctionne pas</b>, utilisez <b>📄 Fiche PDF</b> (export depuis IAD) — c'est la méthode la plus fiable.
            </div>
          </Sec>
        )}

        {/* MODE VOCAL */}
        {mode==="vocal"&&(
          <Sec title="🎤 Description vocale">
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex: Maison Montauroux, 620 000€, 151m², 6 pièces, piscine, terrain 957m², DPE A, mandat 2000441…" style={S.textarea} rows={4}/>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button onClick={recording?()=>{recRef.current?.stop();setRecording(false);}:startV} style={{...S.voiceBtn,...(recording?S.voiceBtnRec:{})}}>{recording?"⏹ Stop":"🎤 Dicter"}</button>
              <button onClick={analyseVocal} disabled={!note.trim()||loading} style={{...S.analyseBtn,opacity:!note.trim()||loading?0.5:1}}>{loading?"⏳…":"✨ IA → Fiche"}</button>
            </div>
            {recording&&<RecBar/>}
          </Sec>
        )}

        {/* RÉSULTAT IMPORT */}
        {imported&&!loading&&(
          <div style={{margin:"0 16px 4px",background:`linear-gradient(135deg,${C.success}10,${C.teal}06)`,border:`2px solid ${C.success}25`,borderRadius:14,padding:14}}>
            <div style={{fontWeight:800,fontSize:14,color:C.success,marginBottom:8}}>✅ {imported.source||"Bien"} importé {imported.numero_mandat?`— N° ${imported.numero_mandat}`:""}</div>
            {imported.titre&&<div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>{imported.titre}</div>}
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
              {imported.prix&&<span style={S.okTag}>💰 {(imported.prix/1000).toFixed(0)}k€</span>}
              {imported.surface&&<span style={S.okTag}>🏠 {imported.surface}m²</span>}
              {imported.surface_terrain&&<span style={S.okTag}>🌿 {imported.surface_terrain}m² terrain</span>}
              {imported.pieces&&<span style={S.okTag}>🚪 {imported.pieces}p</span>}
              {imported.chambres&&<span style={S.okTag}>🛏 {imported.chambres} ch.</span>}
              {imported.dpe&&<span style={S.okTag}>🔋 DPE {imported.dpe}</span>}
            </div>
            {imported.detail_pieces?.length>0&&(
              <div style={{fontSize:11,color:C.teal,fontWeight:600}}>📐 {imported.detail_pieces.length} pièces détaillées importées</div>
            )}
            <div style={{fontSize:11,color:C.textMuted,marginTop:6}}>✏️ Vérifiez et complétez ci-dessous.</div>
          </div>
        )}

        {/* FICHE */}
        <Sec title={imported?"✏️ Vérifier et compléter":"Saisie manuelle"}>
          <Inp label="Ville *" val={f.adresse} set={v=>upd({adresse:v})} ph="Montauroux, Fayence, Callian..."/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Inp label="Prix (€) *" val={f.prix} set={v=>upd({prix:v})} ph="620000" type="number"/>
            <Inp label="Surface hab. (m²) *" val={f.surface} set={v=>upd({surface:v})} ph="151" type="number"/>
            <Inp label="Terrain (m²)" val={f.surface_terrain} set={v=>upd({surface_terrain:v})} ph="957" type="number"/>
            <Inp label="Pièces" val={f.pieces} set={v=>upd({pieces:v})} ph="6" type="number"/>
            <Inp label="Chambres" val={f.chambres} set={v=>upd({chambres:v})} ph="4" type="number"/>
            <Inp label="SDB" val={f.salles_de_bain} set={v=>upd({salles_de_bain:v})} ph="3" type="number"/>
            <Inp label="Année constr." val={f.annee_construction} set={v=>upd({annee_construction:v})} ph="2010" type="number"/>
            <Inp label="Taxe foncière €" val={f.taxe_fonciere} set={v=>upd({taxe_fonciere:v})} ph="2220" type="number"/>
            <Inp label="N° mandat" val={f.numero_mandat} set={v=>upd({numero_mandat:v})} ph="2000441"/>
            <div style={S.ig}><label style={S.lbl}>Type</label><select value={f.type} onChange={e=>upd({type:e.target.value})} style={S.select}>{["Appartement","Maison","Studio","Terrain"].map(t=><option key={t}>{t}</option>)}</select></div>
            <div style={S.ig}><label style={S.lbl}>DPE</label><select value={f.dpe} onChange={e=>upd({dpe:e.target.value})} style={S.select}>{["A","B","C","D","E","F","G"].map(d=><option key={d}>{d}</option>)}</select></div>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:C.textSub,textTransform:"uppercase",marginBottom:8,marginTop:4}}>Équipements</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {[["piscine","🏊 Piscine"],["jardin","🌿 Jardin"],["terrasse","☀️ Terrasse"],["garage","🚗 Garage"],["parking","🅿️ Parking"]].map(([k,lb])=>(
              <button key={k} onClick={()=>upd({[k]:!f[k]})} style={{...S.toggleChip,...(f[k]?{background:`${C.teal}15`,border:`1px solid ${C.teal}40`,color:C.teal}:{})}}>{lb}</button>
            ))}
          </div>
        </Sec>

        <div style={{padding:"12px 16px 32px"}}>
          <button onClick={sauvegarder} disabled={!f.adresse} style={{...S.primaryBtn,opacity:!f.adresse?0.4:1}}>✓ Enregistrer le bien</button>
        </div>
      </div>
    </div>
  );
}

// ── ÉQUIPE ─────────────────────────────────────────────────────────────────────
function EquipeView({ agents, acquereurs, biens, agent, enAttente, onApprouver, onRefuser, onUpdateAgent }) {
  const isDir=agent.role==="Directeur";
  return (
    <div style={S.si}>
      <div style={{padding:"14px 16px 8px",fontWeight:800,fontSize:16,color:C.text}}>👥 Mon équipe</div>
      {isDir&&enAttente.length>0&&(
        <div style={{padding:"0 16px 8px"}}>
          <div style={{background:"#fffbeb",border:"1px solid #fde047",borderRadius:14,padding:14}}>
            <div style={{fontWeight:800,fontSize:13,color:"#713f12",marginBottom:10}}>⏳ {enAttente.length} demande{enAttente.length>1?"s":""} en attente</div>
            {enAttente.map(a=>(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #fde04760"}}>
                <Avatar photo={a.photo} initiale={a.avatar} color={a.color} size={36}/>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{a.nom} {a.prenom}</div><div style={{fontSize:11,color:C.textSub}}>{a.role}</div></div>
                <button onClick={()=>onApprouver(a.id)} style={{background:C.success,border:"none",borderRadius:8,padding:"6px 10px",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",marginRight:4}}>✓</button>
                <button onClick={()=>onRefuser(a.id)} style={{background:"#fef2f2",border:`1px solid ${C.danger}`,borderRadius:8,padding:"6px 10px",color:C.danger,fontSize:11,fontWeight:700,cursor:"pointer"}}>✗</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={S.scroll}>
        {agents.map(a=>{
          const myA=acquereurs.filter(x=>x.agentId===a.id);
          const myB=biens.filter(x=>x.agentId===a.id);
          const actifs=myA.filter(x=>["recherche","visite","offre"].includes(x.stage)).length;
          const isMe=a.id===agent.id;
          return (
            <div key={a.id} style={{...S.equipeCard,...(isMe?{borderColor:C.teal,borderWidth:2,background:`linear-gradient(135deg,#f0fdfa,#fff)`}:{})}}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}>
                {isMe?<PhotoPicker current={a.photo} label="" size={52} onPhoto={p=>onUpdateAgent({...a,photo:p})}/>:<Avatar photo={a.photo} initiale={a.avatar} color={a.color} size={52} border/>}
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:16,color:C.text}}>{a.nom} {a.prenom} {isMe&&<span style={{fontSize:11,color:C.teal}}>(moi)</span>}</div>
                  <div style={{fontSize:12,color:C.textSub}}>{a.role}</div>
                  {isMe&&<div style={{fontSize:10,color:C.textMuted,marginTop:1}}>Appuyez sur la photo pour modifier</div>}
                </div>
              </div>
              <div style={{display:"flex",background:`linear-gradient(135deg,${C.teal}06,${C.blueLight}04)`,borderRadius:12,overflow:"hidden",border:`1px solid ${C.teal}12`}}>
                {[[myA.length,"Acq.",a.color],[actifs,"Actifs",C.success],[myB.length,"Biens",C.gold]].map(([n,lb,col],i)=>(
                  <div key={i} style={{flex:1,padding:"10px 6px",textAlign:"center",borderRight:i<2?`1px solid ${C.teal}10`:"none"}}>
                    <div style={{fontSize:20,fontWeight:900,color:col}}>{n}</div>
                    <div style={{fontSize:9,color:C.textMuted,textTransform:"uppercase",marginTop:1}}>{lb}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
function NotifsView({ notifs, agents, enAttente, onApprouver, onRefuser, onRead, onReadAll }) {
  const unread=notifs.filter(n=>!n.lu).length;
  return (
    <div style={S.si}>
      <div style={{...S.listTop,justifyContent:"space-between"}}>
        <div style={{fontWeight:800,fontSize:16,color:C.text}}>🔔 Notifications</div>
        {unread>0&&<button onClick={onReadAll} style={{background:"none",border:"none",color:C.teal,fontSize:12,fontWeight:700,cursor:"pointer"}}>Tout lire</button>}
      </div>
      <div style={S.scroll}>
        {enAttente.map(a=>(
          <div key={a.id} style={{...S.notifCard,borderLeft:`3px solid ${C.gold}`,background:"#fffbeb"}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <Avatar photo={a.photo} initiale={a.avatar} color={a.color} size={32}/>
              <div style={{flex:1}}><div style={{fontWeight:800,fontSize:13,color:C.text,marginBottom:2}}>🆕 {a.nom} {a.prenom} demande à rejoindre l'agence</div><div style={{fontSize:11,color:C.textSub}}>{a.role} • {a.dateInscription}</div></div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <button onClick={()=>onApprouver(a.id)} style={{flex:1,background:C.success,border:"none",borderRadius:8,padding:"9px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>✓ Approuver</button>
              <button onClick={()=>onRefuser(a.id)} style={{flex:1,background:"#fef2f2",border:`1px solid ${C.danger}`,borderRadius:8,padding:"9px",color:C.danger,fontSize:13,fontWeight:700,cursor:"pointer"}}>✗ Refuser</button>
            </div>
          </div>
        ))}
        {notifs.length===0&&enAttente.length===0&&<div style={S.empty}>Aucune notification.</div>}
        {notifs.map(n=>{
          const from=agents.find(a=>a.id===n.fromAgentId);
          return (
            <div key={n.id} onClick={()=>onRead(n.id)} style={{...S.notifCard,...(!n.lu?{borderLeft:`3px solid ${C.teal}`,background:"#f0fdfa"}:{})}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{width:32,height:32,borderRadius:10,background:n.type==="approuve"?C.success:from?.color||C.teal,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff",fontWeight:800,flexShrink:0}}>{n.type==="approuve"?"✅":from?.avatar||"?"}</div>
                <div style={{flex:1}}><div style={{fontWeight:n.lu?600:800,fontSize:13,color:C.text,marginBottom:2}}>{n.msg}</div><div style={{fontSize:11,color:C.textMuted}}>{n.date}</div></div>
                {!n.lu&&<div style={{width:8,height:8,borderRadius:"50%",background:C.teal,flexShrink:0,marginTop:4}}/>}
              </div>
              {n.lu&&<div style={{fontSize:11,color:C.textMuted,marginTop:4}}>✓ Lu</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MICRO-COMPOSANTS ──────────────────────────────────────────────────────────
function MiseEnRelation({ isOwnAcq, isOwnBien, acqAgent, bienAgent, onSend }) {
  const [sent,setSent]=useState(false);
  if (sent) return <div style={S.ownTag}>✅ Notification envoyée dans l'app</div>;
  const toId=!isOwnAcq?acqAgent?.id:bienAgent?.id;
  const label=!isOwnAcq?`Demander mise en relation à ${acqAgent?.nom}`:`Contacter ${bienAgent?.nom}`;
  return <button onClick={()=>{onSend(toId,"Demande de mise en relation");setSent(true);}} style={{width:"100%",background:`linear-gradient(135deg,${C.teal},${C.blueLight})`,border:"none",borderRadius:9,padding:"9px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>🔗 {label}</button>;
}

const Sec=({title,children,action})=>(<div style={{padding:"14px 16px 4px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:6,borderBottom:`1px solid ${C.borderDark}`}}><span style={{fontSize:11,fontWeight:800,color:C.textSub,textTransform:"uppercase",letterSpacing:"0.08em"}}>{title}</span>{action}</div>{children}</div>);
const Row=({icon,val})=><div style={{display:"flex",gap:10,padding:"5px 0",fontSize:13,color:C.textSub}}><span>{icon}</span><span>{val}</span></div>;
const Inp=({label,val,set,ph,type="text"})=>(<div style={S.ig}><label style={S.lbl}>{label}</label><input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={S.input}/></div>);
const GlassInput=({label,val,set,ph,type="text"})=>(<div style={{marginBottom:12}}><label style={S.glassLabel}>{label}</label><input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={S.glassInput}/></div>);
const Chip=({children})=><span style={{background:`${C.teal}12`,color:C.teal,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600,border:`1px solid ${C.teal}20`}}>{children}</span>;
const MiniStat=({val,lbl,col})=><div style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:800,color:col}}>{val}</div><div style={{fontSize:9,color:C.textMuted,textTransform:"uppercase"}}>{lbl}</div></div>;
const StatBox=({val,lbl,col})=><div style={{background:col+"10",borderRadius:10,padding:"10px 6px",textAlign:"center",border:`1px solid ${col}18`}}><div style={{fontSize:15,fontWeight:900,color:col}}>{val}</div><div style={{fontSize:9,color:C.textMuted,textTransform:"uppercase",marginTop:1}}>{lbl}</div></div>;
const ScoreCircle=({score})=>{const col=score>=70?C.success:score>=50?C.warning:C.textMuted;return<div style={{width:42,height:42,borderRadius:"50%",background:col,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 2px 8px ${col}40`}}><div style={{fontSize:12,fontWeight:900,color:"#fff"}}>{score}</div><div style={{fontSize:7,color:"rgba(255,255,255,0.7)"}}>%</div></div>;};
const RecBar=()=><div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:C.danger,marginTop:6}}><span style={{width:8,height:8,borderRadius:"50%",background:C.danger,display:"inline-block"}}/>Enregistrement…</div>;
function CriteresGrid({c}) {
  const chips=[c.budget_max&&{lb:"Budget max",v:`${(c.budget_max/1000).toFixed(0)}k€`,col:C.success},c.budget_min&&{lb:"min",v:`${(c.budget_min/1000).toFixed(0)}k€`,col:C.success},c.type&&{lb:"Type",v:c.type,col:C.teal},c.pieces_min&&{lb:"Pièces",v:`≥${c.pieces_min}p`,col:"#7c3aed"},c.chambres_min&&{lb:"Chambres",v:`≥${c.chambres_min}`,col:"#db2777"},c.surface_min&&{lb:"Surface",v:`≥${c.surface_min}m²`,col:C.gold},c.surface_terrain_min&&{lb:"Terrain",v:`≥${c.surface_terrain_min}m²`,col:"#16a34a"},c.dpe_max&&{lb:"DPE max",v:c.dpe_max,col:C.success},...(c.villes||[]).map(v=>({lb:"Secteur",v,col:"#db2777"})),...(c.exigences||[]).map(e=>({lb:"✓",v:e,col:C.success})),...(c.exclusions||[]).map(e=>({lb:"✗",v:e,col:C.danger}))].filter(Boolean);
  return (
    <div style={{background:`linear-gradient(135deg,${C.teal}06,${C.blueLight}04)`,border:`1px solid ${C.teal}18`,borderRadius:12,padding:"10px 12px"}}>
      {c.resume&&<div style={{fontSize:12,color:C.teal,fontStyle:"italic",marginBottom:8}}>💡 {c.resume}</div>}
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:c.criteres_pieces?.length?8:0}}>
        {chips.map((ch,i)=><div key={i} style={{background:ch.col+"15",border:`1px solid ${ch.col}35`,borderRadius:8,padding:"3px 9px",fontSize:11,fontWeight:600,color:ch.col}}><span style={{opacity:0.6,fontSize:10}}>{ch.lb} </span>{ch.v}</div>)}
      </div>
      {c.criteres_pieces?.length>0&&(
        <div style={{borderTop:`1px solid ${C.teal}12`,paddingTop:8}}>
          <div style={{fontSize:10,fontWeight:800,color:C.textSub,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>📐 Critères par pièce</div>
          {c.criteres_pieces.map((cp,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
              <span style={{color:C.text,fontWeight:600}}>{cp.nom}</span>
              <span style={{color:C.teal,fontWeight:700,background:`${C.teal}10`,borderRadius:6,padding:"2px 8px"}}>{cp.surface_min&&cp.surface_max?`${cp.surface_min}–${cp.surface_max}m²`:cp.surface_min?`≥${cp.surface_min}m²`:cp.surface_max?`≤${cp.surface_max}m²`:"libre"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const S={
  shell:{minHeight:"100vh",background:"linear-gradient(135deg,#c8e6f0,#e8f4f8 50%,#d4eaf0)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,fontFamily:"'Outfit','Segoe UI',sans-serif"},
  phone:{width:"100%",maxWidth:390,minHeight:780,borderRadius:36,overflow:"hidden",boxShadow:"0 40px 80px rgba(10,61,98,0.25),0 0 0 1px rgba(255,255,255,0.5)",display:"flex",flexDirection:"column",position:"relative"},
  si:{display:"flex",flexDirection:"column",flex:1,overflow:"hidden",background:C.bg},
  listTop:{display:"flex",alignItems:"center",gap:10,padding:"12px 16px 8px"},
  filterRow:{display:"flex",gap:6,padding:"0 16px 10px",overflowX:"auto"},
  scroll:{flex:1,overflowY:"auto",paddingBottom:24},
  card:{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:`1px solid ${C.borderDark}`,cursor:"pointer",background:C.white},
  cardName:{fontWeight:700,fontSize:14,color:C.text,marginBottom:2},
  cardSub:{fontSize:12,color:C.textSub},
  pill:{borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700},
  tag:{borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700,color:"#fff"},
  chip:{background:C.bg,border:`1px solid ${C.borderDark}`,borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700,color:C.textSub,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0},
  chipOn:{background:C.teal,borderColor:C.teal,color:"#fff"},
  fab:{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${C.teal},${C.blueLight})`,border:"none",color:"#fff",fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 4px 14px ${C.teal}40`},
  searchInput:{flex:1,background:`${C.teal}0a`,border:`1px solid ${C.teal}20`,borderRadius:12,padding:"9px 14px",color:C.text,fontSize:14,outline:"none"},
  dh:{background:`linear-gradient(135deg,${C.blue},${C.teal})`,padding:"14px 14px 12px",display:"flex",alignItems:"center",gap:10},
  detailName:{fontWeight:800,fontSize:15,color:"#fff",flex:1},
  backBtn:{background:"rgba(255,255,255,0.18)",border:"none",borderRadius:10,width:32,height:32,color:"#fff",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},
  iconBtn:{background:"rgba(255,255,255,0.18)",border:"none",borderRadius:10,width:32,height:32,fontSize:15,cursor:"pointer"},
  tabs:{display:"flex",background:C.white,borderBottom:`1px solid ${C.borderDark}`},
  tab:{flex:1,background:"none",border:"none",borderBottom:"2px solid transparent",padding:"11px 2px",fontSize:10,fontWeight:700,color:C.textMuted,cursor:"pointer",position:"relative"},
  tabOn:{color:C.teal,borderBottom:`2px solid ${C.teal}`},
  tabBadge:{position:"absolute",top:4,right:2,background:C.danger,color:"#fff",borderRadius:"50%",width:14,height:14,fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"},
  confBanner:{margin:"10px 16px 0",background:"#fef9c3",border:"1px solid #fde047",borderRadius:10,padding:"8px 12px",fontSize:12,color:"#713f12"},
  editLink:{background:"none",border:"none",color:C.teal,fontSize:13,cursor:"pointer",fontWeight:700},
  noteBox:{background:`${C.teal}06`,borderRadius:10,padding:"10px 12px",fontSize:13,color:C.textSub,lineHeight:1.6,border:`1px solid ${C.teal}12`},
  textarea:{width:"100%",background:`${C.teal}06`,border:`1px solid ${C.teal}18`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"},
  voiceBtn:{flex:1,background:`${C.teal}08`,border:`1px solid ${C.teal}25`,borderRadius:10,padding:"10px",color:C.teal,fontSize:13,fontWeight:700,cursor:"pointer"},
  voiceBtnRec:{background:"#fef2f2",border:`1px solid ${C.danger}`,color:C.danger},
  analyseBtn:{flex:2,background:`linear-gradient(135deg,${C.teal},${C.blueLight})`,border:"none",borderRadius:10,padding:"10px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"},
  ig:{marginBottom:10},
  lbl:{display:"block",fontSize:11,fontWeight:700,color:C.textSub,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5},
  input:{width:"100%",background:`${C.teal}06`,border:`1px solid ${C.teal}18`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"},
  select:{width:"100%",background:`${C.teal}06`,border:`1px solid ${C.teal}18`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:14,outline:"none"},
  toggleChip:{background:C.bg,border:`1px solid ${C.borderDark}`,borderRadius:20,padding:"6px 12px",fontSize:12,fontWeight:600,color:C.textSub,cursor:"pointer"},
  primaryBtn:{width:"100%",background:`linear-gradient(135deg,${C.teal},${C.blueLight})`,border:"none",borderRadius:12,padding:"14px",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:`0 4px 16px ${C.teal}35`},
  matchBanner:{background:`linear-gradient(135deg,${C.teal}08,${C.blueLight}06)`,border:`1px solid ${C.teal}18`,borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:12},
  matchNum:{fontSize:28,fontWeight:900},
  matchLbl:{fontSize:13,color:C.textSub,lineHeight:1.4},
  matchCard:{margin:"10px 16px 0",background:C.white,borderRadius:14,padding:"13px",border:`1px solid ${C.borderDark}`,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"},
  okTag:{background:C.success+"12",color:C.success,border:`1px solid ${C.success}25`,borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:600},
  koTag:{background:C.danger+"10",color:C.danger,border:`1px solid ${C.danger}20`,borderRadius:6,padding:"2px 7px",fontSize:10,fontWeight:600},
  contactA:{flex:1,background:`${C.teal}08`,border:`1px solid ${C.teal}20`,borderRadius:8,padding:"7px",fontSize:12,fontWeight:700,color:C.teal,textAlign:"center",textDecoration:"none"},
  ownTag:{background:"#f0fdfa",border:`1px solid ${C.teal}25`,borderRadius:8,padding:"7px 10px",fontSize:12,color:C.teal,fontWeight:600},
  bienGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12},
  notifCard:{margin:"0 16px 10px",background:C.white,borderRadius:14,padding:"14px",border:`1px solid ${C.borderDark}`,cursor:"pointer"},
  equipeCard:{margin:"10px 16px 0",background:C.white,borderRadius:16,padding:"16px",border:`1px solid ${C.borderDark}`},
  empty:{textAlign:"center",padding:"32px 20px",color:C.textMuted,fontSize:14,lineHeight:1.8},
  actionBtn:{borderRadius:20,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap",flexShrink:0},
  visitBtn:{background:`${C.teal}08`,border:`1px solid ${C.teal}20`,borderRadius:8,padding:"6px 10px",fontSize:11,fontWeight:700,color:C.teal,cursor:"pointer",whiteSpace:"nowrap"},
  glassBtn:{width:"100%",background:"rgba(255,255,255,0.15)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:14,padding:"12px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"},
  primaryGlassBtn:{width:"100%",background:`linear-gradient(135deg,${C.teal},${C.blueLight})`,border:"none",borderRadius:14,padding:"14px",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer"},
  glassBackBtn:{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:10,width:36,height:36,color:"#fff",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"},
  glassLabel:{display:"block",fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.6)",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5},
  glassInput:{width:"100%",background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:10,padding:"10px 12px",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box"},
  glassSelect:{width:"100%",background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:10,padding:"10px 12px",color:"#fff",fontSize:14,outline:"none"},
  agentLoginBtn:{width:"100%",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:14,padding:"10px 12px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",marginBottom:8},
};
