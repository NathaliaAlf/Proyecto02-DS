import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView
} from 'react-native';
// Assuming Expo or standard vector icons library is available
import { Ionicons } from '@expo/vector-icons';

// --- Types ---
type PaymentType = 'visa' | 'paypal' | 'cash';

interface PaymentMethod {
    id: string;
    type: PaymentType;
    label: string;
    subLabel?: string;
}

// --- Mock Data (Symbolic) ---
const PAYMENT_METHODS: PaymentMethod[] = [
    { id: '1', type: 'visa', label: 'Credit Card' },
    { id: '2', type: 'paypal', label: 'PayPal', subLabel: 'user.email@example.com' },
    { id: '3', type: 'visa', label: 'Debit Card' },
    { id: '4', type: 'cash', label: 'Cash' },
];

export default function WalletScreen() {

    // Helper to render the specific logo styles based on type
    const renderIcon = (type: PaymentType) => {
        switch (type) {
            case 'visa':
                return (
                    <View style={[styles.iconBase, styles.iconVisa]}>
                        <Text style={styles.iconTextVisa}>VISA</Text>
                    </View>
                );
            case 'paypal':
                return (
                    <View style={[styles.iconBase, styles.iconPaypal]}>
                        <Text style={styles.iconTextPaypal}>P</Text>
                    </View>
                );
            case 'cash':
                return (
                    <View style={[styles.iconBase, styles.iconCash]}>
                        <View style={styles.cashBill} />
                    </View>
                );
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Balance Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardLabel}>Uber balances</Text>
                    </View>

                    <View style={styles.balanceRow}>
                        <Text style={styles.currency}>CRC</Text>
                        <Text style={styles.balanceAmount}>0.00</Text>
                    </View>

                    <TouchableOpacity style={styles.addFundsButton}>
                        <Ionicons name="add" size={24} color="#FFF" />
                        <Text style={styles.addFundsText}>Add Funds</Text>
                    </TouchableOpacity>
                </View>

                {/* Payment Methods Section */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Payment methods</Text>

                    <View style={styles.methodsList}>
                        {PAYMENT_METHODS.map((method) => (
                            <TouchableOpacity key={method.id} style={styles.methodRow}>
                                {renderIcon(method.type)}
                                <View style={styles.methodInfo}>
                                    <Text style={styles.methodLabel}>{method.label}</Text>
                                    {method.subLabel && (
                                        <Text style={styles.methodSubLabel}>{method.subLabel}</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 20,
    },

    // Balance Card
    card: {
        backgroundColor: '#F3F3F3', // Light gray card background
        borderRadius: 16,
        padding: 24,
        marginBottom: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        marginBottom: 8,
    },
    cardLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 16,
    },
    currency: {
        fontSize: 32,
        fontWeight: '700',
        color: '#000',
        marginRight: 8,
    },
    balanceAmount: {
        fontSize: 32,
        fontWeight: '700',
        fontFamily: 'monospace', // Gives that specific digit look
        color: '#000',
    },
    balanceChevron: {
        marginLeft: 'auto',
        alignSelf: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    infoText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#000',
        fontWeight: '400',
    },
    addFundsButton: {
        backgroundColor: '#000',
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        alignSelf: 'flex-start', // Pill shape sizing
    },
    addFundsText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 8,
    },

    // Payment Methods
    sectionContainer: {
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        marginBottom: 20,
    },
    methodsList: {
        gap: 24,
    },
    methodRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    methodInfo: {
        marginLeft: 16,
        justifyContent: 'center',
    },
    methodLabel: {
        fontSize: 16,
        color: '#000',
        fontWeight: '400',
    },
    methodSubLabel: {
        fontSize: 14,
        color: '#757575',
        marginTop: 2,
    },

    // Icons Logic (Visual Proxies)
    iconBase: {
        width: 40,
        height: 26,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Visa Look
    iconVisa: {
        backgroundColor: '#1A1F71', // Visa Blue
    },
    iconTextVisa: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    // Paypal Look
    iconPaypal: {
        backgroundColor: '#F3F3F3',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    iconTextPaypal: {
        color: '#003087',
        fontSize: 18,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    // Cash Look
    iconCash: {
        backgroundColor: '#6AB04C',
    },
    cashBill: {
        width: 20,
        height: 12,
        borderRadius: 2,
        borderWidth: 1.5,
        borderColor: '#FFF',
        backgroundColor: 'transparent',
    },
});