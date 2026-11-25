import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';
import { useHousehold } from '@/lib/useHousehold';
import { useHouseholdSync } from '@/lib/sync';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** One tab's icon: filled when it's the open tab, outlined otherwise. */
function tabIcon(active: IconName, inactive: IconName) {
  function TabIcon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <Ionicons name={focused ? active : inactive} size={size} color={color as string} />;
  }
  return TabIcon;
}

/** The five tabs at the bottom of the app. The file names here are the routes. */
export default function TabsLayout() {
  // While the tabs are open (they stay open under every other screen), keep
  // recipes and the plan in sync with the rest of the family.
  const { householdId } = useHousehold();
  useHouseholdSync(householdId);
  // Room for the icon and its label, plus the phone's gesture bar.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          height: 64 + insets.bottom,
          paddingTop: 4,
          paddingBottom: insets.bottom + 4,
        },
        sceneStyle: { backgroundColor: colors.ground },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Plan', tabBarIcon: tabIcon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="recipes" options={{ title: 'Recipes', tabBarIcon: tabIcon('book', 'book-outline') }} />
      <Tabs.Screen name="cook" options={{ title: 'Cook', tabBarIcon: tabIcon('flame', 'flame-outline') }} />
      <Tabs.Screen name="groceries" options={{ title: 'Groceries', tabBarIcon: tabIcon('cart', 'cart-outline') }} />
      <Tabs.Screen name="pantry" options={{ title: 'Pantry', tabBarIcon: tabIcon('cube', 'cube-outline') }} />
    </Tabs>
  );
}
