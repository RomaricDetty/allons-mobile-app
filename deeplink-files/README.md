# Fichiers deeplink — customer.allon-apps.com

Déploie **le contenu** de ce dossier à la **racine** du site `https://customer.allon-apps.com`.

## Arborescence à publier

```
/
├── .well-known/
│   ├── apple-app-site-association   ← iOS Universal Links (SANS extension .json)
│   └── assetlinks.json              ← Android App Links
└── payment/
    ├── success/
    │   └── index.html               → https://customer.allon-apps.com/payment/success
    └── error/
        └── index.html               → https://customer.allon-apps.com/payment/error
```

## Config serveur

### apple-app-site-association
- URL : `https://customer.allon-apps.com/.well-known/apple-app-site-association`
- **Content-Type** : `application/json`
- HTTPS obligatoire, **pas de redirect** (301/302), pas d’auth
- Ne pas renommer en `.json`

### assetlinks.json
- URL : `https://customer.allon-apps.com/.well-known/assetlinks.json`
- Content-Type : `application/json`
- Public, HTTPS, pas de redirect

Exemple Nginx :

```nginx
location /.well-known/apple-app-site-association {
  default_type application/json;
}

location /.well-known/assetlinks.json {
  default_type application/json;
}
```

## Valeurs app

| Plateforme | Identifiant |
|---|---|
| iOS Team ID | `LUL3596K2Y` |
| Bundle / package | `com.allon.app` |
| Domaine | `customer.allon-apps.com` |
| Paths | `/payment/*` |

## SHA-256 Android (`assetlinks.json`)

Le fichier contient actuellement le fingerprint du **keystore debug** local (`android/app/debug.keystore`) — utile pour les builds debug.

Pour la **production / Play Store**, ajoute le SHA-256 du certificat de signature (Play Console → Intégrité de l’app → certificat de signature de l’app) dans le tableau `sha256_cert_fingerprints` :

```json
"sha256_cert_fingerprints": [
  "FA:C6:…:9C",
  "XX:XX:…:XX"
]
```

## Vérification

```bash
curl -sI https://customer.allon-apps.com/.well-known/apple-app-site-association
curl -s https://customer.allon-apps.com/.well-known/apple-app-site-association

curl -sI https://customer.allon-apps.com/.well-known/assetlinks.json
curl -s https://customer.allon-apps.com/.well-known/assetlinks.json

# Android (outil Google)
# https://developers.google.com/digital-asset-links/tools/generator
```

## PSP / checkout

Configurer les URLs de retour paiement côté backend / PSP :

- Succès : `https://customer.allon-apps.com/payment/success`
- Échec : `https://customer.allon-apps.com/payment/error`

Les pages HTML tentent aussi d’ouvrir `allonappmobile://payment/...` en secours.
