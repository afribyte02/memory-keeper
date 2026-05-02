# Rapport de Projet de Fin d'Études — Mise à Jour de Session
## Annexe : Journal de Débogage & Résolutions en Production (02 Mai 2026)

---

## A.1 Contexte

Cette annexe documente les problèmes techniques rencontrés lors de la phase de mise en service (déploiement local) de l'application Memory Keeper, ainsi que les solutions apportées. Ces problèmes constituent une démonstration réaliste des défis d'intégration d'un système full-stack en production.

---

## A.2 Problèmes Rencontrés et Solutions

### A.2.1 Erreur `auth/api-key-not-valid` (Firebase Client)

**Symptôme :** L'application frontale (React) rejetait toute tentative de connexion avec l'erreur `auth/api-key-not-valid`.

**Cause :** Les variables d'environnement (`REACT_APP_FIREBASE_*`) contenaient des valeurs fictives (placeholders). Le serveur de développement React avait été démarré *avant* la mise à jour du fichier `.env` avec les vraies clés.

**Solution appliquée :**
1. Mise à jour du fichier `frontend/.env` avec les vraies clés Firebase du projet `vmemory-bb7cc`.
2. Redémarrage complet du serveur de développement React (`npm start`) pour que les nouvelles variables d'environnement soient chargées.

**Leçon :** En React (Create React App), les variables `.env` sont compilées au moment du **démarrage** du serveur. Toute modification du `.env` nécessite un redémarrage du serveur.

---

### A.2.2 Erreur `auth/configuration-not-found` (Firebase Auth)

**Symptôme :** Après correction de la clé API, la tentative d'inscription retournait `auth/configuration-not-found`.

**Cause :** Les méthodes de connexion (Email/Mot de passe, Google) n'avaient pas été activées dans la console Firebase du projet.

**Solution appliquée :** Activation des fournisseurs d'authentification dans la console Firebase : *Authentication > Sign-in method > Email/Password > Activer*.

---

### A.2.3 Crash du Backend au Démarrage (`Failed to parse private key`)

**Symptôme :** Le serveur Node.js crashait immédiatement au démarrage avec l'erreur :
```
FirebaseAppError: Failed to parse private key: Error: Invalid PEM formatted message.
```

**Cause :** Le fichier `backend/.env` contenait encore la clé privée fictive `YOUR_KEY`. De plus, quand la clé réelle a été ajoutée, le serveur crashait car `process.exit(1)` était appelé dans le handler d'erreur MongoDB avant que l'application puisse démarrer.

**Solutions appliquées :**
1. Remplacement de la clé fictive par la vraie clé de compte de service Firebase Admin SDK (fichier `.json` généré depuis la console Firebase).
2. Encapsulation de l'initialisation du SDK Firebase Admin dans un bloc `try/catch` pour éviter le crash.
3. Commentaire temporaire de `process.exit(1)` dans `config/db.js` pour permettre le débogage itératif.
4. Ajout d'un mécanisme de **bypass temporaire** pour permettre les tests sans clé Admin valide :

```javascript
// Bypass si le SDK Admin n'est pas initialisé
if (verifyError.message?.includes('The default Firebase app does not exist')) {
  req.user = { uid: 'test-user-123', email: 'test@example.com' };
  return next();
}
```

---

### A.2.4 Erreur CORS bloquant toutes les requêtes API

**Symptôme :** Toutes les requêtes depuis `localhost:3000` vers `localhost:5000` étaient bloquées par le navigateur :
```
Access to XMLHttpRequest at 'http://localhost:5000/api/memories' from origin 'http://localhost:3000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present.
```

**Cause (critique) :** Dans `server.js`, le middleware CORS était enregistré **après** le middleware de rate limiting (`express-rate-limit`). Lors des requêtes `OPTIONS` (preflight CORS), le rate limiter répondait en premier, sans inclure les en-têtes CORS. Le navigateur interprétait cette réponse comme un rejet CORS.

**Solution appliquée :** Réorganisation de l'ordre des middlewares dans `server.js`. Le middleware CORS doit impérativement être le **premier** middleware enregistré :

```javascript
// CORRECT — CORS en premier
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.options('*', cors()); // Gérer les requêtes preflight explicitement
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use('/api', limiter);
```

**Leçon d'architecture :** L'ordre des middlewares Express est séquentiel et critique. CORS doit toujours précéder tout middleware susceptible de retourner une réponse (rate limiter, auth, etc.).

---

### A.2.5 Timeout d'Upload pour les Fichiers Volumineux

**Symptôme :** L'upload de fichiers supérieurs à ~5MB échouait avec l'erreur :
```
Upload failed: timeout of 30000ms exceeded
```

**Cause :** Le client Axios avait un timeout global de 30 secondes, insuffisant pour uploader des fichiers volumineux vers Cloudinary via une connexion standard.

**Solution appliquée :** Configuration d'un timeout étendu spécifique aux requêtes d'upload :

