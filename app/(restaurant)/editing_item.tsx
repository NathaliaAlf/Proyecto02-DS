import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { menuApi } from '@/services/api/menuApi';
import { normalizeIngredients } from "@/types/menu";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// --- INTERFACES ---
interface Option {
    id: string;
    name: string;
    extraPrice: number;
    description?: string;
}

interface Section {
    id: string;
    name: string;
    description?: string;
    options: Option[];
}

export interface Plate {
    id: string;
    name: string;
    description: string;
    imageURL?: string;
    imageUrl?: string;
    basePrice: number;
    active: boolean;
    baseIngredients: string[];
    optionalIngredients: string[];
    section: Section[];
}

export default function EditingItemScreen() {
    const { user } = useAuth();
    const { colors } = useTheme();
    const router = useRouter();
    const params = useLocalSearchParams<{ menuId: string; plateId: string }>();
    const styles = createStyles(colors);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [platesList, setPlatesList] = useState<Plate[]>([]);
    const [editPlate, setEditPlate] = useState<Plate | null>(null);
    const [menuDocId, setMenuDocId] = useState<string | null>(null);
    const [newIng, setNewIng] = useState("");

    useEffect(() => {
        loadInitialData();
    }, [params.plateId, user?.uid]);

    const loadInitialData = async () => {
        try {
            if (!user?.uid || !params.plateId) return;
            setLoading(true);


            const response: any = await menuApi.getActiveMenu(user.uid);

            if (response.success && response.data) {

                setMenuDocId(response.data.id);

                const allPlates = response.data.plates || response.data.plate || [];
                setPlatesList(allPlates);

                const targetId = String(params.plateId).trim();
                const current = allPlates.find((p: any) => String(p.id).trim() === targetId);

                if (current) {
                    setEditPlate(JSON.parse(JSON.stringify(current)));
                }
            }
        } catch (error) {
            console.error("Error al cargar:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA DE INGREDIENTES ---
    const toggleIngredient = (name: string) => {
        if (!editPlate) return;
        let base = [...editPlate.baseIngredients];
        let opt = [...editPlate.optionalIngredients];
        if (base.includes(name)) {
            base = base.filter(i => i !== name);
            opt.push(name);
        } else {
            opt = opt.filter(i => i !== name);
            base.push(name);
        }
        setEditPlate({ ...editPlate, baseIngredients: base, optionalIngredients: opt });
    };

    const addIngredient = () => {
        if (!newIng.trim() || !editPlate) return;
        const name = newIng.trim();
        if (!editPlate.baseIngredients.includes(name)) {
            setEditPlate({ ...editPlate, baseIngredients: [...editPlate.baseIngredients, name] });
        }
        setNewIng("");
    };

    const handleSave = async () => {

        if (!editPlate || !menuDocId) {
            Alert.alert("Error", "No se encontró la referencia del menú en la base de datos.");
            return;
        }

        setSaving(true);
        try {

            const plateToSave = {
                ...editPlate,
                basePrice: Number(editPlate.basePrice),
                baseIngredients: normalizeIngredients(editPlate.baseIngredients),
                section: editPlate.section?.map(sec => ({
                    ...sec,
                    options: sec.options.map(opt => ({
                        ...opt,
                        extraPrice: Number(opt.extraPrice)
                    }))
                })) || [],
                updatedAt: new Date().toISOString()
            };


            const result = await menuApi.updatePlateInMenu(menuDocId, editPlate.id, plateToSave);

            if (result.success) {
                Alert.alert("Éxito", "Cambios guardados en Firebase", [
                    { text: "OK", onPress: () => router.replace("/(restaurant)/menu_company") }
                ]);
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            console.error("Error al guardar:", error);
            Alert.alert("Error", error.message || "No se pudo conectar con Firebase");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="black" /></View>;
    if (!editPlate) return <View style={styles.centered}><Text style={styles.errorText}>Platillo no encontrado</Text></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainWrapper}>
                {/* SIDEBAR IZQUIERDO */}
                <View style={styles.sidebar}>
                    <View style={styles.sidebarHeader}>
                        <View style={styles.logoCircle}><MaterialIcons name="restaurant-menu" size={24} color="black" /></View>
                        <Text style={styles.menuTitle}>Menu</Text>
                    </View>
                    <FlatList
                        data={[...platesList, { id: 'add', isAdd: true }]}
                        keyExtractor={(item) => item.id}
                        numColumns={2}
                        renderItem={({ item }: any) => {
                            if (item.isAdd) return <View style={styles.addCard}><Ionicons name="add" size={40} color="#ccc" /></View>;
                            return (
                                <TouchableOpacity
                                    style={[styles.plateCard, params.plateId === item.id && styles.selectedCard]}
                                    onPress={() => router.setParams({ plateId: item.id })}
                                >
                                    <Image source={{ uri: item.imageURL || item.imageUrl }} style={styles.cardImage} />
                                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                                    <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>

                {/* AREA DE EDICIÓN ESTILO MOCKUP */}
                <View style={styles.editorArea}>
                    <ScrollView contentContainerStyle={styles.editorScroll} showsVerticalScrollIndicator={false}>

                        <View style={styles.topRow}>
                            <View style={styles.titleContainer}>
                                <TextInput
                                    style={styles.inputMainName}
                                    value={editPlate.name}
                                    onChangeText={(t) => setEditPlate({...editPlate, name: t})}
                                />
                                <View style={styles.descInputWrapper}>
                                    <TextInput
                                        style={styles.inputMainDesc}
                                        value={editPlate.description}
                                        onChangeText={(t) => setEditPlate({...editPlate, description: t})}
                                        multiline
                                        placeholder="Add a description..."
                                    />
                                </View>
                            </View>
                            <TouchableOpacity style={styles.imageBox}>
                                <Image source={{ uri: editPlate.imageURL || editPlate.imageUrl }} style={styles.fullImg} />
                                <View style={styles.editIconCircle}><MaterialIcons name="edit" size={20} color="black" /></View>
                            </TouchableOpacity>
                        </View>

                        {/* SECCIONES (FLAVOR, SIZE, ETC) */}
                        {editPlate.section?.map((sec, sIdx) => (
                            <View key={sec.id || sIdx} style={styles.sectionBlock}>
                                <View style={styles.sectionTitleRow}>
                                    <TextInput
                                        style={styles.sectionNameInput}
                                        value={sec.name}
                                        onChangeText={(t) => {
                                            const ns = [...editPlate.section];
                                            ns[sIdx].name = t;
                                            setEditPlate({...editPlate, section: ns});
                                        }}
                                    />
                                    <TouchableOpacity><Ionicons name="trash-outline" size={24} color="black" /></TouchableOpacity>
                                </View>
                                <TextInput
                                    style={styles.sectionDescText}
                                    placeholder="Describe what changes does this section"
                                    value={sec.description}
                                    onChangeText={(t) => {
                                        const ns = [...editPlate.section];
                                        ns[sIdx].description = t;
                                        setEditPlate({...editPlate, section: ns});
                                    }}
                                />

                                {sec.options.map((opt, oIdx) => (
                                    <View key={opt.id || oIdx} style={styles.optionRow}>
                                        <View style={styles.dot} />
                                        <View style={{flex: 1}}>
                                            <View style={styles.optionHeader}>
                                                <TextInput
                                                    style={styles.optionNameInput}
                                                    value={opt.name}
                                                    onChangeText={(t) => {
                                                        const ns = [...editPlate.section];
                                                        ns[sIdx].options[oIdx].name = t;
                                                        setEditPlate({...editPlate, section: ns});
                                                    }}
                                                />
                                                <View style={styles.priceBox}>
                                                    <Text style={styles.plusSymbol}>+</Text>
                                                    <TextInput
                                                        style={styles.priceInput}
                                                        value={String(opt.extraPrice)}
                                                        keyboardType="numeric"
                                                        onChangeText={(t) => {
                                                            const ns = [...editPlate.section];
                                                            ns[sIdx].options[oIdx].extraPrice = Number(t) || 0;
                                                            setEditPlate({...editPlate, section: ns});
                                                        }}
                                                    />
                                                </View>
                                            </View>
                                            <TextInput
                                                style={styles.optionDescInput}
                                                placeholder="Describe what changes does this option"
                                                value={opt.description}
                                                onChangeText={(t) => {
                                                    const ns = [...editPlate.section];
                                                    ns[sIdx].options[oIdx].description = t;
                                                    setEditPlate({...editPlate, section: ns});
                                                }}
                                            />
                                        </View>
                                    </View>
                                ))}
                                <TouchableOpacity style={styles.addOptionBtn}><Ionicons name="add-circle" size={24} color="black" /></TouchableOpacity>
                            </View>
                        ))}

                        <TouchableOpacity style={styles.addSectionBtn}>
                            <Text style={styles.addSectionText}>+ Add section</Text>
                        </TouchableOpacity>

                        {/* INGREDIENTES */}
                        <Text style={styles.ingredientsTitle}>Ingredients</Text>
                        <View style={styles.tagsWrapper}>
                            {editPlate.baseIngredients?.map((ing, i) => (
                                <TouchableOpacity key={`b-${i}`} style={styles.tagBase} onPress={() => toggleIngredient(ing)}>
                                    <Text style={styles.tagText}>{ing}</Text>
                                </TouchableOpacity>
                            ))}
                            {editPlate.optionalIngredients?.map((ing, i) => (
                                <TouchableOpacity key={`o-${i}`} style={styles.tagOpt} onPress={() => toggleIngredient(ing)}>
                                    <Text style={styles.tagText}>{ing} (opt)</Text>
                                </TouchableOpacity>
                            ))}
                            <View style={styles.addIngBox}>
                                <TextInput style={styles.ingInput} placeholder="Add..." value={newIng} onChangeText={setNewIng} onSubmitEditing={addIngredient} />
                                <TouchableOpacity onPress={addIngredient}><Ionicons name="add-circle" size={32} color="black" /></TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.actionFooter}>
                            <TouchableOpacity style={styles.btnCancel} onPress={() => router.back()}><Text style={styles.btnText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.btnNext} onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Save changes</Text>}
                            </TouchableOpacity>
                        </View>

                    </ScrollView>
                </View>
            </View>
        </SafeAreaView>
    );
}

// --- ESTILOS ---
const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mainWrapper: { flex: 1, flexDirection: 'row' },
    sidebar: { width: '30%', padding: 25, borderRightWidth: 1, borderColor: '#eee' },
    sidebarHeader: { marginBottom: 20 },
    logoCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    menuTitle: { fontSize: 36, fontWeight: '900' },
    plateCard: { flex: 0.5, margin: 5, backgroundColor: '#f9f9f9', borderRadius: 16, padding: 10 },
    selectedCard: { borderWidth: 2, borderColor: 'black' },
    cardImage: { width: '100%', height: 80, borderRadius: 10, marginBottom: 5 },
    cardName: { fontSize: 14, fontWeight: 'bold' },
    cardDesc: { fontSize: 10, color: '#888' },
    addCard: { flex: 0.5, height: 160, margin: 5, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
    editorArea: { flex: 1, backgroundColor: '#f2f3f5' },
    editorScroll: { padding: 60 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 50 },
    titleContainer: { flex: 1, paddingRight: 40 },
    inputMainName: { fontSize: 52, fontWeight: '900', borderBottomWidth: 3, borderColor: 'black', paddingBottom: 10, marginBottom: 25 },
    descInputWrapper: { backgroundColor: '#d9d9d9', padding: 20, borderRadius: 6 },
    inputMainDesc: { fontSize: 18, lineHeight: 26, color: '#333' },
    imageBox: { width: 250, height: 250, position: 'relative' },
    fullImg: { width: '100%', height: '100%', borderRadius: 30 },
    editIconCircle: { position: 'absolute', top: '45%', left: '42%', backgroundColor: 'white', width: 45, height: 45, borderRadius: 23, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    sectionBlock: { marginBottom: 40 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#bbb', paddingBottom: 8 },
    sectionNameInput: { fontSize: 32, fontWeight: '800', flex: 1 },
    sectionDescText: { fontSize: 15, color: '#666', backgroundColor: '#d9d9d9', padding: 8, marginTop: 15, borderRadius: 4, alignSelf: 'flex-start' },
    optionRow: { flexDirection: 'row', marginTop: 25, alignItems: 'flex-start' },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'black', marginTop: 15, marginRight: 20 },
    optionHeader: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    optionNameInput: { fontSize: 26, fontWeight: '600', flex: 1 },
    priceBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#444', paddingHorizontal: 12, borderRadius: 6 },
    plusSymbol: { fontSize: 20, fontWeight: 'bold' },
    priceInput: { fontSize: 20, width: 80, height: 45, textAlign: 'center', fontWeight: 'bold' },
    optionDescInput: { fontSize: 15, color: '#666', backgroundColor: '#d9d9d9', padding: 8, marginTop: 8, borderRadius: 4, alignSelf: 'flex-start' },
    addOptionBtn: { marginTop: 15, marginLeft: 30 },
    addSectionBtn: { backgroundColor: 'black', paddingVertical: 15, paddingHorizontal: 35, borderRadius: 30, alignSelf: 'flex-start', marginTop: 15 },
    addSectionText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    ingredientsTitle: { fontSize: 28, fontWeight: 'bold', marginTop: 50, marginBottom: 25 },
    tagsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    tagBase: { backgroundColor: 'black', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
    tagOpt: { backgroundColor: '#777', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25 },
    tagText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    addIngBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    ingInput: { backgroundColor: '#d9d9d9', borderRadius: 10, paddingHorizontal: 15, height: 45, width: 140, fontSize: 16 },
    actionFooter: { flexDirection: 'row', gap: 25, marginTop: 100, paddingBottom: 80 },
    btnCancel: { flex: 1, backgroundColor: '#d00', height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
    btnNext: { flex: 1, backgroundColor: 'black', height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
    btnText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    errorText: { fontSize: 26, fontWeight: 'bold', color: '#555' }
});