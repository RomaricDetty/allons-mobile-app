/**
 * Normalise un identifiant de connexion (email / username) :
 * trim, minuscules, suppression des accents (NFD).
 */
export function normalizeLoginIdentifier(value: string): string {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}
