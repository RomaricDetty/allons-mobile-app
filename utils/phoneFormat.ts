/**
 * Formate un numéro au format international (+225…).
 */
export const toInternationalPhone = (countryCode: string, number: string): string => {
    const digits = (number || '').replace(/\D/g, '');
    if (!digits) return '';

    const cc = (countryCode || '+225').startsWith('+')
        ? countryCode || '+225'
        : `+${countryCode || '225'}`;
    const ccDigits = cc.replace(/\D/g, '');

    if (digits.startsWith(ccDigits)) {
        return `+${digits}`;
    }

    return `${cc}${digits}`;
};
