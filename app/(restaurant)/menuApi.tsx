import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { menuApi } from '@/services/api/menuApi';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// --- INTERFACES AJUSTADAS A TU ESTRUCTURA ---
interface Option {
    id: string;
    name: string;
    description?: string;
    extraPrice: number;
}

interface Section {
    id: string;
    name: string;
    description?: string;
    options: Option[];
}

interface Plate {
    id: string;
    name: string;
    description: string;

    imageUrl?: string;
    imageURL?: string;
    basePrice: number;
    active: boolean;
    baseIngredients: string[];
    optionalIngredients?: string[];
    section?: Section[];
}

interface MenuData {
    id: string;
    name: string;
    plates: Plate[];
    restaurantId: string;
}

export default function RestaurantMenu() {
    const { user } = useAuth();
    const { colors } = useTheme();
    const router = useRouter();
    const styles = createStyles(colors);

    const [menuId, setMenuId] = useState<string | null>(null);
    const [plates, setPlates] = useState<Plate[]>([]);
    const [selectedPlate, setSelectedPlate] = useState<Plate | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadMenu(); }, [user]);

    const loadMenu = async () => {
        try {
            if (!user?.uid) return;
            setLoading(true);

            const response: any = await menuApi.getActiveMenu(user.uid);

            if (response.success && response.data) {
                setMenuId(response.data.id);

                // Obtenemos platos intentando plural o singular
                const platesList = response.data.plates || response.data.plate || [];
                setPlates(platesList);

                if (platesList.length > 0) {
                    setSelectedPlate(platesList[0]);
                }
            }
        } catch (error) {
            console.error('Error en loadMenu:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        if (!selectedPlate || !menuId) return;
        Alert.alert("Delete Item", `Are you sure you want to delete "${selectedPlate.name}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                    const result = await menuApi.deletePlateFromMenu(menuId, selectedPlate.id);
                    if (result.success) {
                        const updated = plates.filter(p => p.id !== selectedPlate.id);
                        setPlates(updated);
                        setSelectedPlate(updated.length > 0 ? updated[0] : null);
                    }
                }}
        ]);
    };

    // Función para obtener la URL de imagen sin importar el nombre del campo
    const getImgSource = (plate: Plate) => {
        const uri = plate.imageURL || plate.imageUrl;
        return uri ? { uri } : null;
    };

    if (loading) return (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="black" /></View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainWrapper}>

                {/* SIDEBAR IZQUIERDO */}
                <View style={styles.sidebar}>
                    <View style={styles.sidebarHeader}>
                        <View style={styles.logoCircle}><MaterialIcons name="restaurant-menu" size={28} color="black" /></View>
                        <Text style={styles.menuTitle}>Menu</Text>
                    </View>
                    <FlatList
                        data={[...plates, { id: 'add-placeholder', isAdd: true }]}
                        keyExtractor={(item) => item.id}
                        numColumns={2}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }: any) => {
                            if (item.isAdd) return (
                                <TouchableOpacity
                                    style={styles.addCard}
                                    onPress={() => router.push({ pathname: "/(restaurant)/editing_item", params: { menuId } })}
                                >
                                    <Ionicons name="add" size={40} color="#ccc" />
                                </TouchableOpacity>
                            );

                            const imgSource = getImgSource(item);

                            return (
                                <TouchableOpacity
                                    style={[styles.plateCard, selectedPlate?.id === item.id && styles.selectedCard]}
                                    onPress={() => setSelectedPlate(item)}
                                >
                                    {imgSource ? (
                                        <Image source={imgSource} style={styles.cardImage} />
                                    ) : (
                                        <View style={[styles.cardImage, styles.noImagePlaceholder]}>
                                            <Ionicons name="fast-food-outline" size={30} color="#ccc" />
                                        </View>
                                    )}
                                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>

                {/* DETALLE DERECHO */}
                <View style={styles.detailSection}>
                    {selectedPlate ? (
                        <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>

                            <View style={styles.topDetailRow}>
                                <View style={{ flex: 1, paddingRight: 20 }}>
                                    <Text style={styles.detailName}>{selectedPlate.name}</Text>
                                    <Text style={styles.detailDescription}>{selectedPlate.description}</Text>
                                    <Text style={styles.detailPrice}>Base Price: ₡{selectedPlate.basePrice.toLocaleString()}</Text>
                                </View>
                                {getImgSource(selectedPlate) && (
                                    <Image source={getImgSource(selectedPlate)!} style={styles.detailImage} />
                                )}
                            </View>

                            {/* SECCIONES DINÁMICAS (Flavor, etc) */}
                            {selectedPlate.section?.map((sec, sIdx) => (
                                <View key={sec.id || sIdx} style={{ marginBottom: 25 }}>
                                    <Text style={styles.sectionTitle}>{sec.name}</Text>
                                    {sec.options?.map((opt, oIdx) => (
                                        <View key={opt.id || oIdx} style={{ marginBottom: 8, paddingLeft: 10 }}>
                                            <Text style={styles.listBullet}>
                                                • {opt.name} {opt.extraPrice > 0 ? `(+₡${opt.extraPrice.toLocaleString()})` : ''}
                                            </Text>
                                            {opt.description && <Text style={styles.subText}>{opt.description}</Text>}
                                        </View>
                                    ))}
                                </View>
                            ))}

                            {/* INGREDIENTES BASE */}
                            <Text style={styles.sectionTitle}>Base Ingredients</Text>
                            <View style={styles.tagWrapper}>
                                {selectedPlate.baseIngredients?.map((ing, idx) => (
                                    <View key={idx} style={styles.tagChip}>
                                        <Text style={styles.tagText}>{ing}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* BOTONES */}
                            <View style={styles.footerActions}>
                                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                                    <Ionicons name="trash-outline" size={20} color="white" />
                                    <Text style={styles.btnText}>Delete</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.editBtn}
                                    onPress={() => router.push({ pathname: "/(restaurant)/editing_item", params: { menuId, plateId: selectedPlate.id } })}
                                >
                                    <Text style={styles.btnText}>Edit Item</Text>
                                </TouchableOpacity>
                            </View>

                        </ScrollView>
                    ) : (
                        <View style={styles.emptyContainer}><Text style={styles.emptyText}>Select an item to see details</Text></View>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mainWrapper: { flex: 1, flexDirection: 'row' },
    sidebar: { width: '38%', padding: 25, backgroundColor: 'white' },
    sidebarHeader: { marginBottom: 30 },
    logoCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    menuTitle: { fontSize: 36, fontWeight: '800', color: 'black' },
    plateCard: { flex: 0.5, backgroundColor: '#f9f9f9', margin: 6, borderRadius: 16, padding: 10, minHeight: 180 },
    selectedCard: { borderWidth: 2, borderColor: 'black' },
    addCard: { flex: 0.5, backgroundColor: '#f9f9f9', margin: 6, borderRadius: 16, height: 180, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
    cardImage: { width: '100%', height: 90, borderRadius: 10, marginBottom: 8 },
    noImagePlaceholder: { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
    cardName: { fontSize: 15, fontWeight: 'bold' },
    cardDesc: { fontSize: 11, color: '#888', marginTop: 4 },
    detailSection: { flex: 1, backgroundColor: '#f2f3f5' },
    detailScroll: { padding: 45 },
    topDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    detailName: { fontSize: 42, fontWeight: '900', color: 'black', marginBottom: 10 },
    detailDescription: { fontSize: 18, color: '#444', lineHeight: 26, marginBottom: 10 },
    detailPrice: { fontSize: 20, fontWeight: '700', color: '#666' },
    detailImage: { width: 220, height: 220, borderRadius: 25 },
    sectionTitle: { fontSize: 22, fontWeight: '700', marginTop: 35, marginBottom: 15 },
    listBullet: { fontSize: 18, color: '#333', fontWeight: '500' },
    subText: { fontSize: 14, color: '#666', marginLeft: 20, marginBottom: 5 },
    tagWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tagChip: { backgroundColor: 'black', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 25 },
    tagText: { color: 'white', fontWeight: '600', fontSize: 14 },
    footerActions: { flexDirection: 'row', marginTop: 60, gap: 15 },
    deleteBtn: { flex: 1, height: 55, backgroundColor: '#d00', borderRadius: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    editBtn: { flex: 1, height: 55, backgroundColor: 'black', borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
    btnText: { color: 'white', fontSize: 17, fontWeight: 'bold' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#999', fontSize: 18, fontStyle: 'italic' }
});