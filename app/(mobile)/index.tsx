import { View } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';
import { FlatList, Image, StyleSheet, Text } from 'react-native';

type ImageButtonItem = {
    id: string;
    title: string;
    imageKey: string;
};

const ImageButtonsData: ImageButtonItem[] = [
    {
        id: '1',
        title: 'Italian',
        imageKey: 'italian'
    },
    {
        id: '2',
        title: 'Asian',
        imageKey: 'asian'
    },
    {
        id: '3',
        title: 'Fast Food',
        imageKey: 'fast-food'
    },
    {
        id: '4',
        title: 'Baked-Goods',
        imageKey: 'baked-goods'
    },
    {
        id: '5',
        title: 'Snacks',
        imageKey: 'snacks'
    },
    {
        id: '6',
        title: 'Salads',
        imageKey: 'salads'
    },
    {
        id: '7',
        title: 'Soups',
        imageKey: 'soups'
    },
    {
        id: '8',
        title: 'Drinks',
        imageKey: 'drinks'
    },
]

function getImagesForImageButtons(key: string) {
    switch(key){
        case 'italian': return require('@/assets/images/food-categories/italian.png');
        case 'asian': return require('@/assets/images/food-categories/asian.png');
        case 'fast-food': return require('@/assets/images/food-categories/fast-food.png');
        case 'baked-goods': return require('@/assets/images/food-categories/baked-goods.png');
        case 'snacks': return require('@/assets/images/food-categories/snacks.png');
        case 'salads': return require('@/assets/images/food-categories/salads.png');
        case 'soups': return require('@/assets/images/food-categories/soups.png');
        case 'drinks': return require('@/assets/images/food-categories/drinks.png');
        default: return require('@/assets/images/food-categories/italian.png')

    }
}

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
