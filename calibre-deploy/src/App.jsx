import { useState, useRef, useEffect, useCallback } from "react";

const C = {
  bg:"#f0f4fa", white:"#ffffff", blue:"#0f2d6b", blueMid:"#1a4a9e",
  blueLight:"#2d6fd4", accent:"#e8f0fe", text:"#0f172a", textSub:"#64748b",
  textMuted:"#94a3b8", border:"#e2e8f0", success:"#16a34a",
  warning:"#d97706", danger:"#dc2626",
};

const AGENTS = [
  { id:"romain",  nom:"Romain",  role:"Directeur", avatar:"R", color:"#0f2d6b" },
  { id:"sophie",  nom:"Sophie",  role:"Agente",    avatar:"S", color:"#2563eb" },
  { id:"pierre",  nom:"Pierre",  role:"Agent",     avatar:"P", color:"#0891b2" },
  { id:"camille", nom:"Camille", role:"Agente",    avatar:"C", color:"#7c3aed" },
];

const STAGES = [
  { id:"nouveau",       label:"Nouveau",      color:"#64748b" },
  { id:"qualification", label:"Qualifié",     color:"#d97706" },
  { id:"recherche",     label:"En recherche", color:"#2563eb" },
  { id:"visite",        label:"Visites",      color:"#7c3aed" },
  { id:"offre",         label:"Offre",        color:"#db2777" },
  { id:"compromis",     label:"Compromis",    color:"#16a34a" },
];

// ── FRÉQUENCES DE RAFRAÎCHISSEMENT ────────────────────────────────────────────
const FREQUENCES = [
  { id:"aucune",    label:"Manuel",           icon:"⏸",  desc:"Pas de mise à jour automatique",     ms:null,          color:"#64748b" },
  { id:"15min",     label:"Toutes les 15 min",icon:"⚡",  desc:"Recherche relancée toutes les 15 min",ms:15*60*1000,    color:"#db2777" },
  { id:"1h",        label:"Toutes les heures",icon:"🔄",  desc:"Recherche relancée toutes les heures",ms:60*60*1000,    color:"#2563eb" },
  { id:"7h",        label:"Chaque jour à 7h", icon:"🌅",  desc:"Recherche lancée chaque matin à 7h",  ms:"7h",          color:"#d97706" },
];

const PORTAILS = [
  { id:"seloger",   nom:"SeLoger",    logo:"🔵", color:"#0070f3",
    buildUrl:(c)=>{
      const ville=(c.villes||[]).map(v=>v.replace(/\s/g,"-")).join(",")||"france";
      const p=new URLSearchParams();
      if(c.type==="Maison") p.set("idtypebien","2");
      else if(c.type==="Appartement") p.set("idtypebien","1");
      if(c.pieces_min) p.set("nb_pieces_min",c.pieces_min);
      if(c.budget_max) p.set("prix_max",c.budget_max);
      if(c.surface_min) p.set("surface_min",c.surface_min);
      return `https://www.seloger.com/achat/immobilier/${ville}/?${p}`;
    }},
  { id:"leboncoin", nom:"Leboncoin",  logo:"🟠", color:"#f56b2a",
    buildUrl:(c)=>{
      const p=new URLSearchParams({category:"9",ad_type:"offer"});
      if(c.villes?.length) p.set("locations",c.villes.join(","));
      if(c.budget_max) p.set("price","min-"+c.budget_max);
      if(c.pieces_min) p.set("rooms",c.pieces_min+"-max");
      if(c.surface_min) p.set("square",c.surface_min+"-max");
      return `https://www.leboncoin.fr/recherche?${p}`;
    }},
  { id:"bienici",   nom:"BienIci",   logo:"🟢", color:"#00b050",
    buildUrl:(c)=>{
      const p=new URLSearchParams({transactionType:"buy"});
      if(c.type==="Maison") p.set("propertyType","house");
      else if(c.type==="Appartement") p.set("propertyType","flat");
      if(c.villes?.length) p.set("zoneIds",c.villes.join(","));
      if(c.budget_max) p.set("maxPrice",c.budget_max);
      if(c.surface_min) p.set("minArea",c.surface_min);
      if(c.pieces_min) p.set("minRooms",c.pieces_min);
      return `https://www.bienici.com/recherche/achat?${p}`;
    }},
  { id:"pap",       nom:"PAP",       logo:"🔴", color:"#e2001a",
    buildUrl:(c)=>{
      const p=new URLSearchParams({"recherche[type]":"vente"});
      if(c.type==="Maison") p.set("recherche[bien]","maison-villa");
      else if(c.type==="Appartement") p.set("recherche[bien]","appartement");
      if(c.budget_max) p.set("recherche[prix_max]",c.budget_max);
      if(c.surface_min) p.set("recherche[surface_min]",c.surface_min);
      if(c.pieces_min) p.set("recherche[nb_pieces_min]",c.pieces_min);
      return `https://www.pap.fr/annonce/ventes-immobilieres-?${p}`;
    }},
  { id:"logicimmo", nom:"Logic-Immo",logo:"🟣", color:"#8b00ff",
    buildUrl:(c)=>{
      const ville=(c.villes||["france"]).join(",");
      const p=new URLSearchParams();
      if(c.budget_max) p.set("budget-max",c.budget_max);
      if(c.surface_min) p.set("surface-min",c.surface_min);
      if(c.pieces_min) p.set("nb-pieces-min",c.pieces_min);
      const type=c.type==="Maison"?"maison":c.type==="Appartement"?"appartement":"immobilier";
      return `https://www.logic-immo.com/vente-${type}-${ville}/options/${p}`;
    }},
  { id:"iad",       nom:"IAD",       logo:"⚫", color:"#1a1a1a",
    buildUrl:(c)=>{
      const p=new URLSearchParams({transaction:"buy"});
      if(c.type==="Maison") p.set("propertyTypes","HOUSE");
      else if(c.type==="Appartement") p.set("propertyTypes","FLAT");
      if(c.villes?.length) p.set("location",c.villes.join(","));
      if(c.budget_max) p.set("maxPrice",c.budget_max);
      if(c.surface_min) p.set("minSurface",c.surface_min);
      if(c.pieces_min) p.set("minRooms",c.pieces_min);
      return `https://www.iadfrance.fr/recherche?${p}`;
    }},
];

// ── DONNÉES INITIALES ─────────────────────────────────────────────────────────
const INIT_ACQ = [
  { id:1, agentId:"romain", nom:"Martin Dupont", tel:"06 12 34 56 78", email:"martin@email.fr",
    stage:"visite", note_brute:"T3 minimum Lyon 6 ou 7, budget 350 000, jardin ou terrasse, pas RDC, proche métro",
    criteres:{ budget_max:350000, type:"Appartement", pieces_min:3, surface_min:65, villes:["Lyon 6"], exigences:["jardin","terrasse"], exclusions:["RDC"] },
    biens_visites:[], alerte:true, date:"2026-04-10",
    refresh:{ frequence:"1h", actif:true, derniere:new Date(Date.now()-25*60*1000).toISOString(), prochaine:null, portails:["seloger","leboncoin","bienici"] },
    recherches:[] },
  { id:2, agentId:"sophie", nom:"Sophie & Paul Renard", tel:"07 65 43 21 00", email:"renard@gmail.com",
    stage:"recherche", note_brute:"Maison avec jardin Caluire ou Rillieux, 5 pièces, 550 000 max, garage",
    criteres:{ budget_max:550000, type:"Maison", pieces_min:5, surface_min:110, villes:["Caluire"], exigences:["jardin","garage"], exclusions:[] },
    biens_visites:[], alerte:true, date:"2026-05-02",
    refresh:{ frequence:"7h", actif:true, derniere:"2026-05-12T07:00:00.000Z", prochaine:null, portails:["seloger","leboncoin","bienici","pap","logicimmo","iad"] },
    recherches:[] },
  { id:3, agentId:"pierre", nom:"Camille Leroy", tel:"06 98 76 54 32", email:"c.leroy@pro.fr",
    stage:"offre", note_brute:"Investissement locatif, T2, Villeurbanne, 220 000 max",
    criteres:{ budget_max:220000, type:"Appartement", pieces_min:2, surface_min:40, villes:["Villeurbanne"], exigences:[], exclusions:[] },
    biens_visites:[], alerte:false, date:"2026-03-15",
    refresh:{ frequence:"aucune", actif:false, derniere:null, prochaine:null, portails:["seloger","leboncoin"] },
    recherches:[] },
  { id:4, agentId:"camille", nom:"Antoine Brun", tel:"06 11 22 33 44", email:"abrun@outlook.com",
    stage:"nouveau", note_brute:"Premier achat, studio ou T2 Lyon 8e, 180 000 max",
    criteres:{ budget_max:180000, type:"Appartement", pieces_min:1, surface_min:30, villes:["Lyon 8"], exigences:[], exclusions:[] },
    biens_visites:[], alerte:false, date:"2026-05-10",
    refresh:{ frequence:"15min", actif:true, derniere:new Date(Date.now()-5*60*1000).toISOString(), prochaine:null, portails:["seloger","leboncoin","bienici"] },
    recherches:[] },
];

