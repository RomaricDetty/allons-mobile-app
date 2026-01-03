# Guide pour lancer l'application depuis Xcode

## Problème : "No script URL provided"

Cette erreur se produit lorsque vous lancez l'application depuis Xcode sans que le Metro bundler soit en cours d'exécution.

## Solutions

### Solution 1 : Démarrer Metro bundler avant de lancer depuis Xcode (Recommandé)

1. **Ouvrir un terminal** dans le répertoire du projet
2. **Démarrer Metro bundler** avec une des commandes suivantes :
   ```bash
   npm start
   ```
   ou
   ```bash
   ./scripts/start-metro.sh
   ```
3. **Garder le terminal ouvert** pendant que vous utilisez l'application
4. **Lancer l'application depuis Xcode** (⌘R)

Metro bundler doit être accessible sur `http://localhost:8081`

### Solution 2 : Générer un bundle de production

Si vous voulez tester un build de production sans Metro :

1. **Générer le bundle** :
   ```bash
   npx expo export --platform ios
   ```

2. **Copier le bundle dans le projet iOS** :
   ```bash
   cp -r .expo/ios/main.jsbundle ios/AllOn/
   ```

3. **Ajouter le fichier au projet Xcode** :
   - Ouvrir Xcode
   - Clic droit sur le dossier `AllOn` dans le navigateur de projet
   - Sélectionner "Add Files to AllOn..."
   - Sélectionner `main.jsbundle`
   - Cocher "Copy items if needed" et "Create groups"
   - Cliquer sur "Add"

4. **Lancer l'application depuis Xcode**

### Solution 3 : Utiliser Expo CLI pour lancer l'app

Au lieu de lancer depuis Xcode, utilisez :

```bash
npm run ios
```

Cette commande démarre automatiquement Metro bundler et lance l'application sur le simulateur.

## Vérification

Pour vérifier que Metro bundler est en cours d'exécution :

1. Ouvrir un navigateur
2. Aller sur `http://localhost:8081/status`
3. Vous devriez voir `{"status":"ok"}`

## Notes importantes

- En mode **DEBUG**, l'application essaie de se connecter à Metro bundler
- En mode **RELEASE**, l'application charge le bundle depuis le fichier `main.jsbundle` inclus dans l'app
- Le code a été amélioré pour mieux gérer l'absence de Metro bundler avec un fallback vers un bundle local si disponible

