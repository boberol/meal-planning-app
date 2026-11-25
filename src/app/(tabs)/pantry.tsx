import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';

/** The Pantry tab. Fridge, pantry and freezer tracking arrives in Step 3. */
export default function PantryScreen() {
  return (
    <Screen>
      <ScreenHeader eyebrow="What’s in the kitchen" title="Pantry" />
      <EmptyState
        icon="cube-outline"
        title="Nothing in the pantry yet"
        body="Tracking your fridge, pantry and freezer comes with the grocery list update."
      />
    </Screen>
  );
}
