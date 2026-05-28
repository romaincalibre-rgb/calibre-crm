# 🏠 Calibre CRM — Guide de déploiement Vercel

## Structure du projet

```
calibre-deploy/
├── index.html          ← Page principale
├── package.json        ← Dépendances React
├── vite.config.js      ← Configuration build
├── public/
│   └── manifest.json   ← Config PWA (installable iPhone)
└── src/
    ├── main.jsx        ← Point d'entrée
    └── App.jsx         ← ⚠️ COPIER ICI le fichier calibre-crm-v4.jsx
```

---

## ÉTAPE 1 — Installer Node.js (si pas déjà fait)

1. Allez sur https://nodejs.org
2. Téléchargez la version "LTS" (bouton vert à gauche)
3. Installez-le normalement

---

## ÉTAPE 2 — Préparer le projet

1. Créez un dossier `calibre-deploy` sur votre Bureau
2. Copiez tous les fichiers de ce ZIP dans ce dossier
3. **IMPORTANT** : Copiez le contenu de `calibre-crm-v4.jsx`
   dans `src/App.jsx`

---

## ÉTAPE 3 — Tester en local (optionnel mais recommandé)

Ouvrez le Terminal (Mac) ou PowerShell (Windows) :

```bash
cd Bureau/calibre-deploy
npm install
npm run dev
```

→ Ouvrez http://localhost:5173 dans votre navigateur
→ Si l'app s'affiche correctement, continuez

---

## ÉTAPE 4 — Créer un compte Vercel

1. Allez sur https://vercel.com
2. Cliquez "Sign Up"
3. Choisissez "Continue with Google" (gratuit)

---

## ÉTAPE 5 — Déployer l'app (2 méthodes)

### Méthode A : Glisser-déposer (la plus simple ✅)

1. Allez sur https://vercel.com/new
2. En bas de page, cherchez "Or deploy from your computer"
3. **Glissez-déposez** le dossier `calibre-deploy`
4. Vercel détecte automatiquement que c'est un projet Vite/React
5. Cliquez "Deploy"
6. ⏳ Attendez 1-2 minutes
7. ✅ Vous recevez une URL du type : https://calibre-crm-xxx.vercel.app

### Méthode B : Via GitHub (recommandé pour les mises à jour)

1. Créez un compte GitHub sur https://github.com
2. Créez un nouveau repository "calibre-crm"
3. Uploadez vos fichiers
4. Sur Vercel → "Import Git Repository"
5. Sélectionnez votre repo GitHub
6. ✅ À chaque mise à jour GitHub → Vercel redéploie automatiquement

---

## ÉTAPE 6 — Installer sur iPhone (vous + votre équipe)

1. Envoyez le lien Vercel à toute l'équipe par SMS/WhatsApp
2. Chaque agent ouvre le lien dans **Safari** (pas Chrome)
3. Appuie sur l'icône **Partager** (carré avec flèche ↑)
4. Appuie sur **"Sur l'écran d'accueil"**
5. ✅ L'icône 🏠 Calibre apparaît comme une vraie app

---

## MISES À JOUR

Quand vous voulez modifier l'app :

1. Demandez la modification à Claude
2. Claude vous donne un nouveau fichier `App.jsx`
3. Remplacez l'ancien `src/App.jsx` par le nouveau

### Si vous avez utilisé le glisser-déposer :
→ Retournez sur vercel.com → votre projet → "Deployments" → glissez à nouveau le dossier

### Si vous avez utilisé GitHub :
→ Remplacez le fichier sur GitHub
→ Vercel redéploie automatiquement en 1 minute
→ Toute l'équipe a la mise à jour instantanément

---

## DOMAINE PERSONNALISÉ (optionnel)

Pour avoir une URL comme https://crm.agencecalibre.fr :

1. Sur Vercel → votre projet → "Settings" → "Domains"
2. Entrez votre domaine
3. Suivez les instructions DNS de votre hébergeur de domaine

---

## RÉSUMÉ COÛTS

| Service | Coût |
|---------|------|
| Vercel (hébergement) | **Gratuit** |
| GitHub (optionnel) | **Gratuit** |
| Domaine personnalisé | ~10€/an (optionnel) |
| API Claude (IA vocale) | ~1-5€/mois selon usage |

---

## BESOIN D'AIDE ?

Revenez sur Claude et dites :
- "J'ai une erreur à l'étape X"
- "Ajoute la fonctionnalité Y"
- "Change la couleur en Z"

Claude mettra à jour l'app en quelques secondes.
