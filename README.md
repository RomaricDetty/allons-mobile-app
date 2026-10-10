# AllOn — Application mobile

Application client **AllOn** (Expo / React Native) pour la réservation de trajets interurbains en Côte d’Ivoire : recherche, billetterie, paiement, suivi de trajet, location de bus et espace profil.

## Stack

- **Expo SDK 54** + **expo-router** (file-based routing)
- **React Native 0.81** / React 19
- **Axios** → API `https://api.allon-apps.com`
- **SecureStore** + AsyncStorage (tokens / prefs)
- **Mapbox** / cartes, **Socket.IO** (suivi temps réel)
- **expo-image**, Reanimated, etc.

## Prérequis

- Node.js **22** (recommandé via `nvm`)
- Compte Expo / Xcode (iOS) / Android Studio selon la cible

## Démarrage

```bash
nvm use 22
npm install
npx expo start
```

Scripts utiles :

| Commande | Description |
| --- | --- |
| `npm start` | Metro / Expo |
| `npm run ios` | Build / run iOS |
| `npm run android` | Build / run Android |
| `npm run lint` | Lint Expo |

## Structure (aperçu)

```
app/                 # Écrans (expo-router) : tabs, trip, payment, profile, auth
api/                 # Clients HTTP (auth, trips, bookings, …)
components/          # UI réutilisable (auth, tickets, skeletons, …)
contexts/            # AuthContext (session globale)
hooks/               # Profil, paiement, idle session, …
utils/
  authSession.ts      # Refresh access token + retry 401
  sessionActivity.ts # Idle 30 min (aligné backend)
  storage.ts         # SecureStore / session persistée
assets/              # Images, splash, onboarding
```

## Authentification & session

Le backend invalide l’**access token** après **30 minutes d’inactivité**. L’app gère cela via le **refresh token** (pas de déconnexion sur simple idle).

| Comportement | Détail |
| --- | --- |
| TTL access local | Plafonné à **30 min** (`expires_at`) |
| Refresh proactif | Après ~**25 min** d’idle, ou si `expires_at` proche |
| Retour au premier plan | Renouvellement de l’access si besoin |
| 401 API | Refresh forcé + **1 retry** avant abandon |
| Déconnexion | Uniquement si le **refresh token** est absent ou rejeté (401/403) |

Fichiers clés :

- `utils/authSession.ts` — `ensureValidAccessToken`, `withValidAccessToken`
- `utils/sessionActivity.ts` — suivi d’activité / seuils idle
- `contexts/AuthContext.tsx` — user global, `ensureSession`, `signOut`
- `hooks/useSessionIdleTimeout.ts` — bump activité + refresh au resume (pas de `signOut` idle)

Login / register envoient `X-App-Audience: frontoffice_mobile`. Refresh : `POST /auth/refresh-token` avec `{ refreshToken }`.

## Configuration API

```ts
// api/config.ts
export const baseUrl = 'https://api.allon-apps.com';
```

## Fonctionnalités principales

- Onboarding + auth (connexion / inscription / mot de passe oublié)
- Accueil : salutation, recherche, top itinéraires, voyages de la semaine, CTA location bus
- Parcours réservation : recherche → sièges → passagers → paiement → ticket / QR
- Profil : infos, billets (filtres), demandes de location de bus
- Suivi de trajet / cartes, notifications, reçus PDF

## Performances (notes)

- Images home compressées + `expo-image` (cache mémoire/disque)
- Listes en `FlatList` (tickets, locations, trajets retour)
- Skeleton d’accueil aligné sur le layout réel
- Splash allégé (assets critiques + délai court)
- Cache / TTL silencieux sur refetch focus (profil, home)

## Conventions

- Réponses et UI en **français**
- Commenter les nouvelles fonctions en **JSDoc**
- Respecter le style existant (Clean Code : KISS, DRY, YAGNI)
- Ne pas committer de secrets (`.env`, credentials)

## Ressources

- [Documentation Expo](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
