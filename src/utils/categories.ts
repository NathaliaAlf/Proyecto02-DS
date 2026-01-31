export type ImageButtonItem = {
    id: string;
    title: string;
    imageKey: string;
};

export const ImageButtonsData: ImageButtonItem[] = [
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

export function getImagesForImageButtons(key: string) {
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