const INIT_BIENS = [
  { id:1, agentId:"romain", type:"Appartement", adresse:"12 rue de la Paix, Lyon 69006",
    prix:340000, surface:72, pieces:3, dpe:"C", etage:3, jardin:true, terrasse:false, garage:false, parking:true,
    note_brute:"T3 lumineux Lyon 6e, 3ème étage, 72m², parking, cave, DPE C", date:"2026-05-08", statut:"disponible" },
  { id:2, agentId:"sophie", type:"Maison", adresse:"8 allée des Roses, Caluire 69300",
    prix:520000, surface:130, pieces:5, dpe:"B", etage:0, jardin:true, terrasse:true, garage:true, parking:false,
    note_brute:"Maison 5p Caluire 130m², grand jardin, garage double, DPE B", date:"2026-05-05", statut:"disponible" },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function calcProchaine(freq, derniere) {
  if (!freq || freq === "aucune") return null;
  if (freq === "7h") {
    const now = new Date();
    const next = new Date(now);
    next.setHours(7, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }
  const f = FREQUENCES.find(x => x.id === freq);
  if (!f?.ms) return null;
  const base = derniere ? new Date(derniere) : new Date();
  return new Date(base.getTime() + f.ms).toISOString();
}

function tempsRestant(prochaine) {
  if (!prochaine) return null;
  const diff = new Date(prochaine) - new Date();
  if (diff <= 0) return "Maintenant";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `dans ${h}h${m > 0 ? m + "m" : ""}`;
  if (m > 0) return `dans ${m}m${s > 0 ? s + "s" : ""}`;
  return `dans ${s}s`;
}

function formatDate(iso) {
  if (!iso) return "Jamais";
  return new Date(iso).toLocaleString("fr-FR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
}

async function analyserNoteIA(note, mode = "acquereur") {
  const prompt = mode === "acquereur"
    ? `Extrais les critères de recherche acquéreur. Note: "${note}"\nRéponds UNIQUEMENT en JSON sans backticks:\n{"budget_max":number|null,"type":"Appartement"|"Maison"|"Studio"|"Terrain"|null,"pieces_min":number|null,"surface_min":number|null,"villes":["ville ou CP"],"exigences":["jardin","terrasse","garage","parking"],"exclusions":["RDC"],"resume":"1 phrase"}`
    : `Extrais les caractéristiques du bien. Note: "${note}"\nRéponds UNIQUEMENT en JSON sans backticks:\n{"type":"Appartement"|"Maison"|"Studio"|"Terrain","prix":number|null,"surface":number|null,"pieces":number|null,"etage":number|null,"caracteristiques":["jardin","terrasse","garage","parking"],"dpe":"A"|"B"|"C"|null,"description":"1 phrase"}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 600, messages: [{ role: "user", content: prompt }] })
    });
    const d = await r.json();
    return JSON.parse((d.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim());
  } catch { return {}; }
}

function matcherAcquereurs(bien, acquereurs) {
  return acquereurs.map(acq => {
    const c = acq.criteres || {}; let score = 0; const ok = []; const ko = [];
    if (c.type && bien.type === c.type) { score += 30; ok.push("Type ✓"); } else if (c.type) ko.push(`Type: ${c.type}`);
    if (c.budget_max && bien.prix <= c.budget_max) { score += 25; ok.push("Prix ✓"); } else if (c.budget_max) ko.push("Prix > budget");
    if (c.surface_min && bien.surface >= c.surface_min) { score += 15; ok.push("Surface ✓"); } else if (c.surface_min) ko.push("Surface insuffisante");
    if (c.pieces_min && bien.pieces >= c.pieces_min) { score += 15; ok.push("Pièces ✓"); } else if (c.pieces_min) ko.push("Pièces insuffisantes");
    const caract = [bien.jardin && "jardin", bien.terrasse && "terrasse", bien.garage && "garage", bien.parking && "parking"].filter(Boolean);
    (c.exigences || []).forEach(ex => { if (caract.includes(ex.toLowerCase())) { score += 4; ok.push(`${ex} ✓`); } else ko.push(`${ex} absent`); });
    if (c.exclusions?.includes("RDC") && bien.etage > 0) { score += 5; ok.push("Pas RDC ✓"); }
    const vm = (c.villes || []).some(v => bien.adresse.toLowerCase().includes(v.toLowerCase()));
    if (vm) { score += 10; ok.push("Secteur ✓"); } else if ((c.villes || []).length) ko.push(`Secteur: ${(c.villes || []).join(", ")}`);
    return { ...acq, score: Math.min(score, 100), ok, ko };
  }).filter(a => a.score >= 40).sort((a, b) => b.score - a.score);
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function CalibreApp() {
  const [agent, setAgent] = useState(null);
  const [acquereurs, setAcquereurs] = useState(INIT_ACQ);
  const [biens, setBiens] = useState(INIT_BIENS);
  const [notifs, setNotifs] = useState([]);
  const [nav, setNav] = useState("acquereurs");
  const [stack, setStack] = useState([{ screen: "list" }]);
  const [now, setNow] = useState(new Date());

  // Tick toutes les secondes pour les comptes à rebours
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Moteur de rafraîchissement automatique
  useEffect(() => {
    const t = setInterval(() => {
      const nowMs = Date.now();
      setAcquereurs(list => list.map(acq => {
        const rf = acq.refresh;
        if (!rf?.actif || rf.frequence === "aucune") return acq;
        const prochaine = rf.prochaine || calcProchaine(rf.frequence, rf.derniere);
        if (!prochaine) return acq;
        if (new Date(prochaine) <= nowMs) {
          // Lancer les recherches automatiques
          const newRecherche = {
            type: "auto",
            portails: rf.portails,
            date: new Date().toLocaleString("fr-FR"),
            frequence: rf.frequence,
          };
          const nouvelleProchaine = calcProchaine(rf.frequence, new Date().toISOString());
          // Notif agent
          setNotifs(ns => [{
            id: Date.now() + Math.random(),
            type: "refresh",
            toAgentId: acq.agentId,
            msg: `🔄 Recherche automatique lancée pour ${acq.nom} sur ${rf.portails.length} portail(s)`,
            lu: false,
            date: new Date().toLocaleString("fr-FR"),
            acqId: acq.id,
          }, ...ns]);
          return {
            ...acq,
            recherches: [newRecherche, ...(acq.recherches || [])].slice(0, 20),
            refresh: { ...rf, derniere: new Date().toISOString(), prochaine: nouvelleProchaine }
          };
        }
        return { ...acq, refresh: { ...rf, prochaine } };
      }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const push = s => setStack(x => [...x, s]);
  const pop = () => setStack(x => x.length > 1 ? x.slice(0, -1) : x);
  const cur = stack[stack.length - 1];
  const myNotifs = notifs.filter(n => n.toAgentId === agent?.id && !n.lu).length;

  const sendNotif = (from, toAgentId, msg) =>
    setNotifs(ns => [{ id: Date.now(), fromAgentId: from.id, toAgentId, msg, lu: false, date: new Date().toLocaleString("fr-FR") }, ...ns]);

  const updateAcq = a => setAcquereurs(l => l.map(x => x.id === a.id ? a : x));

  if (!agent) return <LoginScreen agents={AGENTS} onLogin={a => { setAgent(a); setNav("acquereurs"); setStack([{ screen: "list" }]); }} />;

  return (
    <div style={S.shell}>
      <div style={S.phone}>
        <div style={S.topBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🏠</span>
            <div>
              <div style={S.logoName}>Calibre</div>
              <div style={S.logoSlogan}>Toit toit mon toit</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {myNotifs > 0 && (
              <button onClick={() => { setNav("notifs"); setStack([{ screen: "list" }]); }} style={S.notifBtn}>
                🔔<span style={S.notifBadge}>{myNotifs}</span>
              </button>
            )}
            <div style={S.agentPill} onClick={() => setAgent(null)}>
              <div style={{ ...S.avSm, background: agent.color }}>{agent.avatar}</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.white }}>{agent.nom}</span>
            </div>
          </div>
        </div>

        <div style={S.navBar}>
          {[["acquereurs", "👤", "Acquéreurs"], ["biens", "🏡", "Biens"], ["equipe", "👥", "Équipe"], ["notifs", "🔔", "Notifs"]].map(([id, ic, lb]) => (
            <button key={id} onClick={() => { setNav(id); setStack([{ screen: "list" }]); }}
              style={{ ...S.navBtn, ...(nav === id ? S.navOn : {}) }}>
              <span style={{ position: "relative" }}>
                {ic}
                {id === "notifs" && myNotifs > 0 && <span style={S.navBadge}>{myNotifs}</span>}
              </span>
              <span style={{ fontSize: 9, marginTop: 1 }}>{lb}</span>
            </button>
          ))}
        </div>

        <div style={S.content}>
          {nav === "acquereurs" && cur.screen === "list" &&
            <AcqList acquereurs={acquereurs} agents={AGENTS} agent={agent} now={now}
              onSelect={a => push({ screen: "detail", id: a.id })} onNew={() => push({ screen: "new" })} />}
          {nav === "acquereurs" && cur.screen === "detail" &&
            <AcqDetail acq={acquereurs.find(a => a.id === cur.id)} agents={AGENTS} agent={agent}
              biens={biens} onBack={pop} onUpdate={updateAcq} onNotif={sendNotif} now={now} />}
          {nav === "acquereurs" && cur.screen === "new" &&
            <NewAcq agent={agent} onBack={pop}
              onSave={a => { setAcquereurs(l => [...l, { ...a, id: Date.now(), biens_visites: [], alerte: false, date: new Date().toISOString().split("T")[0], recherches: [], refresh: { frequence: "aucune", actif: false, derniere: null, prochaine: null, portails: ["seloger", "leboncoin", "bienici"] } }]); pop(); }} />}

          {nav === "biens" && cur.screen === "list" &&
            <BienList biens={biens} agents={AGENTS} agent={agent}
              onSelect={b => push({ screen: "detail", id: b.id })} onNew={() => push({ screen: "new" })} />}
          {nav === "biens" && cur.screen === "detail" &&
            <BienDetail bien={biens.find(b => b.id === cur.id)} agents={AGENTS} agent={agent}
              acquereurs={acquereurs} onBack={pop} onNotif={sendNotif} />}
          {nav === "biens" && cur.screen === "new" &&
            <NewBien agent={agent} onBack={pop}
              onSave={b => { setBiens(l => [...l, { ...b, id: Date.now(), date: new Date().toISOString().split("T")[0], statut: "disponible" }]); pop(); }} />}

          {nav === "equipe" && <EquipeView agents={AGENTS} acquereurs={acquereurs} biens={biens} agent={agent} now={now} />}
          {nav === "notifs" && <NotifsView notifs={notifs.filter(n => n.toAgentId === agent.id)} agents={AGENTS}
            onRead={id => setNotifs(ns => ns.map(n => n.id === id ? { ...n, lu: true } : n))}
            onReadAll={() => setNotifs(ns => ns.map(n => n.toAgentId === agent.id ? { ...n, lu: true } : n))} />}
        </div>
      </div>
    </div>
  );
}

// ── LOGIN ──────────────────────────────────────────────────────────────────────
function LoginScreen({ agents, onLogin }) {
  return (
    <div style={S.shell}>
      <div style={S.phone}>
        <div style={{ background: `linear-gradient(160deg,${C.blue},${C.blueMid} 55%,${C.blueLight})`, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div style={{ fontSize: 64, marginBottom: 6 }}>🏠</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.white, letterSpacing: "-0.03em", marginBottom: 2 }}>Calibre</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontStyle: "italic", marginBottom: 48 }}>Toit toit mon toit</div>
          <div style={{ width: "100%" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center", marginBottom: 14 }}>Choisir mon profil</div>
            {agents.map(a => (
              <button key={a.id} onClick={() => onLogin(a)} style={S.loginBtn}>
                <div style={{ ...S.avMd, background: a.color }}>{a.avatar}</div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontWeight: 700, color: C.text }}>{a.nom}</div>
                  <div style={{ fontSize: 12, color: C.textSub }}>{a.role}</div>
                </div>
                <span style={{ color: C.blueLight, fontSize: 20 }}>›</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LISTE ACQUÉREURS ───────────────────────────────────────────────────────────
function AcqList({ acquereurs, agents, agent, now, onSelect, onNew }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("tous");
  const filtered = acquereurs.filter(a => {
    const q = a.nom.toLowerCase().includes(search.toLowerCase());
    if (filter === "moi") return q && a.agentId === agent.id;
    if (filter === "equipe") return q && a.agentId !== agent.id;
    return q;
  });
  return (
    <div style={S.screen}>
      <div style={S.listTop}>
        <input placeholder="🔍 Rechercher…" value={search} onChange={e => setSearch(e.target.value)} style={S.searchInput} />
        <button onClick={onNew} style={S.addBtn}>+</button>
      </div>
      <div style={S.filterRow}>
        {[["tous", `Tous (${acquereurs.length})`], ["moi", `Les miens (${acquereurs.filter(a => a.agentId === agent.id).length})`], ["equipe", "Équipe"]].map(([id, lb]) => (
          <button key={id} onClick={() => setFilter(id)} style={{ ...S.chip, ...(filter === id ? S.chipOn : {}) }}>{lb}</button>
        ))}
      </div>
      <div style={S.scroll}>
        {filtered.map(acq => {
          const st = STAGES.find(x => x.id === acq.stage) || STAGES[0];
          const ag = agents.find(a => a.id === acq.agentId);
          const isOwn = acq.agentId === agent.id;
          const rf = acq.refresh;
          const freq = FREQUENCES.find(f => f.id === rf?.frequence);
          const prochaine = rf?.prochaine || calcProchaine(rf?.frequence, rf?.derniere);
          const restant = rf?.actif && rf?.frequence !== "aucune" ? tempsRestant(prochaine) : null;
          return (
            <div key={acq.id} onClick={() => onSelect(acq)} style={S.card}>
              <div style={{ ...S.avMd, background: ag?.color }}>{acq.nom.charAt(0)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.cardName}>{isOwn ? acq.nom : "Acquéreur confidentiel"}</div>
                <div style={S.cardSub}>
                  {acq.criteres?.budget_max ? `${(acq.criteres.budget_max / 1000).toFixed(0)}k€` : "—"} • {acq.criteres?.type || "—"} • {acq.criteres?.villes?.[0] || "—"}
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ ...S.pill, background: st.color + "18", color: st.color }}>{st.label}</span>
                  <span style={{ ...S.tag, background: ag?.color }}>{isOwn ? "Moi" : ag?.nom}</span>
                  {rf?.actif && freq && freq.id !== "aucune" && (
                    <span style={{ ...S.pill, background: freq.color + "15", color: freq.color, display: "flex", alignItems: "center", gap: 3 }}>
                      {freq.icon} {restant || freq.label}
                    </span>
                  )}
                </div>
              </div>
              {acq.alerte && <span>🔔</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DÉTAIL ACQUÉREUR ───────────────────────────────────────────────────────────
function AcqDetail({ acq, agents, agent, biens, onBack, onUpdate, onNotif, now }) {
  const [tab, setTab] = useState("fiche");
  const [note, setNote] = useState(acq.note_brute || "");
  const [editNote, setEditNote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [iframePortail, setIframePortail] = useState(null);
  const recRef = useRef(null);
  const isOwn = acq.agentId === agent.id;
  const owner = agents.find(a => a.id === acq.agentId);
  const rf = acq.refresh || { frequence: "aucune", actif: false, portails: ["seloger", "leboncoin", "bienici"] };
  const freq = FREQUENCES.find(f => f.id === rf.frequence) || FREQUENCES[0];
  const prochaine = rf.prochaine || calcProchaine(rf.frequence, rf.derniere);
  const biensMatch = biens.filter(b => {
    const c = acq.criteres || {};
    if (c.type && b.type !== c.type) return false;
    if (c.budget_max && b.prix > c.budget_max) return false;
    if (c.surface_min && b.surface < c.surface_min) return false;
    if (c.pieces_min && b.pieces < c.pieces_min) return false;
    return true;
  });

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
    const r = new SR(); r.lang = "fr-FR"; r.continuous = true; r.interimResults = true;
    r.onresult = e => setNote(Array.from(e.results).map(x => x[0].transcript).join(" "));
    r.onend = () => setRecording(false); r.start(); recRef.current = r; setRecording(true);
  };
  const reAnalyser = async () => {
    setLoading(true);
    const c = await analyserNoteIA(note, "acquereur");
    onUpdate({ ...acq, note_brute: note, criteres: c });
    setEditNote(false); setLoading(false);
  };

  const lancerMaintenant = () => {
    const newR = { type: "manuel", portails: rf.portails, date: new Date().toLocaleString("fr-FR"), frequence: "manuel" };
    const nouvelleProchaine = calcProchaine(rf.frequence, new Date().toISOString());
    onUpdate({ ...acq, recherches: [newR, ...(acq.recherches || [])].slice(0, 20), refresh: { ...rf, derniere: new Date().toISOString(), prochaine: nouvelleProchaine } });
  };

  const updateRefresh = (changes) => {
    const newRf = { ...rf, ...changes };
    if (changes.frequence) {
      newRf.prochaine = calcProchaine(changes.frequence, new Date().toISOString());
      newRf.actif = changes.frequence !== "aucune";
    }
    onUpdate({ ...acq, refresh: newRf });
  };

  const ouvrirPortail = (portail) => {
    const url = portail.buildUrl(acq.criteres || {});
    onUpdate({ ...acq, recherches: [{ type: "portail", portail: portail.nom, url, date: new Date().toLocaleString("fr-FR") }, ...(acq.recherches || [])].slice(0, 20) });
    setIframePortail({ ...portail, url });
  };

  if (iframePortail) return (
    <div style={S.screen}>
      <div style={{ ...S.detailHeader, gap: 8 }}>
        <button onClick={() => setIframePortail(null)} style={S.backBtn}>←</button>
        <div style={{ ...S.avSm, background: iframePortail.color, fontSize: 16 }}>{iframePortail.logo}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: C.white }}>{iframePortail.nom}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>Recherche pré-remplie pour {acq.nom}</div>
        </div>
        <a href={iframePortail.url} target="_blank" rel="noreferrer"
          style={{ background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "5px 10px", color: C.white, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
          ↗ Ouvrir
        </a>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 16, textAlign: "center" }}>
        <div style={{ fontSize: 52 }}>{iframePortail.logo}</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: C.blue }}>{iframePortail.nom}</div>
        <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>
          Les portails bloquent l'affichage intégré.<br />Votre recherche est prête avec tous les critères.
        </div>
        <a href={iframePortail.url} target="_blank" rel="noreferrer"
          style={{ ...S.primaryBtn, textDecoration: "none", display: "block", background: `linear-gradient(135deg,${iframePortail.color},${iframePortail.color}cc)` }}>
          🔗 Ouvrir {iframePortail.nom} avec les critères
        </a>
        <div style={{ background: C.accent, borderRadius: 12, padding: "10px 14px", width: "100%" }}>
          <CriteresGrid c={acq.criteres || {}} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.screen}>
      <div style={S.detailHeader}>
        <button onClick={onBack} style={S.backBtn}>←</button>
        <div style={{ flex: 1 }}>
          <div style={S.detailName}>{isOwn ? acq.nom : "Acquéreur confidentiel"}</div>
          <div style={{ display: "flex", gap: 5, marginTop: 2, flexWrap: "wrap" }}>
            <span style={{ ...S.pill, background: (STAGES.find(x => x.id === acq.stage) || STAGES[0]).color + "25", color: (STAGES.find(x => x.id === acq.stage) || STAGES[0]).color }}>
              {(STAGES.find(x => x.id === acq.stage) || STAGES[0]).label}
            </span>
            <span style={{ ...S.tag, background: owner?.color }}>{isOwn ? "Moi" : owner?.nom}</span>
            {rf.actif && freq.id !== "aucune" && (
              <span style={{ ...S.pill, background: freq.color + "18", color: freq.color }}>{freq.icon} {freq.label}</span>
            )}
          </div>
        </div>
        {isOwn && <button onClick={() => onUpdate({ ...acq, alerte: !acq.alerte })}
          style={{ ...S.iconBtn, color: acq.alerte ? C.warning : C.textMuted }}>🔔</button>}
      </div>

      <div style={S.tabs}>
        {[["fiche", "📋 Fiche"], ["portails", "🔍 Portails"], ["refresh", "🔄 Alertes"], ["matching", "🎯 Match"]].map(([id, lb]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...S.tab, ...(tab === id ? S.tabOn : {}) }}>
            {lb}
            {id === "matching" && biensMatch.length > 0 && <span style={S.tabBadge}>{biensMatch.length}</span>}
          </button>
        ))}
      </div>

      <div style={S.scroll}>
        {/* FICHE */}
        {tab === "fiche" && <>
          {!isOwn && <div style={S.confidBanner}>🔒 Informations masquées — appartient à <b>{owner?.nom}</b></div>}
          <Sec title="Coordonnées">
            <Row icon="📞" val={isOwn ? acq.tel : "●●● ●● ●● ●● ●●"} />
            <Row icon="✉️" val={isOwn ? acq.email : "●●●●@●●●●.●●"} />
            <Row icon="👤" val={isOwn ? "Mon client" : `Agent: ${owner?.nom}`} />
          </Sec>
          <Sec title="🎤 Note vocale" action={isOwn && <button onClick={() => setEditNote(!editNote)} style={S.editLink}>{editNote ? "Annuler" : "✏️"}</button>}>
            {isOwn && editNote ? <>
              <textarea value={note} onChange={e => setNote(e.target.value)} style={S.textarea} rows={4} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={recording ? () => { recRef.current?.stop(); setRecording(false); } : startVoice}
                  style={{ ...S.voiceBtn, ...(recording ? S.voiceBtnRec : {}) }}>
                  {recording ? "⏹ Stop" : "🎤 Dicter"}
                </button>
                <button onClick={reAnalyser} disabled={loading} style={S.analyseBtn}>
                  {loading ? "⏳…" : "✨ IA → Critères"}
                </button>
              </div>
              {recording && <RecBar />}
            </> : <div style={S.noteBox}>{isOwn ? (acq.note_brute || <em style={{ color: C.textMuted }}>Aucune note</em>) : <em style={{ color: C.textMuted }}>Confidentiel</em>}</div>}
          </Sec>
          {acq.criteres && <Sec title="🎯 Critères extraits"><CriteresGrid c={acq.criteres} /></Sec>}
        </>}

        {/* PORTAILS */}
        {tab === "portails" && <>
          {!acq.criteres && <div style={S.empty}>Ajoutez d'abord des critères dans la fiche.</div>}
          {acq.criteres && <>
            <div style={{ padding: "10px 16px 6px" }}>
              <CriteresGrid c={acq.criteres} />
            </div>
            <div style={{ padding: "8px 16px 0" }}>
              {PORTAILS.map(p => {
                const url = p.buildUrl(acq.criteres || {});
                const last = (acq.recherches || []).filter(r => r.portail === p.nom).slice(-1)[0];
                const isSelected = rf.portails?.includes(p.id);
                return (
                  <div key={p.id} style={{ ...S.portailCard, ...(isSelected ? { borderColor: p.color + "60", borderWidth: 1.5 } : { opacity: 0.6 }) }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ ...S.portailLogo, background: p.color + "15" }}><span style={{ fontSize: 20 }}>{p.logo}</span></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{p.nom}</div>
                        <div style={{ fontSize: 10, color: C.textMuted }}>
                          {last ? `Dernière: ${last.date}` : "Jamais recherché"}
                          {isSelected && rf.actif && freq.id !== "aucune" && <span style={{ color: freq.color, marginLeft: 6 }}>{freq.icon} Auto</span>}
                        </div>
                      </div>
                      {isOwn && (
                        <button onClick={() => {
                          const newPortails = isSelected ? rf.portails.filter(x => x !== p.id) : [...(rf.portails || []), p.id];
                          updateRefresh({ portails: newPortails });
                        }} style={{ ...S.toggleChip, ...(isSelected ? { background: p.color + "15", border: `1px solid ${p.color}40`, color: p.color } : {}) }}>
                          {isSelected ? "✓ Inclus" : "+ Inclure"}
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => ouvrirPortail(p)}
                        style={{ flex: 1, background: p.color + "12", border: `1px solid ${p.color}35`, borderRadius: 9, padding: "8px", color: p.color, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        📱 Dans l'app
                      </button>
                      <a href={url} target="_blank" rel="noreferrer"
                        style={{ flex: 1, background: p.color, borderRadius: 9, padding: "8px", color: C.white, fontSize: 12, fontWeight: 700, textDecoration: "none", textAlign: "center", display: "block" }}>
                        ↗ Ouvrir
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </>}
        </>}

        {/* REFRESH / ALERTES AUTO */}
        {tab === "refresh" && <>
          {!isOwn && <div style={S.confidBanner}>Seul {owner?.nom} peut modifier les alertes de cet acquéreur.</div>}

          {/* Statut actuel */}
          <div style={{ padding: "12px 16px 0" }}>
            <div style={{ ...S.refreshStatusCard, borderColor: freq.color + "44", background: freq.color + "08" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 28 }}>{freq.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: freq.color }}>{freq.label}</div>
                  <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{freq.desc}</div>
                </div>
                {rf.actif && freq.id !== "aucune" && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: C.textMuted }}>Prochaine</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: freq.color }}>
                      {tempsRestant(prochaine) || "—"}
                    </div>
                  </div>
                )}
              </div>
              {rf.derniere && (
                <div style={{ marginTop: 8, fontSize: 11, color: C.textMuted, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                  Dernière mise à jour : {formatDate(rf.derniere)}
                </div>
              )}
            </div>
          </div>

          {/* Choix fréquence */}
          {isOwn && <>
            <Sec title="Choisir la fréquence">
              {FREQUENCES.map(f => (
                <button key={f.id} onClick={() => updateRefresh({ frequence: f.id })}
                  style={{ ...S.freqBtn, ...(rf.frequence === f.id ? { borderColor: f.color, background: f.color + "10" } : {}) }}>
                  <div style={{ ...S.freqIcon, background: f.color + "18", color: f.color }}>{f.icon}</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: rf.frequence === f.id ? f.color : C.text }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: C.textSub }}>{f.desc}</div>
                  </div>
                  {rf.frequence === f.id && <span style={{ color: f.color, fontSize: 18, fontWeight: 900 }}>✓</span>}
                </button>
              ))}
            </Sec>

            {/* Portails inclus dans l'auto */}
            {rf.frequence !== "aucune" && (
              <Sec title="Portails inclus dans la mise à jour auto">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {PORTAILS.map(p => {
                    const sel = rf.portails?.includes(p.id);
                    return (
                      <button key={p.id} onClick={() => {
                        const newP = sel ? rf.portails.filter(x => x !== p.id) : [...(rf.portails || []), p.id];
                        updateRefresh({ portails: newP });
                      }} style={{ ...S.toggleChip, ...(sel ? { background: p.color + "15", border: `1px solid ${p.color}44`, color: p.color } : {}) }}>
                        {p.logo} {p.nom}
                      </button>
                    );
                  })}
                </div>
              </Sec>
            )}

            {/* Lancer maintenant */}
            <div style={{ padding: "8px 16px 0" }}>
              <button onClick={lancerMaintenant} style={{ ...S.primaryBtn, background: `linear-gradient(135deg,${C.success},#059669)` }}>
                ▶ Lancer la recherche maintenant
              </button>
            </div>
          </>}

          {/* Historique */}
          {(acq.recherches || []).length > 0 && (
            <Sec title={`Historique (${(acq.recherches || []).length})`}>
              {(acq.recherches || []).slice(0, 8).map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{r.type === "auto" ? "🔄" : r.type === "manuel" ? "▶" : "🔗"}</span>
                    <span style={{ fontWeight: 600, color: C.text }}>
                      {r.type === "auto" ? `Auto — ${r.portails?.length} portail(s)` : r.type === "manuel" ? "Manuel" : r.portail}
                    </span>
                  </div>
                  <span style={{ color: C.textMuted }}>{r.date}</span>
                </div>
              ))}
            </Sec>
          )}
        </>}

        {/* MATCHING */}
        {tab === "matching" && <>
          <div style={{ ...S.matchBanner, margin: "12px 16px 0" }}>
            <div style={S.matchNum}>{biensMatch.length}</div>
            <div style={S.matchLbl}>bien{biensMatch.length > 1 ? "s" : ""} de votre stock correspondent</div>
          </div>
          {biensMatch.length === 0 && <div style={S.empty}>Aucun bien du stock ne correspond.<br />Lancez une recherche sur les portails →</div>}
          {biensMatch.map(b => {
            const bAg = agents.find(a => a.id === b.agentId);
            const isOwnBien = b.agentId === agent.id;
            return (
              <div key={b.id} style={S.matchCard}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.blue }}>{b.type}</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{b.adresse}</div>
                  </div>
                  <span style={{ ...S.tag, background: bAg?.color, alignSelf: "flex-start" }}>{isOwnBien ? "Moi" : bAg?.nom}</span>
                </div>
                <div style={{ display: "flex", gap: 14, margin: "6px 0" }}>
                  <MiniStat val={`${(b.prix / 1000).toFixed(0)}k€`} lbl="Prix" col={C.success} />
                  <MiniStat val={`${b.surface}m²`} lbl="Surface" col={C.blueLight} />
                  <MiniStat val={`${b.pieces}p`} lbl="Pièces" col="#7c3aed" />
                  {b.dpe && <MiniStat val={b.dpe} lbl="DPE" col={b.dpe <= "C" ? C.success : b.dpe <= "D" ? C.warning : C.danger} />}
                </div>
                {isOwn && isOwnBien && <div style={S.ownTag}>✓ Votre bien & votre acquéreur</div>}
                {(!isOwn || !isOwnBien) && (
                  <MiseEnRelation isOwnAcq={isOwn} isOwnBien={isOwnBien} acqAgent={owner} bienAgent={bAg}
                    onSend={(toId, msg) => onNotif(agent, toId, msg)} />
                )}
              </div>
            );
          })}
        </>}
      </div>
    </div>
  );
}

