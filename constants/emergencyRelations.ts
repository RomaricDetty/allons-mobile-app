/**
 * Relations contact d'urgence — valeur API (slug) ↔ libellé exact affiché.
 */
export const EMERGENCY_RELATION_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'parent', label: 'Parent' },
    { value: 'conjoint', label: 'Conjoint(e)' },
    { value: 'enfant', label: 'Enfant' },
    { value: 'frere-soeur', label: 'Frère/Sœur' },
    { value: 'ami', label: 'Ami(e)' },
    { value: 'autre', label: 'Autre' },
];

const LABEL_BY_VALUE = Object.fromEntries(
    EMERGENCY_RELATION_OPTIONS.map((o) => [o.value, o.label])
);

/** Valeurs legacy éventuelles → slug canonique */
const LEGACY_ALIASES: Record<string, string> = {
    conjoint: 'conjoint',
    'conjoint(e)': 'conjoint',
    'frère/sœur': 'frere-soeur',
    'frere/soeur': 'frere-soeur',
    'frère et sœur': 'frere-soeur',
    ami: 'ami',
    'ami(e)': 'ami',
    autre: 'autre',
    parent: 'parent',
    enfant: 'enfant',
};

export function isKnownEmergencyRelation(value?: string | null): boolean {
    if (!value?.trim()) return false;
    const key = value.trim().toLowerCase();
    return Boolean(LABEL_BY_VALUE[key] || LEGACY_ALIASES[key]);
}

/**
 * Affiche le libellé exact pour un slug connu ;
 * sinon renvoie le texte libre tel quel (cas « Autre »).
 */
export function formatEmergencyRelationLabel(value?: string | null): string {
    if (!value?.trim()) return 'Non renseigné';
    const raw = value.trim();
    const key = raw.toLowerCase();
    const slug = LEGACY_ALIASES[key] || key;
    if (LABEL_BY_VALUE[slug]) return LABEL_BY_VALUE[slug];
    // Texte libre saisi pour « Autre »
    return raw;
}

export function normalizeEmergencyRelationForStorage(
    selectedValue: string,
    customText?: string
): string {
    if (selectedValue === 'autre') {
        const custom = (customText || '').trim();
        return custom || 'Autre';
    }
    return selectedValue;
}

/** Valeur à afficher dans le Select (slug connu ou « autre » pour texte libre). */
export function getEmergencyRelationPickerValue(stored?: string | null): string {
    if (!stored?.trim()) return '';
    const key = stored.trim().toLowerCase();
    const slug = LEGACY_ALIASES[key] || key;
    if (LABEL_BY_VALUE[slug] && slug !== 'autre') return slug;
    return 'autre';
}

/** Texte libre si la relation stockée n’est pas un slug prédéfini. */
export function getEmergencyRelationCustomText(stored?: string | null): string {
    if (!stored?.trim()) return '';
    const key = stored.trim().toLowerCase();
    const slug = LEGACY_ALIASES[key] || key;
    if (LABEL_BY_VALUE[slug]) return '';
    return stored.trim();
}
