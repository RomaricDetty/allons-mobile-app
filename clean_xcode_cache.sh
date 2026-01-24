#!/bin/bash
# Script de nettoyage complet pour résoudre les problèmes de cache Xcode

echo "🧹 Nettoyage complet du projet iOS..."

# 1. Nettoyer le dossier build local
echo "→ Nettoyage du build local..."
rm -rf ios/build
rm -rf ios/DerivedData

# 2. Nettoyer le cache Xcode global (avec sudo si nécessaire)
echo "→ Nettoyage du cache Xcode global..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# 3. Nettoyer le Module Cache
echo "→ Nettoyage du Module Cache..."
rm -rf ~/Library/Developer/Xcode/DerivedData/ModuleCache.noindex
rm -rf ~/Library/Developer/Xcode/DerivedData/ModuleCache

# 4. Nettoyer les Archives
echo "→ Nettoyage des Archives..."
rm -rf ~/Library/Developer/Xcode/Archives

# 5. Nettoyer le cache CocoaPods
echo "→ Nettoyage du cache CocoaPods..."
rm -rf ~/Library/Caches/CocoaPods

# 6. Rebuild des Pods
echo "→ Réinstallation des Pods..."
cd ios
rm -rf Pods
rm -f Podfile.lock
pod cache clean --all 2>/dev/null || true
pod deintegrate 2>/dev/null || true
pod install
cd ..

echo "✅ Nettoyage terminé !"
echo ""
echo "Maintenant, lancez le build avec :"
echo "  npm run ios"
echo "ou ouvrez Xcode et faites Product > Clean Build Folder (⇧⌘K)"
