// (customer)/restaurants/layout.tsx
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AntDesign from '@expo/vector-icons/AntDesign';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router'; // Change from Tabs to Stack
import { useRef, useState } from 'react';
import {
    Animated,
    Easing,
    Image,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

export default function MobileLayout() {
    const {user, logout} = useAuth();
    const {colors} = useTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const slideAnim = useRef(new Animated.Value(-300)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const styles = createStyles(colors);

    interface MenuItem {
        id: number;
        icon: any;
        name: string;
        iconLib: React.ComponentType<any>;
    }

    const menuItems: MenuItem[] = [
        { id: 1, icon: 'food-apple-outline', name: 'Food Preferences', iconLib: MaterialCommunityIcons },
        { id: 2, icon: 'crown-outline', name: 'Subscriptions', iconLib: MaterialCommunityIcons },
    ];

    const handleLogout = async () => {
        await logout();
        router.replace('/(auth-customer)/login');
    };
    
    const openMenu = () => {
        setIsMenuOpen(true);
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0, 
                duration: 300,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(fadeAnim, {
                toValue: 1, 
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const closeMenu = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -300,
                duration: 250,
                useNativeDriver: true,
                easing: Easing.in(Easing.cubic),
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setIsMenuOpen(false);
        });
    };

    const toggleMenu = () => {
        if (isMenuOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    };

    return (
        <>
            <Stack screenOptions={{
                headerShown: true, 
                headerStyle: styles.headerTitleContainer,
                headerShadowVisible: false,
                headerTitleAlign: 'center',
                headerTitle: ({children}) => (
                    <View>
                        <View style={styles.searchBarContainer}>
                            <TextInput 
                                style={styles.searchInput}
                                placeholder='Search'
                                placeholderTextColor={colors.second}
                                underlineColorAndroid={'transparent'}
                            />
                            <EvilIcons name="search" style={styles.icon} />
                        </View>
                    </View>
                ),
                headerLeft: () => (
                    <Pressable
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        onPress={toggleMenu}
                        style={styles.headerLeftContainer}
                    >
                        <AntDesign 
                            name={isMenuOpen ? "close" : "menu"} 
                            style={styles.icon}
                        />
                    </Pressable>
                ),
                headerRight: () => (
                    <View>
                        <View style={styles.headerRightContainer}>
                            <TouchableOpacity 
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                style={styles.headerButton}
                                activeOpacity={0.7}
                            >
                                <Feather name="shopping-cart" style={styles.icon} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ),
            }}>
                <Stack.Screen name="index" options={{ title: "Home" }} />
            </Stack>

            {/* Overlay */}
            {isMenuOpen && (
                <TouchableWithoutFeedback onPress={closeMenu}>
                    <Animated.View 
                        style={[
                            styles.overlay,
                            {
                                opacity: fadeAnim,
                            }
                        ]}
                    />
                </TouchableWithoutFeedback>
            )}

            {/* Side Menu */}
            {isMenuOpen && (
                <Animated.View 
                    style={[
                        styles.sideMenuContainer,
                        {
                            transform: [{ translateX: slideAnim }],
                        }
                    ]}
                >
                    {/* User Profile */}
                    <View style={styles.userSection}>
                        <Image
                        source={
                            user?.picture
                            ? { uri: user.picture }
                            : require("@/assets/images/default_profile_pic.png")
                        }
                        style={styles.profileImage}
                        resizeMode="cover"
                        />
                        <View style={styles.userInfo}>
                            <Text style={styles.userName} numberOfLines={1}>
                                {user?.name || 'user'}
                            </Text>
                            <Text style={styles.userEmail} ellipsizeMode='tail' numberOfLines={1}>
                                {user?.email || 'email'}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.exitButton} onPress={handleLogout}>
                            <Ionicons name="exit-outline" style={styles.icon} />
                        </TouchableOpacity>
                    </View>

                    {/* Menu Items */}
                    <ScrollView style={styles.menuItemsContainer}>
                        {menuItems.map((item) => {
                            const IconComponent = item.iconLib;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.menuItem}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        console.log(`${item.name} pressed`);
                                        closeMenu();
                                    }}
                                >
                                    <IconComponent
                                        name={item.icon}
                                        style={styles.menuItemIcon} 
                                    />
                                    <Text style={styles.menuItemText}>{item.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </Animated.View>
            )}
        </>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    headerTitleContainer: {
        backgroundColor: colors.headerBackground,
    },
    searchBarContainer: {
        flexDirection: 'row',
        backgroundColor: colors.headerBackground,
        width: 220,
        height: 40,
        alignItems: 'center',
        paddingHorizontal: 12,
        borderWidth: 2,
        borderRadius: 20,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        width: '100%',
        borderColor: colors.defaultColor,
        borderRadius: 20,
        color: colors.defaultColor,
    },
    headerLeftContainer: {
        marginLeft: 20,
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    headerRightContainer: {
        marginRight: 20,
        overflow: 'hidden',
    },
    icon: {
        fontSize: 25,
        color: colors.defaultColor,
    },
    exitButton: {
        margin: 5,
    },
    headerButton: {
        padding: 8,
        backgroundColor: 'transparent'
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 999,
    },
    sideMenuContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 300,
        backgroundColor: colors.headerBackground || '#fff',
        paddingTop: StatusBar.currentHeight || 50,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: {
            width: 2,
            height: 0,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 30,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 40,
        marginRight: 15,
        backgroundColor: '#f0f0f0',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.defaultColor || '#000',
        marginBottom: 5,
    },
    userEmail: {
        marginRight: 5,
        fontSize: 14,
        color: colors.second,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        marginHorizontal: 20,
    },
    menuItemsContainer: {
        flex: 1,
        paddingVertical: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    menuItemIcon: {
        fontSize: 35,
        color: colors.defaultColor || '#000',
        marginRight: 15,
        width: 50,
    },
    menuItemText: {
        fontSize: 16,
        color: colors.defaultColor || '#000',
    },
    bottomSection: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
    },
    versionText: {
        fontSize: 12,
        color: colors.second || '#999',
        textAlign: 'center',
    },
});