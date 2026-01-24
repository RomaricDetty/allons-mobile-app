import { useState, useCallback } from 'react';

/**
 * Hook pour gérer le bottom sheet de sélection
 */
export const useBottomSheetSelection = () => {
    const [showSelectionBottomSheet, setShowSelectionBottomSheet] = useState(false);
    const [selectionType, setSelectionType] = useState<'passengerType' | 'relation' | null>(null);
    const [selectionTitle, setSelectionTitle] = useState('');
    const [selectionOptions, setSelectionOptions] = useState<Array<{ value: string, label: string }>>([]);
    const [currentSelectionValue, setCurrentSelectionValue] = useState<string>('');
    const [onSelectionCallback, setOnSelectionCallback] = useState<((value: string) => void) | null>(null);

    /**
     * Ouvre le bottom sheet de sélection
     */
    const openSelectionBottomSheet = useCallback((
        type: 'passengerType' | 'relation',
        title: string,
        options: Array<{ value: string, label: string }>,
        currentValue: string,
        onSelect: (value: string) => void
    ) => {
        setSelectionType(type);
        setSelectionTitle(title);
        setSelectionOptions(options);
        setCurrentSelectionValue(currentValue);
        setOnSelectionCallback(() => onSelect);
        setShowSelectionBottomSheet(true);
    }, []);

    /**
     * Ferme le bottom sheet de sélection
     */
    const closeSelectionBottomSheet = useCallback(() => {
        setShowSelectionBottomSheet(false);
        setSelectionType(null);
        setSelectionTitle('');
        setSelectionOptions([]);
        setCurrentSelectionValue('');
        setOnSelectionCallback(null);
    }, []);

    /**
     * Gère la sélection d'une option
     */
    const handleSelection = useCallback((value: string) => {
        if (onSelectionCallback) {
            onSelectionCallback(value);
        }
        closeSelectionBottomSheet();
    }, [onSelectionCallback, closeSelectionBottomSheet]);

    return {
        showSelectionBottomSheet,
        selectionType,
        selectionTitle,
        selectionOptions,
        currentSelectionValue,
        openSelectionBottomSheet,
        closeSelectionBottomSheet,
        handleSelection
    };
};
