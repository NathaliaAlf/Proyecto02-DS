// (customer)/index.tsx
import { View } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';
import { getImagesForImageButtons, ImageButtonsData } from '@/utils/categories';
import { router } from 'expo-router';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function TabOneScreen() {
  const {colors, theme} = useTheme();
  const styles = createStyles(colors);
  const handleCategoryPress = (categoryId: string, categoryTitle: string) => {
    // Navigate to restaurants screen with category ID
    router.push({
      pathname: "/(customer)/restaurants/[categoryId]",
      params: { 
        categoryId,
        categoryTitle 
      }
    });
  };
  return (
    <View style={styles.container}>
        <FlatList
            data={ImageButtonsData}
            numColumns={2}
            keyExtractor={(imageButtonItem) => imageButtonItem.id}
            contentContainerStyle={styles.imageButtonContainer}
            columnWrapperStyle={styles.row}
            renderItem={({item}) => (
              <TouchableOpacity
                style={styles.imageButton}
                onPress={() =>handleCategoryPress(item.id, item.title)}
                activeOpacity={0.7}
              >
                <Image
                    source={getImagesForImageButtons(item.imageKey)}
                    style={styles.picImageButton}
                    resizeMode='contain'
                />
                <Text style={styles.imageButtonTitle}>{item.title}</Text>
              </TouchableOpacity>
            )}
        />
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  row: {
    backgroundColor: colors.background,
    justifyContent: 'space-evenly'
  },
  imageButtonContainer: {
    backgroundColor: 'transparent',
    alignContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  imageButton:{
    marginTop: 30,
    paddingHorizontal: 20,
    flexDirection: 'column',
    width: '45%',
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  imageButtonTitle: {
    fontSize: 12,
    color: colors.text,
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  picImageButton: {
    marginTop: 'auto',
    width: '100%',
    height: 160,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 20,
    fontWeight: '300',
    textAlign: 'center',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