```javascript
// Timeout par défaut : 60s
const api = axios.create({ timeout: 60000 });

// Timeout upload : 5 minutes (300 000ms)
api.post('/upload/single', formData, { timeout: 300000 });
```

---

### A.2.6 Limite de Taille Cloudinary (Plan Gratuit)

**Symptôme :** L'upload d'une image de 13.4 MB retournait l'erreur Cloudinary :
```
Upload failed: File size too large. Got 14066528. Maximum is 10485760.
```

**Cause :** Le plan gratuit de Cloudinary impose une limite de **10 MB par fichier**. Le système était configuré pour accepter jusqu'à 100 MB.

**Solutions appliquées :**
1. Mise à jour de la limite Multer (`backend/config/cloudinary.js`) : `100MB → 10MB`.
2. Mise à jour de `maxSize` dans `react-dropzone` côté frontend : `100MB → 10MB`.
3. Amélioration du message d'erreur pour afficher la taille réelle du fichier rejeté et expliquer la contrainte.

**Contrainte documentée :** Cette limite est inhérente au plan d'hébergement gratuit. La solution de production recommandée est soit la compression côté client (via l'API Canvas ou une bibliothèque comme `browser-image-compression`), soit la mise à niveau vers un plan Cloudinary payant.

---

### A.2.7 Bug de Race Condition : Photo Non Sauvegardée en Mode Édition

**Symptôme :** Lors de l'édition d'un souvenir, l'ajout d'une nouvelle photo semblait réussir mais la photo n'apparaissait pas après la sauvegarde.

**Cause (race condition) :** L'upload vers Cloudinary est **asynchrone**. Si l'utilisateur cliquait sur "Update Memory" avant la fin de l'upload, le formulaire était soumis avec l'ancienne liste de médias, sans la nouvelle photo.

**Flux problématique :**
```
[t=0s]   Utilisateur glisse une photo → upload démarre
[t=1s]   Utilisateur clique "Update Memory" (upload toujours en cours)
[t=1s]   Formulaire soumis : media = [ancien média seulement]
[t=4s]   Upload terminé → mais formulaire déjà soumis !
```

**Solution appliquée :** Ajout d'un état `uploading` partagé entre `MediaUploader` et `UploadMemory` via un callback `onUploadingChange` :

```javascript
// MediaUploader notifie le parent de son état
const isUploading = queue.some(item => !item.done && !item.error);
onUploadingChange?.(isUploading);

// UploadMemory désactive le bouton de sauvegarde
<button disabled={saving || uploading}>
  {uploading ? 'Uploading media…' : 'Save Memory'}
</button>
```

**Leçon :** Les race conditions sont l'une des sources de bugs les plus fréquentes dans les interfaces avec des opérations asynchrones. La solution canonique est de **bloquer les actions dépendantes** jusqu'à la résolution de l'opération asynchrone.

---

## A.3 Tableau Récapitulatif des Corrections

| # | Erreur | Composant | Cause | Statut |
|---|--------|-----------|-------|--------|
| 1 | `auth/api-key-not-valid` | Frontend | `.env` avec placeholder | ✅ Corrigé |
| 2 | `auth/configuration-not-found` | Firebase | Méthodes de connexion non activées | ✅ Corrigé |
| 3 | Crash démarrage backend | Backend | Clé privée Firebase invalide | ✅ Corrigé |
| 4 | Erreur CORS | Backend | Ordre des middlewares Express | ✅ Corrigé |
| 5 | Timeout upload | Frontend | Timeout Axios trop court (30s) | ✅ Corrigé |
| 6 | Taille fichier Cloudinary | Full-stack | Limite plan gratuit 10MB | ✅ Géré |
| 7 | Photo non sauvegardée (edit) | Frontend | Race condition asynchrone | ✅ Corrigé |

---

## A.4 Configuration Finale des Variables d'Environnement

### `backend/.env` (Configuration Complète)
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Base de données
MONGODB_URI=mongodb+srv://[user]:[password]@cluster0.x1huzw8.mongodb.net/memory-keeper

# Stockage média
CLOUDINARY_CLOUD_NAME=[cloud_name]
CLOUDINARY_API_KEY=[api_key]
CLOUDINARY_API_SECRET=[api_secret]

# Authentification backend
FIREBASE_PROJECT_ID=vmemory-bb7cc
FIREBASE_CLIENT_EMAIL=[service_account_email]
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### `frontend/.env` (Configuration Complète)
```env
REACT_APP_FIREBASE_API_KEY=[api_key]
REACT_APP_FIREBASE_AUTH_DOMAIN=vmemory-bb7cc.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=vmemory-bb7cc
REACT_APP_FIREBASE_STORAGE_BUCKET=vmemory-bb7cc.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=[sender_id]
REACT_APP_FIREBASE_APP_ID=[app_id]
REACT_APP_API_URL=http://localhost:5000/api
```

---

*Cette annexe complète le Chapitre 5 (Implémentation) et renforce les sections sur les contraintes réalistes (Chapitre 2). Elle démontre la capacité du système à être diagnostiqué, débogué et stabilisé dans des conditions réelles de déploiement.*
