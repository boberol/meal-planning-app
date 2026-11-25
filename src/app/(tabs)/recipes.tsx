import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';

/** The Recipes tab. The recipe list and editor arrive in Step 2. */
export default function RecipesScreen() {
  return (
    <Screen>
      <ScreenHeader eyebrow="The family cookbook" title="Recipes" />
      <EmptyState
        icon="book-outline"
        title="Your cookbook is empty"
        body="Adding recipes with photos, ingredients and steps comes in the next update."
      />
    </Screen>
  );
}
