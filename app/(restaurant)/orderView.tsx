import { useTheme } from "@/context/ThemeContext";
import React, { useState } from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Image
} from 'react-native';

// --- Interfaces based on provided JSON ---

interface Option {
    description: string;
    extraPrice: number;
    id: string;
    name: string;
    updatedAt?: string;
}

interface Section {
    createdAt: string;
    description: string;
    id: string;
    name: string;
    options: Option[];
}

interface Plate {
    active: boolean;
    baseIngredients: string[];
    basePrice: number;
    createdAt: string;
    description: string;
    id: string;
    name: string;
    optionalIngredients: string[];
    updatedAt: string;
    section: Section[];
}

interface Order {
    address: string;
    clientName: string;
    createdAt: string;
    orderId: string;
    plates: Plate[];
    restaurantId: string;
    totalAmount: number;
    updatedAt: string;
}

// --- Mock Data ---

const mockOrderData: Order = {
    "address": "Calle 9, San Pedro",
    "clientName": "Juan",
    "createdAt": "2026-02-02T10:20:00-06:00",
    "orderId": "rO7u5tBI8yQvdIslULBr",
    "plates": [
        {
            "active": true,
            "baseIngredients": [
                "Harina de trigo fuerte",
                "Agua",
                "Levadura",
                "Sal",
                "Manteca",
                "Azúcar "
            ],
            "basePrice": 815,
            "createdAt": "2026-02-02T22:27:05-06:00",
            "description": "Baguette with a base flavor or customizable",
            "id": "unique_id_baguette",
            "name": "Baguette",
            "optionalIngredients": [
                "Soft crumb"
            ],
            "updatedAt": "2026-02-02T10:27:18-06:00",
            "section": [
                {
                    "createdAt": "2026-02-02T22:39:08-06:00",
                    "description": "Choose a flavor ",
                    "id": "unique_id_section_flavor",
                    "name": "Flavor ",
                    "options": [
                        {
                            "description": "Bread with sesame seeds",
                            "extraPrice": 100,
                            "id": "unique_id_section_flavor_sesame",
                            "name": "Sesame"
                        },
                        {
                            "description": "Bread topped with toasted Parmesan cheese",
                            "extraPrice": 150,
                            "id": "unique_id_section_flavor_cheese",
                            "name": "Cheese"
                        },
                        {
                            "description": "Bread with rosemary and basil",
                            "extraPrice": 200,
                            "id": "unique_id_section_flavor_spices",
                            "name": "Spices",
                            "updatedAt": "2026-02-02T22:39:08-06:00"
                        }
                    ]
                }
            ]
        }
    ],
    "restaurantId": "C6lrz994sDXZGM3durJL",
    "totalAmount": 123,
    "updatedAt": "2026-02-02T00:00:00-06:00"
};

const mockOrders: Order[] = [mockOrderData];

