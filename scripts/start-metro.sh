#!/bin/bash

# Script pour démarrer Metro bundler avant de lancer l'app depuis Xcode
# Usage: ./scripts/start-metro.sh

echo "🚀 Démarrage de Metro bundler..."
echo ""

# Vérifier si Metro est déjà en cours d'exécution
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Metro bundler est déjà en cours d'exécution sur le port 8081"
    echo ""
    echo "Vous pouvez maintenant lancer l'app depuis Xcode"
else
    echo "📦 Démarrage de Metro bundler..."
    echo ""
    echo "⚠️  Gardez ce terminal ouvert pendant que vous utilisez l'app"
    echo "💡 Appuyez sur Ctrl+C pour arrêter Metro bundler"
    echo ""
    
    # Démarrer Metro bundler
    npm start
fi

