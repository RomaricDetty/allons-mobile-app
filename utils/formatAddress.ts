/**
 * Formate une adresse utilisateur pour l'affichage.
 * Gère string, objet partiel, country string ou { id, name }, etc.
 * Évite tout affichage de "[object Object]".
 */

export type AddressCountry =
    | string
    | {
          id?: string | number;
          name?: string;
          label?: string;
          code?: string;
          [key: string]: unknown;
      }
    | null
    | undefined;

export type UserAddress =
    | string
    | {
          street?: string | null;
          city?: string | null;
          zipCode?: string | null;
          postalCode?: string | null;
          country?: AddressCountry;
          [key: string]: unknown;
      }
    | null
    | undefined;

/**
 * Convertit une valeur quelconque en label affichable (jamais "[object Object]").
 */
const toDisplayPart = (value: unknown): string => {
    if (value == null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value).trim();
    }
    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const candidates = [record.name, record.label, record.title, record.code, record.city];
        for (const candidate of candidates) {
            if (typeof candidate === 'string' && candidate.trim()) {
                return candidate.trim();
            }
        }
        return '';
    }
    return '';
};

/**
 * Retourne une adresse lisible, ou chaîne vide si rien d'affichable.
 */
export const formatUserAddress = (address: UserAddress): string => {
    if (address == null || address === '') return '';

    if (typeof address === 'string') {
        const trimmed = address.trim();
        if (!trimmed || trimmed === '[object Object]') return '';
        return trimmed;
    }

    if (typeof address !== 'object') {
        return toDisplayPart(address);
    }

    const street = toDisplayPart(address.street);
    const city = toDisplayPart(address.city);
    const zip = toDisplayPart(address.zipCode ?? address.postalCode);
    const country = toDisplayPart(address.country);

    const parts = [street, city, zip, country].filter(Boolean);
    return parts.join(', ');
};

/**
 * Indique si une adresse contient au moins un champ affichable.
 */
export const hasDisplayableAddress = (address: UserAddress): boolean => {
    return formatUserAddress(address).length > 0;
};