export default function OrderView() {
    const { colors } = useTheme();
    const [selectedOrder, setSelectedOrder] = useState<Order>(mockOrders[0]);

    const designColors = {
        ...colors,
        bgSidebar: '#FFFFFF',
        bgMain: '#F7F7F7',
        border: '#E0E0E0',
    };

    const styles = createStyles(designColors);

    // Helper to format time
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainWrapper}>

                {/* --- LEFT SIDEBAR (Orders List) --- */}
                <View style={styles.sidebar}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarContent}>

                        {/* Título Orders (Sin íconos arriba) */}
                        <Text style={styles.sidebarTitle}>Orders</Text>

                        {mockOrders.map((order) => (
                            <View key={order.orderId}>
                                <Text style={styles.dateHeader}>{formatDate(order.createdAt)}</Text>
                                <TouchableOpacity
                                    style={styles.orderCard}
                                    onPress={() => setSelectedOrder(order)}
                                >
                                    <View style={styles.orderUserRow}>
                                        <View style={[styles.avatar, { backgroundColor: '#5FB065' }]} />
                                        <View style={styles.userInfo}>
                                            <Text style={styles.userName}>{order.clientName}</Text>
                                            <Text style={styles.userAddress}>Dir: {order.address}</Text>
                                        </View>
                                        <Text style={styles.timeText}>{formatTime(order.createdAt)}</Text>
                                    </View>
                                    <View style={styles.orderDetailRow}>
                                        <Image
                                            source={{ uri: 'https://via.placeholder.com/40' }}
                                            style={styles.foodThumb}
                                        />
                                        <View style={styles.foodInfo}>
                                            <Text style={styles.foodName}>{order.plates[0]?.name || 'Unknown'}</Text>
                                            <Text style={styles.foodSub}>{order.plates[0]?.description || ''}</Text>
                                        </View>
                                        <View style={styles.qtyBadgeBlack}>
                                            <Text style={styles.qtyTextWhite}>{order.plates.length}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        ))}

                    </ScrollView>
                </View>

                {/* --- RIGHT MAIN PANEL (Detail View) --- */}
                <View style={styles.mainPanel}>
                    <ScrollView contentContainerStyle={styles.mainContent}>

                        {/* User Header Detail */}
                        <View style={styles.detailHeader}>
                            <View style={[styles.avatarLarge, { backgroundColor: '#5FB065' }]}>
                                <Text style={{ fontSize: 20 }}>👤</Text>
                            </View>
                            <View>
                                <Text style={styles.detailUserName}>{selectedOrder.clientName}</Text>
                                <Text style={styles.detailUserAddr}>Dir: {selectedOrder.address}</Text>
                            </View>
                        </View>

                        {/* Displaying plates */}
                        {selectedOrder.plates.map((plate, index) => (
                            <View key={plate.id + index} style={{ marginBottom: 40 }}>
                                {/* Title Section */}
                                <View style={styles.titleRow}>
                                    <Text style={styles.pastaTitle}>{plate.name}</Text>
                                    <View style={styles.detailQtyBadge}>
                                        {/* Quantity is missing in the data structure per plate, assuming 1 */}
                                        <Text style={styles.detailQtyText}>x 1</Text>
                                    </View>
                                </View>

                                {/* Info Rows */}
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Price:</Text>
                                    <Text style={styles.value}>{plate.basePrice}</Text>
                                </View>

                                {/* Base Ingredients List */}
                                <Text style={styles.sectionTitle}>Base Ingredients</Text>
                                <View style={styles.ingredientsContainer}>
                                    {plate.baseIngredients.map((ing, i) => (
                                        <View key={i} style={styles.pillBlack}>
                                            <Text style={styles.pillTextWhite}>{ing}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Optional Ingredients List */}
                                {plate.optionalIngredients.length > 0 && (
                                    <>
                                        <Text style={styles.sectionTitle}>Optional Ingredients</Text>
                                        <View style={styles.ingredientsContainer}>
                                            {plate.optionalIngredients.map((ing, i) => (
                                                <View key={i} style={styles.pillSpecial}>
                                                    <Text style={styles.pillTextBlack}>{ing}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </>
                                )}

                                {/* Sections (Options) */}
                                {plate.section.map((sec) => (
                                    <View key={sec.id}>
                                        <Text style={styles.sectionTitle}>{sec.name}</Text>
                                        <View style={styles.ingredientsContainer}>
                                            {sec.options.map((opt) => (
                                                <View key={opt.id} style={styles.pillSpecial}>
                                                    <Text style={styles.pillTextBlack}>{opt.name} (+{opt.extraPrice})</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))}

                        {/* Comments Section - Not present in the JSON structure */}
                        <Text style={styles.sectionTitle}>Comments</Text>
                        <View style={styles.commentBox}>
                            <Text style={styles.commentText}>No comments in data</Text>
                        </View>

                        {/* Complete Button */}
                        <View style={styles.footerContainer}>
                            <TouchableOpacity style={styles.completeButton}>
                                <Text style={styles.buttonText}>Complete Order</Text>
                            </TouchableOpacity>
                        </View>

                    </ScrollView>
                </View>

            </View>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgSidebar },
    mainWrapper: { flex: 1, flexDirection: 'row' },

    // --- LEFT SIDEBAR STYLES ---
    sidebar: {
        width: '35%',
        borderRightWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bgSidebar,
    },
    sidebarContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 40 // Espacio superior añadido ya que quitamos los íconos
    },

    // Sidebar Title
    sidebarTitle: {
        fontFamily: 'Inter',
        fontSize: 30,
        fontWeight: '700',
        marginBottom: 25,
        color: '#000'
    },

    // Date
    dateHeader: {
        fontFamily: 'Inter',
        fontSize: 16,
        color: '#000',
        marginBottom: 15
    },

    // Order Card
    orderCard: { marginBottom: 25 },
    orderUserRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
    userInfo: { flex: 1 },

    // User Name & Info
    userName: {
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 13,
        color: '#000'
    },
    userAddress: {
        fontFamily: 'Inter',
        fontSize: 11,
        color: '#666'
    },
    timeText: {
        fontFamily: 'Inter',
        fontSize: 11,
        color: '#000'
    },

    orderDetailRow: { flexDirection: 'row', alignItems: 'center' },
    foodThumb: { width: 45, height: 45, borderRadius: 4, marginRight: 12, backgroundColor: '#EEE' },
    foodInfo: { flex: 1 },

    // Food Name
    foodName: {
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 15,
        color: '#000'
    },
    foodSub: {
        fontFamily: 'Inter',
        fontSize: 12,
        color: '#444'
    },

    qtyBadgeBlack: { backgroundColor: '#000', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 },
    qtyBadgeGrey: { backgroundColor: '#777', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 },
    qtyTextWhite: {
        fontFamily: 'Inter',
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600'
    },


    // --- RIGHT MAIN PANEL STYLES ---
    mainPanel: {
        flex: 1,
        backgroundColor: '#F7F7F7',
    },
    mainContent: {
        padding: 50,
    },

    detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
    avatarLarge: {
        width: 60, height: 60, borderRadius: 30, // Reducido ligeramente
        marginRight: 15, justifyContent: 'center', alignItems: 'center'
    },

    // Typography: Detail User (REDUCIDO)
    detailUserName: {
        fontFamily: 'Inter',
        fontSize: 18, // Antes 22
        fontWeight: '700',
        color: '#000'
    },
    detailUserAddr: {
        fontFamily: 'Inter',
        fontSize: 12, // Antes 14
        color: '#444'
    },

    // --- PASTA TITLE SPECIFIC (REDUCIDO) ---
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25
    },
    pastaTitle: {
        fontFamily: 'Inter',
        fontWeight: '700',
        fontSize: 26, // Antes 32
        lineHeight: 30,
        color: '#000',
        letterSpacing: -0.5,
    },
    detailQtyBadge: {
        backgroundColor: '#000',
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    detailQtyText: {
        fontFamily: 'Inter',
        color: '#FFF',
        fontSize: 14, // Antes 16
        fontWeight: '500'
    },

    // Info Rows (REDUCIDO SIGNIFICATIVAMENTE)
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15
    },
    label: {
        fontFamily: 'Inter',
        fontSize: 18, // Antes 24
        fontWeight: '700',
        color: '#000',
        width: 100 // Ajustado ancho
    },
    value: {
        fontFamily: 'Inter',
        fontSize: 18, // Antes 24
        fontWeight: '300',
        color: '#000'
    },

    // Section Titles (REDUCIDO)
    sectionTitle: {
        fontFamily: 'Inter',
        fontSize: 16, // Antes 20
        fontWeight: '700',
        color: '#000',
        marginTop: 20,
        marginBottom: 10
    },

    // Ingredients Pills
    ingredientsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 5,
    },
    pillBlack: { backgroundColor: '#000' },
    pillSpecial: { backgroundColor: '#D9D9D9' },

    pillTextWhite: {
        fontFamily: 'Inter',
        color: '#FFF',
        fontSize: 13, // Antes 14
        fontWeight: '500'
    },
    pillTextBlack: {
        fontFamily: 'Inter',
        color: '#000',
        fontSize: 13, // Antes 14
        fontWeight: '500'
    },

    // Comment Box
    commentBox: {
        backgroundColor: '#D9D9D9',
        padding: 15,
        borderRadius: 6,
        minHeight: 70,
        marginTop: 5
    },
    commentText: {
        fontFamily: 'Inter',
        color: '#333',
        fontSize: 13,
        fontWeight: '400'
    },

    // Footer Button
    footerContainer: {
        marginTop: 40,
        alignItems: 'flex-end',
        width: '100%'
    },
    completeButton: {
        backgroundColor: '#000',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 30,
        width: '100%',
        alignItems: 'center'
    },
    buttonText: {
        fontFamily: 'Inter',
        color: '#FFF',
        fontSize: 15,
        fontWeight: '500'
    }
});