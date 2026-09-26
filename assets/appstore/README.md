# Captures App Store — AllOn

## iPhone 6,5″
Dossier à uploader : `iphone/1284x2778/` (alt. `1242x2688/`)

| Type | Fichiers | Usage App Store Connect |
|------|----------|-------------------------|
| **3 aperçus** | `preview-01-onboarding-…` → `preview-03-…` | Aperçus d’app |
| **8 captures** | `screen-01-accueil-…` → `screen-08-connexion-…` | Captures d’écran |

Ordre recommandé des captures :
1. Accueil  
2. Recherche trajet  
3. Résultats  
4. Résumé voyage  
5. Paiement / continuer  
6. Sièges  
7. Passagers  
8. Connexion  

## iPad 12,9″ / 13″
Dossier à uploader : `ipad/2064x2752/` (alt. `2048x2732/`)

Mêmes 3 aperçus + 8 captures (mise en page iPad : bandeau AllOn + téléphone centré).

## Régénération
```bash
python3 scripts/generate_appstore_onboarding.py
python3 scripts/generate_appstore_screenshots.py
```

> Les sources simulateur sont en ~470×1024 ; les exports iPhone sont upscalés. Pour une netteté max, refaire les captures sur un simulateur haute résolution (ex. iPhone 16 Pro Max @3x) puis relancer le script.
