import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';

/** The Groceries tab. The shared list arrives in Step 3. */
export default function GroceriesScreen() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Shared with your household" title="Groceries" />
      <EmptyState
        icon="cart-outline"
        title="Your list is empty"
        body="Soon this builds itself from your meal plan, minus what’s already in the pantry, and ticks sync to everyone in the shop."
      />
    </Screen>
  );
}
