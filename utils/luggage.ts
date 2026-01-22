import { LuggageType } from '@/types';

/**
 * Convertit le type de bagage en libellé français
 * @param type - Le type de bagage
 * @returns Le libellé français
 */
export const getLuggageTypeLabel = (type: LuggageType | string): string => {
    const TYPE_MAPPING: Record<LuggageType, string> = {
        [LuggageType.CABIN]: 'Bagage cabine',
        [LuggageType.CHECKED]: 'Bagage soute',
        [LuggageType.OVERSIZED]: 'Bagage surdimensionné',
        [LuggageType.FRAGILE]: 'Bagage fragile',
        [LuggageType.SPORTS_EQUIPMENT]: 'Équipement sportif',
    };
    
    // Si c'est une string, on essaie de la convertir en enum
    if (typeof type === 'string') {
        const upperType = type.toUpperCase() as LuggageType;
        return TYPE_MAPPING[upperType] || type;
    }
    
    return TYPE_MAPPING[type] || type;
};
