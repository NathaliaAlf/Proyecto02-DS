import { View } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';
import { getImagesForImageButtons, ImageButtonsData } from '@/utils/categories';
import { FlatList, Image, StyleSheet, Text } from 'react-native';

export default function TabOneScreen() {
    const {colors, theme} = useTheme();
    const styles = createStyles(colors);
  return (
    <View style={styles.container}>
        <FlatList
            data={ImageButtonsData}
            numColumns={2}
            keyExtractor={(imageButtonItem) => imageButtonItem.id}
            contentContainerStyle={styles.imageButtonContainer}
            columnWrapperStyle={styles.row}
            renderItem={({item}) => (
                <View style={styles.imageButton}>
                    <Image
                        source={getImagesForImageButtons(item.imageKey)}
                        style={styles.picImageButton}
                        resizeMode='contain'
                    />
                    <Text style={styles.imageButtonTitle}>{item.title}</Text>
                </View>
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