// ── LISTE BIENS ────────────────────────────────────────────────────────────────
function BienList({ biens, agents, agent, onSelect, onNew }) {
  return (
    <div style={S.screen}>
      <div style={S.listTop}>
        <div style={{ fontWeight: 800, fontSize: 16, color: C.text, flex: 1 }}>Stock de biens</div>
        <button onClick={onNew} style={S.addBtn}>+</button>
      </div>
      <div style={S.scroll}>
        {biens.map(b => {
          const ag = agents.find(a => a.id === b.agentId);
          return (
            <div key={b.id} onClick={() => onSelect(b)} style={S.card}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {b.type === "Maison" ? "🏡" : "🏢"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.cardName}>{b.adresse}</div>
                <div style={S.cardSub}>{(b.prix / 1000).toFixed(0)}k€ • {b.surface}m² • {b.pieces}p • DPE {b.dpe}</div>
                <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
                  <span style={{ ...S.pill, background: C.accent, color: C.blue }}>{b.type}</span>
                  <span style={{ ...S.tag, background: ag?.color }}>{ag?.id === agent.id ? "Moi" : ag?.nom}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DÉTAIL BIEN ────────────────────────────────────────────────────────────────
function BienDetail({ bien, agents, agent, acquereurs, onBack, onNotif }) {
  const owner = agents.find(a => a.id === bien.agentId);
  const isOwn = bien.agentId === agent.id;
  const matches = matcherAcquereurs(bien, acquereurs);
  const [tab, setTab] = useState("caract");
  return (
    <div style={S.screen}>
      <div style={S.detailHeader}>
        <button onClick={onBack} style={S.backBtn}>←</button>
        <div style={{ flex: 1 }}>
          <div style={S.detailName}>{bien.type} — {bien.adresse.split(",")[0]}</div>
          <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
            <span style={{ ...S.tag, background: owner?.color }}>{isOwn ? "Mon bien" : owner?.nom}</span>
            <span style={{ ...S.pill, background: C.success + "18", color: C.success }}>{bien.statut}</span>
          </div>
        </div>
      </div>
      <div style={{ ...S.matchBanner, margin: "10px 16px 0" }}>
        <div style={S.matchNum}>{matches.length}</div>
        <div style={S.matchLbl}>acquéreur{matches.length > 1 ? "s" : ""} correspondent</div>
      </div>
      <div style={S.tabs}>
        {[["caract", "🏠 Bien"], ["acq", `🎯 Matchs (${matches.length})`]].map(([id, lb]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...S.tab, ...(tab === id ? S.tabOn : {}) }}>{lb}</button>
        ))}
      </div>
      <div style={S.scroll}>
        {tab === "caract" && <>
          <Sec title="Caractéristiques">
            <div style={S.bienGrid}>
              <StatBox val={`${(bien.prix / 1000).toFixed(0)}k€`} lbl="Prix" col={C.success} />
              <StatBox val={`${bien.surface}m²`} lbl="Surface" col={C.blueLight} />
              <StatBox val={`${bien.pieces}p`} lbl="Pièces" col="#7c3aed" />
              <StatBox val={bien.dpe || "—"} lbl="DPE" col={bien.dpe <= "C" ? C.success : bien.dpe <= "D" ? C.warning : C.danger} />
            </div>
            <Row icon="📍" val={bien.adresse} />
            <Row icon="🏢" val={`Étage: ${bien.etage === 0 ? "RDC" : bien.etage}`} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {bien.jardin && <Chip>🌿 Jardin</Chip>}
              {bien.terrasse && <Chip>☀️ Terrasse</Chip>}
              {bien.garage && <Chip>🚗 Garage</Chip>}
              {bien.parking && <Chip>🅿️ Parking</Chip>}
            </div>
          </Sec>
        </>}
        {tab === "acq" && <>
          {matches.length === 0 && <div style={S.empty}>Aucun acquéreur ne correspond encore.</div>}
          {matches.map(acq => {
            const acqAg = agents.find(a => a.id === acq.agentId);
            const isOwnAcq = acq.agentId === agent.id;
            return (
              <div key={acq.id} style={S.matchCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ ...S.avSm, background: acqAg?.color }}>{isOwnAcq ? acq.nom.charAt(0) : "?"}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{isOwnAcq ? acq.nom : "Acquéreur confidentiel"}</div>
                      <div style={{ fontSize: 11, color: C.textSub }}>{isOwnAcq ? acq.email : `Agent: ${acqAg?.nom}`}</div>
                    </div>
                  </div>
                  <ScoreCircle score={acq.score} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                  {acq.ok.map((r, i) => <span key={i} style={S.okTag}>{r}</span>)}
                  {acq.ko.slice(0, 2).map((r, i) => <span key={i} style={S.koTag}>{r}</span>)}
                </div>
                {isOwnAcq ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <a href={`tel:${acq.tel}`} style={S.contactA}>📞 Appeler</a>
                    <a href={`mailto:${acq.email}`} style={S.contactA}>✉️ Email</a>
                  </div>
                ) : (
                  <MiseEnRelation isOwnAcq={false} isOwnBien={isOwn} acqAgent={acqAg} bienAgent={owner}
                    onSend={(toId, msg) => onNotif(agent, toId, msg)} />
                )}
              </div>
            );
          })}
        </>}
      </div>
    </div>
  );
}

// ── NEW ACQ / BIEN ─────────────────────────────────────────────────────────────
function NewAcq({ agent, onBack, onSave }) {
  const [nom, setNom] = useState(""); const [tel, setTel] = useState(""); const [email, setEmail] = useState("");
  const [stage, setStage] = useState("nouveau"); const [note, setNote] = useState(""); const [criteres, setCriteres] = useState(null);
  const [loading, setLoading] = useState(false); const [recording, setRecording] = useState(false);
  const recRef = useRef(null);
  const startV = () => { const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return; const r = new SR(); r.lang = "fr-FR"; r.continuous = true; r.interimResults = true; r.onresult = e => setNote(Array.from(e.results).map(x => x[0].transcript).join(" ")); r.onend = () => setRecording(false); r.start(); recRef.current = r; setRecording(true); };
  const analyse = async () => { setLoading(true); const c = await analyserNoteIA(note, "acquereur"); setCriteres(c); setLoading(false); };
  return (
    <div style={S.screen}>
      <div style={S.detailHeader}><button onClick={onBack} style={S.backBtn}>←</button><div style={S.detailName}>Nouvel acquéreur</div><span style={{ ...S.tag, background: agent.color }}>{agent.nom}</span></div>
      <div style={S.scroll}>
        <Sec title="Identité">
          <Inp label="Nom *" val={nom} set={setNom} ph="ex: Martin Dupont" />
          <Inp label="Téléphone" val={tel} set={setTel} ph="06 XX XX XX XX" type="tel" />
          <Inp label="Email" val={email} set={setEmail} ph="email@exemple.fr" type="email" />
          <div style={S.inputGroup}><label style={S.lbl}>Étape</label><select value={stage} onChange={e => setStage(e.target.value)} style={S.select}>{STAGES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}</select></div>
        </Sec>
        <Sec title="🎤 Critères">
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Dictez ou tapez les critères…" style={S.textarea} rows={4} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={recording ? () => { recRef.current?.stop(); setRecording(false); } : startV} style={{ ...S.voiceBtn, ...(recording ? S.voiceBtnRec : {}) }}>{recording ? "⏹ Stop" : "🎤 Dicter"}</button>
            <button onClick={analyse} disabled={!note.trim() || loading} style={{ ...S.analyseBtn, opacity: !note.trim() || loading ? 0.5 : 1 }}>{loading ? "⏳…" : "✨ IA → Critères"}</button>
          </div>
          {recording && <RecBar />}
          {criteres && <div style={{ marginTop: 10 }}><CriteresGrid c={criteres} /></div>}
        </Sec>
        <div style={{ padding: "0 16px 32px" }}>
          <button onClick={() => onSave({ nom, tel, email, stage, note_brute: note, criteres: criteres || {}, agentId: agent.id })} disabled={!nom || !criteres} style={{ ...S.primaryBtn, opacity: !nom || !criteres ? 0.4 : 1 }}>✓ Créer l'acquéreur</button>
        </div>
      </div>
    </div>
  );
}

function NewBien({ agent, onBack, onSave }) {
  const [note, setNote] = useState(""); const [loading, setLoading] = useState(false); const [recording, setRecording] = useState(false);
  const [f, setF] = useState({ adresse: "", prix: "", surface: "", pieces: "", type: "Appartement", dpe: "C", etage: "0", jardin: false, terrasse: false, garage: false, parking: false });
  const recRef = useRef(null);
  const upd = v => setF(x => ({ ...x, ...v }));
  const startV = () => { const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return; const r = new SR(); r.lang = "fr-FR"; r.continuous = true; r.interimResults = true; r.onresult = e => setNote(Array.from(e.results).map(x => x[0].transcript).join(" ")); r.onend = () => setRecording(false); r.start(); recRef.current = r; setRecording(true); };
  const analyse = async () => { setLoading(true); const c = await analyserNoteIA(note, "bien"); upd({ prix: c.prix ? String(c.prix) : f.prix, surface: c.surface ? String(c.surface) : f.surface, pieces: c.pieces ? String(c.pieces) : f.pieces, type: c.type || f.type, dpe: c.dpe || f.dpe, jardin: c.caracteristiques?.includes("jardin") || f.jardin, terrasse: c.caracteristiques?.includes("terrasse") || f.terrasse, garage: c.caracteristiques?.includes("garage") || f.garage, parking: c.caracteristiques?.includes("parking") || f.parking }); setLoading(false); };
  return (
    <div style={S.screen}>
      <div style={S.detailHeader}><button onClick={onBack} style={S.backBtn}>←</button><div style={S.detailName}>Nouveau bien</div><span style={{ ...S.tag, background: agent.color }}>{agent.nom}</span></div>
      <div style={S.scroll}>
        <Sec title="🎤 Description vocale">
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: T3 Lyon 6e, 72m², 340 000€, parking, DPE C…" style={S.textarea} rows={3} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}><button onClick={recording ? () => { recRef.current?.stop(); setRecording(false); } : startV} style={{ ...S.voiceBtn, ...(recording ? S.voiceBtnRec : {}) }}>{recording ? "⏹ Stop" : "🎤 Dicter"}</button><button onClick={analyse} disabled={!note.trim() || loading} style={{ ...S.analyseBtn, opacity: !note.trim() || loading ? 0.5 : 1 }}>{loading ? "⏳…" : "✨ IA → Fiche"}</button></div>
          {recording && <RecBar />}
        </Sec>
        <Sec title="Fiche bien">
          <Inp label="Adresse *" val={f.adresse} set={v => upd({ adresse: v })} ph="12 rue de la Paix, Lyon 69006" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Inp label="Prix (€) *" val={f.prix} set={v => upd({ prix: v })} ph="340000" type="number" />
            <Inp label="Surface (m²) *" val={f.surface} set={v => upd({ surface: v })} ph="72" type="number" />
            <Inp label="Pièces" val={f.pieces} set={v => upd({ pieces: v })} ph="3" type="number" />
            <Inp label="Étage" val={f.etage} set={v => upd({ etage: v })} ph="0=RDC" type="number" />
            <div style={S.inputGroup}><label style={S.lbl}>Type</label><select value={f.type} onChange={e => upd({ type: e.target.value })} style={S.select}>{["Appartement", "Maison", "Studio", "Terrain"].map(t => <option key={t}>{t}</option>)}</select></div>
            <div style={S.inputGroup}><label style={S.lbl}>DPE</label><select value={f.dpe} onChange={e => upd({ dpe: e.target.value })} style={S.select}>{["A", "B", "C", "D", "E", "F", "G"].map(d => <option key={d}>{d}</option>)}</select></div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {[["jardin", "🌿 Jardin"], ["terrasse", "☀️ Terrasse"], ["garage", "🚗 Garage"], ["parking", "🅿️ Parking"]].map(([k, lb]) => (
              <button key={k} onClick={() => upd({ [k]: !f[k] })} style={{ ...S.toggleChip, ...(f[k] ? S.toggleChipOn : {}) }}>{lb}</button>
            ))}
          </div>
        </Sec>
        <div style={{ padding: "12px 16px 32px" }}>
          <button onClick={() => onSave({ ...f, prix: Number(f.prix), surface: Number(f.surface), pieces: Number(f.pieces), etage: Number(f.etage), agentId: agent.id, note_brute: note })} disabled={!f.adresse || !f.prix || !f.surface} style={{ ...S.primaryBtn, opacity: !f.adresse || !f.prix || !f.surface ? 0.4 : 1 }}>✓ Enregistrer le bien</button>
        </div>
      </div>
    </div>
  );
}

// ── ÉQUIPE ─────────────────────────────────────────────────────────────────────
function EquipeView({ agents, acquereurs, biens, agent }) {
  return (
    <div style={S.screen}>
      <div style={{ padding: "14px 16px 8px", fontWeight: 800, fontSize: 16, color: C.text }}>👥 Mon équipe</div>
      <div style={S.scroll}>
        {agents.map(a => {
          const myA = acquereurs.filter(x => x.agentId === a.id);
          const myB = biens.filter(x => x.agentId === a.id);
          const actifs = myA.filter(x => ["recherche", "visite", "offre"].includes(x.stage)).length;
          const alertesAuto = myA.filter(x => x.refresh?.actif && x.refresh?.frequence !== "aucune").length;
          const isMe = a.id === agent.id;
          return (
            <div key={a.id} style={{ ...S.equipeCard, ...(isMe ? { borderColor: a.color, borderWidth: 2 } : {}) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ ...S.avLg, background: a.color }}>{a.avatar}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>{a.nom} {isMe && <span style={{ fontSize: 11, color: a.color }}>(moi)</span>}</div>
                  <div style={{ fontSize: 12, color: C.textSub }}>{a.role}</div>
                </div>
              </div>
              <div style={{ display: "flex", background: C.accent, borderRadius: 12, overflow: "hidden" }}>
                {[[myA.length, "Acquéreurs", a.color], [actifs, "Actifs", C.success], [myB.length, "Biens", C.warning], [alertesAuto, "Alertes auto", "#db2777"]].map(([n, lb, col], i) => (
                  <div key={i} style={{ flex: 1, padding: "10px 4px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: col }}>{n}</div>
                    <div style={{ fontSize: 8, color: C.textMuted, textTransform: "uppercase" }}>{lb}</div>
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

// ── NOTIFICATIONS ──────────────────────────────────────────────────────────────
function NotifsView({ notifs, agents, onRead, onReadAll }) {
  const unread = notifs.filter(n => !n.lu).length;
  return (
    <div style={S.screen}>
      <div style={{ ...S.listTop, justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>🔔 Notifications</div>
        {unread > 0 && <button onClick={onReadAll} style={{ background: "none", border: "none", color: C.blueLight, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Tout lire</button>}
      </div>
      <div style={S.scroll}>
        {notifs.length === 0 && <div style={S.empty}>Aucune notification.</div>}
        {notifs.map(n => {
          const from = agents.find(a => a.id === n.fromAgentId);
          const isRefresh = n.type === "refresh";
          return (
            <div key={n.id} style={{ ...S.notifCard, ...(!n.lu ? S.notifUnread : {}) }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: isRefresh ? C.blueLight + "22" : from?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isRefresh ? 16 : 13, fontWeight: 800, color: isRefresh ? C.blueLight : C.white, flexShrink: 0 }}>
                  {isRefresh ? "🔄" : from?.avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: n.lu ? 600 : 800, fontSize: 13, color: C.text, marginBottom: 3 }}>{n.msg}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{n.date}</div>
                </div>
                {!n.lu && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue, flexShrink: 0, marginTop: 4 }} />}
              </div>
              {!n.lu && !isRefresh && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => { onRead(n.id); alert("✅ Mise en relation acceptée !"); }} style={{ flex: 1, background: C.success, border: "none", borderRadius: 8, padding: "8px", color: C.white, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Accepter</button>
                  <button onClick={() => onRead(n.id)} style={{ flex: 1, background: "#fef2f2", border: `1px solid ${C.danger}`, borderRadius: 8, padding: "8px", color: C.danger, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✗ Refuser</button>
                </div>
              )}
              {!n.lu && isRefresh && <button onClick={() => onRead(n.id)} style={{ marginTop: 8, background: "none", border: "none", color: C.blueLight, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Marquer comme lu</button>}
              {n.lu && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>✓ Traité</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MICRO-COMPOSANTS ───────────────────────────────────────────────────────────
function MiseEnRelation({ isOwnAcq, isOwnBien, acqAgent, bienAgent, onSend }) {
  const [sent, setSent] = useState(false);
  if (sent) return <div style={S.ownTag}>✅ Notification envoyée dans l'app</div>;
  const toId = !isOwnAcq ? acqAgent?.id : bienAgent?.id;
  const label = !isOwnAcq ? `Demander mise en relation à ${acqAgent?.nom}` : `Contacter ${bienAgent?.nom} pour ce bien`;
  const msg = !isOwnAcq ? `Votre acquéreur correspond à un bien — mise en relation ?` : `Votre bien correspond à l'un de nos acquéreurs — mise en relation ?`;
  return (
    <button onClick={() => { onSend(toId, msg); setSent(true); }}
      style={{ width: "100%", background: `linear-gradient(135deg,${C.blue},${C.blueLight})`, border: "none", borderRadius: 9, padding: "9px", color: C.white, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
      🔗 {label}
    </button>
  );
}

const Sec = ({ title, children, action }) => (
  <div style={{ padding: "14px 16px 4px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</span>
      {action}
    </div>
    {children}
  </div>
);
const Row = ({ icon, val }) => <div style={{ display: "flex", gap: 10, padding: "5px 0", fontSize: 13, color: C.textSub }}><span>{icon}</span><span>{val}</span></div>;
const Inp = ({ label, val, set, ph, type = "text" }) => (
  <div style={S.inputGroup}><label style={S.lbl}>{label}</label><input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph} style={S.input} /></div>
);
const Chip = ({ children }) => <span style={{ background: C.accent, color: C.blue, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{children}</span>;
const MiniStat = ({ val, lbl, col }) => <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: col }}>{val}</div><div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase" }}>{lbl}</div></div>;
const StatBox = ({ val, lbl, col }) => <div style={{ background: col + "10", borderRadius: 10, padding: "10px 6px", textAlign: "center", border: `1px solid ${col}20` }}><div style={{ fontSize: 16, fontWeight: 900, color: col }}>{val}</div><div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginTop: 1 }}>{lbl}</div></div>;
const ScoreCircle = ({ score }) => <div style={{ width: 40, height: 40, borderRadius: "50%", background: score >= 70 ? C.success : score >= 50 ? C.warning : C.textMuted, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><div style={{ fontSize: 11, fontWeight: 900, color: "#fff" }}>{score}</div><div style={{ fontSize: 7, color: "rgba(255,255,255,0.7)" }}>%</div></div>;
const RecBar = () => <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.danger, marginTop: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: C.danger, display: "inline-block" }} />Enregistrement…</div>;
function CriteresGrid({ c }) {
  const chips = [
    c.budget_max && { lb: "Budget max", v: `${(c.budget_max / 1000).toFixed(0)} 000 €`, col: C.success },
    c.type && { lb: "Type", v: c.type, col: C.blueLight },
    c.pieces_min && { lb: "Pièces min", v: `${c.pieces_min}p`, col: "#7c3aed" },
    c.surface_min && { lb: "Surface min", v: `${c.surface_min}m²`, col: C.warning },
    ...(c.villes || []).map(v => ({ lb: "Secteur", v, col: "#db2777" })),
    ...(c.exigences || []).map(e => ({ lb: "✓", v: e, col: C.success })),
    ...(c.exclusions || []).map(e => ({ lb: "✗", v: e, col: C.danger })),
  ].filter(Boolean);
  return <div style={{ background: C.accent, borderRadius: 12, padding: "10px 12px" }}>
    {c.resume && <div style={{ fontSize: 12, color: C.blue, fontStyle: "italic", marginBottom: 8 }}>💡 {c.resume}</div>}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {chips.map((ch, i) => <div key={i} style={{ background: ch.col + "18", border: `1px solid ${ch.col}40`, borderRadius: 8, padding: "3px 9px", fontSize: 11, fontWeight: 600, color: ch.col }}><span style={{ opacity: 0.6, fontSize: 10 }}>{ch.lb} </span>{ch.v}</div>)}
    </div>
  </div>;
}

const S = {
  shell: { minHeight: "100vh", background: "#d0dcf0", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Outfit','Segoe UI',sans-serif" },
  phone: { width: "100%", maxWidth: 390, minHeight: 780, background: C.bg, borderRadius: 36, overflow: "hidden", boxShadow: "0 32px 64px rgba(10,31,68,0.22),0 0 0 1px rgba(10,31,68,0.08)", display: "flex", flexDirection: "column" },
  topBar: { background: `linear-gradient(135deg,${C.blue},${C.blueMid})`, padding: "16px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logoName: { fontSize: 18, fontWeight: 900, color: C.white, letterSpacing: "-0.02em" },
  logoSlogan: { fontSize: 9, color: "rgba(255,255,255,0.5)", fontStyle: "italic" },
  agentPill: { display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 10px 4px 4px", cursor: "pointer" },
  notifBtn: { background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 20, padding: "5px 10px", color: C.white, fontSize: 13, cursor: "pointer", position: "relative" },
  notifBadge: { position: "absolute", top: -3, right: -3, background: C.danger, color: C.white, borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" },
  navBar: { display: "flex", background: C.white, borderBottom: `1px solid ${C.border}` },
  navBtn: { flex: 1, background: "none", border: "none", borderBottom: "2px solid transparent", padding: "10px 0 8px", fontSize: 11, fontWeight: 600, color: C.textSub, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 },
  navOn: { color: C.blue, borderBottom: `2px solid ${C.blue}` },
  navBadge: { position: "absolute", top: -4, right: -5, background: C.danger, color: C.white, borderRadius: "50%", width: 14, height: 14, fontSize: 8, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" },
  content: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  screen: { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" },
  listTop: { display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 8px" },
  filterRow: { display: "flex", gap: 6, padding: "0 16px 10px", overflowX: "auto" },
  chip: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: C.textSub, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 },
  chipOn: { background: C.blue, borderColor: C.blue, color: C.white },
  scroll: { flex: 1, overflowY: "auto", paddingBottom: 24 },
  card: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: C.white },
  cardName: { fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 2 },
  cardSub: { fontSize: 12, color: C.textSub },
  pill: { borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 },
  tag: { borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: C.white },
  addBtn: { width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,${C.blue},${C.blueLight})`, border: "none", color: C.white, fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  searchInput: { flex: 1, background: C.accent, border: "none", borderRadius: 12, padding: "9px 14px", color: C.text, fontSize: 14, outline: "none" },
  detailHeader: { background: `linear-gradient(135deg,${C.blue},${C.blueMid})`, padding: "14px 14px 12px", display: "flex", alignItems: "center", gap: 10 },
  detailName: { fontWeight: 800, fontSize: 15, color: C.white, flex: 1 },
  backBtn: { background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, width: 32, height: 32, color: C.white, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  iconBtn: { background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, width: 32, height: 32, fontSize: 15, cursor: "pointer" },
  tabs: { display: "flex", background: C.white, borderBottom: `1px solid ${C.border}` },
  tab: { flex: 1, background: "none", border: "none", borderBottom: "2px solid transparent", padding: "11px 2px", fontSize: 10, fontWeight: 700, color: C.textSub, cursor: "pointer", position: "relative" },
  tabOn: { color: C.blue, borderBottom: `2px solid ${C.blue}` },
  tabBadge: { position: "absolute", top: 4, right: 2, background: C.danger, color: C.white, borderRadius: "50%", width: 14, height: 14, fontSize: 8, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" },
  confidBanner: { margin: "10px 16px 0", background: "#fef9c3", border: "1px solid #fde047", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#713f12" },
  editLink: { background: "none", border: "none", color: C.blueLight, fontSize: 13, cursor: "pointer", fontWeight: 700 },
  noteBox: { background: C.accent, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: C.textSub, lineHeight: 1.6 },
  textarea: { width: "100%", background: C.accent, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", color: C.text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" },
  voiceBtn: { flex: 1, background: C.accent, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px", color: C.textSub, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  voiceBtnRec: { background: "#fef2f2", border: `1px solid ${C.danger}`, color: C.danger },
  analyseBtn: { flex: 2, background: `linear-gradient(135deg,${C.blue},${C.blueLight})`, border: "none", borderRadius: 10, padding: "10px", color: C.white, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  inputGroup: { marginBottom: 10 },
  lbl: { display: "block", fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 },
  input: { width: "100%", background: C.accent, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box" },
  select: { width: "100%", background: C.accent, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px", color: C.text, fontSize: 14, outline: "none" },
  toggleChip: { background: C.accent, border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: C.textSub, cursor: "pointer" },
  toggleChipOn: { background: C.success + "15", border: `1px solid ${C.success}44`, color: C.success },
  primaryBtn: { width: "100%", background: `linear-gradient(135deg,${C.blue},${C.blueLight})`, border: "none", borderRadius: 12, padding: "14px", color: C.white, fontSize: 15, fontWeight: 800, cursor: "pointer" },
  matchBanner: { background: `linear-gradient(135deg,${C.blue}08,${C.blueLight}15)`, border: `1px solid ${C.blue}22`, borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 },
  matchNum: { fontSize: 28, fontWeight: 900, color: C.blue },
  matchLbl: { fontSize: 13, color: C.textSub, lineHeight: 1.4 },
  matchCard: { margin: "10px 16px 0", background: C.white, borderRadius: 14, padding: "13px", border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" },
  okTag: { background: C.success + "12", color: C.success, border: `1px solid ${C.success}30`, borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 600 },
  koTag: { background: C.danger + "10", color: C.danger, border: `1px solid ${C.danger}25`, borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 600 },
  contactA: { flex: 1, background: C.accent, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px", fontSize: 12, fontWeight: 700, color: C.blue, textAlign: "center", textDecoration: "none" },
  ownTag: { background: "#f0fdf4", border: `1px solid ${C.success}44`, borderRadius: 8, padding: "7px 10px", fontSize: 12, color: C.success, fontWeight: 600 },
  bienGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 },
  portailCard: { background: C.white, borderRadius: 14, padding: "14px", marginBottom: 10, border: `1px solid ${C.border}` },
  portailLogo: { width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  refreshStatusCard: { borderRadius: 16, border: "2px solid", padding: "16px", marginBottom: 4 },
  freqBtn: { width: "100%", background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" },
  freqIcon: { width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 },
  notifCard: { margin: "0 16px 10px", background: C.white, borderRadius: 14, padding: "14px", border: `1px solid ${C.border}` },
  notifUnread: { borderLeft: `3px solid ${C.blue}`, background: "#f8fbff" },
  equipeCard: { margin: "10px 16px 0", background: C.white, borderRadius: 16, padding: "16px", border: `1px solid ${C.border}` },
  avLg: { width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 20, color: C.white, flexShrink: 0 },
  avMd: { width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17, color: C.white, flexShrink: 0 },
  avSm: { width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, color: C.white, flexShrink: 0 },
  loginBtn: { width: "100%", background: C.white, border: "none", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: 10 },
  empty: { textAlign: "center", padding: "32px 20px", color: C.textMuted, fontSize: 14, lineHeight: 1.8 },
};
