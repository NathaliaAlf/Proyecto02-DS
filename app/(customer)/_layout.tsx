// (customer)/_layout.tsx 
import SearchBar from '@/components/SearchBar';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, usePathname } from 'expo-router';
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
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

export default function CustomerLayout() {
    const pathname = usePathname();
    const {user, logout} = useAuth();
    const {colors} = useTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const slideAnim = useRef(new Animated.Value(-300)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const styles = createStyles(colors);
    const isInRestaurantMenu = pathname.startsWith('/(customer)/restaurants/');
    const pathParts = pathname.split('/').filter(Boolean);
    const restaurantIdMatch = pathname.match(/\/restaurants\/[^\/]+\/([^\/]+)/);
    const restaurantId = restaurantIdMatch ? restaurantIdMatch[1] : null;
    const categoryId = pathParts[2] || null;

    interface MenuItem {
        id: number;
        icon: any;
        name: string;
        iconLib: React.ComponentType<any>;
        path: any; // Use 'any' to avoid TypeScript errors
    }

    const menuItems: MenuItem[] = [
        { id: 1, icon: 'wallet-outline', name: 'Wallet', iconLib: Ionicons, path: '/(customer)/wallet' },
        { id: 2, icon: 'star-outline', name: 'Subscriptions', iconLib: Ionicons, path: '/(customer)/subscriptions' },
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

    // Determine search mode
    const getSearchMode = () => {
        return restaurantId ? 'plates' : 'restaurants';
    };

    const getSearchPlaceholder = () => {
        if (restaurantId) {
            return 'Search in menu...';
        } else if (isInRestaurantMenu) {
            return 'Search restaurants...';
        } else {
            return 'Search...';
        }
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        // Here you would implement the search logic based on context
        if (restaurantId) {
            // Search plates in this restaurant's menu
            console.log(`Searching plates in restaurant ${restaurantId}: ${text}`);
            // You could emit an event, update context, or call a function here
        } else if (isInRestaurantMenu) {
            // Search restaurants in current category
            console.log(`Searching restaurants: ${text}`);
        } else {
            // General search (all restaurants)
            console.log(`General search: ${text}`);
        }
    };

    const handleMenuItemPress = (path: any) => {
        closeMenu();
        router.push(path);
    };

    const goToCart = () => {
        router.push('/(customer)/Cart'); // Updated path
    };

    return (
        <>
            <Stack screenOptions={{
                headerShown: true, 
                headerStyle: styles.headerTitleContainer,
                headerShadowVisible: false,
                headerTitleAlign: 'center',
                headerTitle: ({children}) => (
                    <View style={styles.searchContainer}>
                        <SearchBar
                        placeholder={getSearchPlaceholder()}
                        searchMode={getSearchMode()}
                        restaurantId={restaurantId || undefined}
                        categoryId={categoryId || undefined}
                        />
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
                                onPress={goToCart}
                            >
                                <Feather name="shopping-cart" style={styles.icon} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ),
            }}>
                {/* Customer home screen */}
                <Stack.Screen 
                    name="index" 
                    options={{ 
                        title: "Home",
                        headerShown: true
                    }} 
                />
                
                {/* Cart screen - make sure this file exists at app/(customer)/Cart.tsx */}
                <Stack.Screen 
                    name="Cart" 
                    options={{ 
                        title: "Cart",
                        headerShown: true,
                        // Remove the cart button from the Cart screen header
                        headerRight: () => null,
                        headerLeft: () => (
                            <Pressable
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                onPress={() => router.back()}
                                style={styles.headerLeftContainer}
                            >
                                <AntDesign 
                                    name="left" 
                                    style={styles.icon}
                                />
                            </Pressable>
                        ),
                    }} 
                />
                
                {/* Order History screen - make sure this file exists at app/(customer)/OrderHistory.tsx */}
                <Stack.Screen 
                    name="OrderHistory" 
                    options={{ 
                        title: "Order History",
                        headerShown: true,
                        headerRight: () => null,
                    }} 
                />

                {/* Subscriptions screens - these should be defined in a separate subscriptions folder */}
                <Stack.Screen 
                    name="subscriptions/index" 
                    options={{ 
                        title: "My Subscriptions",
                        headerShown: true,
                        headerRight: () => null,
                    }} 
                />

                {/* Restaurants group - this will use its own layout */}
                <Stack.Screen 
                    name="restaurants" 
                    options={{ 
                        headerShown: false 
                    }} 
                />

                {/* You might need to add more screens here if they're not in sub-folders */}
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
                        {/* Home menu item */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            activeOpacity={0.7}
                            onPress={() => {
                                closeMenu();
                                router.push('/(customer)'); // Navigate to home
                            }}
                        >
                            <Ionicons name="home-outline" style={styles.menuItemIcon} />
                            <Text style={styles.menuItemText}>Home</Text>
                        </TouchableOpacity>
                        
                        {/* Menu items from array */}
                        {menuItems.map((item) => {
                            const IconComponent = item.iconLib;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.menuItem}
                                    activeOpacity={0.7}
                                    onPress={() => handleMenuItemPress(item.path)}
                                >
                                    <IconComponent
                                        name={item.icon}
                                        style={styles.menuItemIcon} 
                                    />
                                    <Text style={styles.menuItemText}>{item.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                        
                        {/* Cart menu item */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            activeOpacity={0.7}
                            onPress={() => {
                                closeMenu();
                                router.push('/(customer)/Cart'); // Navigate to cart
                            }}
                        >
                            <Ionicons name="cart-outline" style={styles.menuItemIcon} />
                            <Text style={styles.menuItemText}>Cart</Text>
                        </TouchableOpacity>
                        
                        {/* Order History menu item */}
                        <TouchableOpacity
                            style={styles.menuItem}
                            activeOpacity={0.7}
                            onPress={() => {
                                closeMenu();
                                router.push('/(customer)/OrderHistory'); // Navigate to order history
                            }}
                        >
                            <Ionicons name="receipt-outline" style={styles.menuItemIcon} />
                            <Text style={styles.menuItemText}>Order History</Text>
                        </TouchableOpacity>
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
    searchContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
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