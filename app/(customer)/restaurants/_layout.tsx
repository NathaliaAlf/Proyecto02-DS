import { Stack } from 'expo-router';

export default function RestaurantsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[categoryId]" />
    </Stack>
  );
}