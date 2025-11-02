// @ts-nocheck
import React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_TRANSLATE_Y = SCREEN_HEIGHT * 0.20;
const MIN_TRANSLATE_Y = 0;

interface BottomSheetProps<T> {
    visible: boolean;
    onClose: () => void;
    title: string;
    data: T[];
    loading?: boolean;
    renderItem: (item: T, onSelect: () => void) => React.ReactNode;
    keyExtractor: (item: T) => string;
    emptyText?: string;
}

/**
 * Composant BottomSheet réutilisable pour afficher une liste de données
 * avec animation et gestes de glissement
 * 
 * @template T - Type des éléments de la liste
 */
export function BottomSheet<T>({
    visible,
    onClose,
    title,
    data,
    loading = false,
    renderItem,
    keyExtractor,
    emptyText = "Aucun élément disponible"
}: BottomSheetProps<T>) {
    // Initialiser translateY à SCREEN_HEIGHT pour que le bottom sheet commence hors écran
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const context = useSharedValue({ y: 0 });
    const opacity = useSharedValue(0);

    /**
     * Ferme le BottomSheet avec animation
     */
    const closeBottomSheet = () => {
        translateY.value = withSpring(SCREEN_HEIGHT, {
            damping: 15,        
            stiffness: 120,     
            mass: 0.3           
        });
        opacity.value = withTiming(0, { duration: 200 }); 
        setTimeout(() => {
            runOnJS(onClose)();
        }, 250); 
    };

    /**
     * Gère les gestes de glissement avec la nouvelle API
     */
    const panGesture = Gesture.Pan()
        .onStart(() => {
            context.y = translateY.value;
        })
        
        .onUpdate(event => {
            translateY.value = Math.max(MIN_TRANSLATE_Y, Math.min(MAX_TRANSLATE_Y + event.translationY, SCREEN_HEIGHT));
            // Empêcher de glisser au-dessus du haut
            if (translateY.value < MAX_TRANSLATE_Y) {
                translateY.value = MAX_TRANSLATE_Y;
            }
        })

        .onEnd((event) => {
            if (translateY.value > SCREEN_HEIGHT * 0.7) {
                translateY.value = withSpring(SCREEN_HEIGHT, { 
                    damping: 15,      
                    stiffness: 120    
                });
                opacity.value = withTiming(0, { duration: 200 });
                runOnJS(closeBottomSheet)();
            } else {
                translateY.value = withSpring(MAX_TRANSLATE_Y, { 
                    damping: 15,      
                    stiffness: 120    
                });
                opacity.value = withTiming(1, { duration: 200 });
            }
        });

    React.useEffect(() => {
        if (visible) {
            opacity.value = withTiming(1, { duration: 200 }); 
            translateY.value = withSpring(MAX_TRANSLATE_Y, {
                damping: 15,              
                stiffness: 120,           
                mass: 0.3                  
            });
        } else {
            translateY.value = withSpring(SCREEN_HEIGHT, {
                damping: 15,              
                stiffness: 120            
            });
            opacity.value = withTiming(0, { duration: 200 }); 
        }
    }, [visible]);

    /**
     * Style animé pour le BottomSheet
     */
    const bottomSheetStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    /**
     * Style animé pour l'overlay
     */
    const overlayStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
        };
    });

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={closeBottomSheet}
        >
            <GestureHandlerRootView style={styles.bottomSheetRootView}>
                <TouchableOpacity
                    activeOpacity={1}
                    style={styles.bottomSheetOverlay}
                    onPress={closeBottomSheet}
                >
                    <Animated.View
                        style={[styles.bottomSheetOverlayAnimated, overlayStyle]}
                    />
                </TouchableOpacity>

                <GestureDetector gesture={panGesture}>
                    <Animated.View style={[styles.bottomSheetContainer, bottomSheetStyle]}>
                        {/* Handle bar */}
                        <View style={styles.bottomSheetHandle} />

                        {/* Header */}
                        <View style={styles.bottomSheetHeader}>
                            <Text style={styles.bottomSheetTitle}>{title}</Text>
                            <Pressable onPress={closeBottomSheet} style={styles.bottomSheetCloseButton}>
                                <Icon name="close" size={24} color="#000" />
                            </Pressable>
                        </View>

                        {/* Content */}
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#1776ba" />
                            </View>
                        ) : data.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>{emptyText}</Text>
                            </View>
                        ) : (
                            <ScrollView
                                style={styles.bottomSheetList}
                                contentContainerStyle={styles.bottomSheetListContent}
                                showsVerticalScrollIndicator={true}
                                nestedScrollEnabled={true}
                            >
                                {data.map((item) => (
                                    <View key={keyExtractor(item)}>
                                        {renderItem(item, closeBottomSheet)}
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </Animated.View>
                </GestureDetector>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    bottomSheetRootView: {
        flex: 1,
    },
    bottomSheetOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    bottomSheetOverlayAnimated: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    bottomSheetContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: SCREEN_HEIGHT,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    bottomSheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#CCCCCC',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 15,
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F3F7',
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontFamily: 'Ubuntu_Bold',
        color: '#000',
    },
    bottomSheetCloseButton: {
        padding: 5,
    },
    bottomSheetList: {
        flex: 1,
    },
    bottomSheetListContent: {
        paddingBottom: 20,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#666666',
        fontFamily: 'Ubuntu_Regular',
    },
});

