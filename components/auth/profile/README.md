# Composants du Profil Utilisateur

Cette architecture modulaire permet une meilleure maintenabilité et réutilisabilité du code.

## Structure

```
components/auth/profile/
├── README.md                   # Ce fichier
├── index.ts                    # Export centralisé des composants
├── ProfileHeader.tsx           # En-tête avec titre et bouton déconnexion
├── TabNavigation.tsx           # Navigation par onglets avec indicateur animé
├── PersonalInfoCard.tsx        # Carte d'informations personnelles
├── UserStatsSection.tsx        # Statistiques utilisateur (voyages, type, coins)
├── ThemeAndShareCards.tsx      # Cartes de thème et partage
├── BookingCard.tsx             # Carte individuelle de réservation
├── BookingFilters.tsx          # Filtres de recherche et statut
└── Modals.tsx                  # Modals (statut, déconnexion)
```

## Hooks Personnalisés

### `useProfileData` (`hooks/useProfileData.ts`)
Gère toutes les opérations de données du profil :
- Chargement des informations utilisateur
- Récupération des réservations
- Pull-to-refresh
- Gestion des états de chargement

## Constantes

### `constants/profile.ts`
- `STATUS_OPTIONS` : Options de filtre des statuts de réservation
- `CIVILITY_MAP` : Mapping des civilités pour l'affichage

## Avantages de cette Architecture

1. **Maintenabilité** : Code organisé en petits composants ciblés
2. **Réutilisabilité** : Composants facilement réutilisables
3. **Testabilité** : Chaque composant peut être testé indépendamment
4. **Performance** : Optimisation via mémorisation et hooks
5. **Lisibilité** : Code clair et bien structuré (DRY, KISS, YAGNI, SOLID)

## Réduction de Code

- **Avant** : 1764 lignes dans `ProfileScreen.tsx`
- **Après** : 344 lignes dans `ProfileScreen.tsx`
- **Réduction** : ~80%

## Utilisation

```typescript
// ProfileScreen.tsx utilise tous les composants
import {
    BookingCard,
    BookingFilters,
    LogoutModal,
    PersonalInfoCard,
    ProfileHeader,
    StatusModal,
    TabNavigation,
    ThemeAndShareCards,
    UserStatsSection,
} from './profile';
```

## Modification Future

Pour modifier un élément spécifique du profil :
1. Identifier le composant concerné dans la structure ci-dessus
2. Modifier uniquement ce composant
3. Les changements sont automatiquement reflétés dans l'écran principal

## Principes Respectés

- **DRY** (Don't Repeat Yourself) : Pas de duplication de code
- **KISS** (Keep It Simple, Stupid) : Code simple et compréhensible
- **YAGNI** (You Aren't Gonna Need It) : Pas de sur-ingénierie
- **SOLID** : Séparation des responsabilités, composants modulaires
