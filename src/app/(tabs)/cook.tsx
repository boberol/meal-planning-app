import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';

/** The Cook tab: "What can I make?". Suggestions arrive in Step 4. */
export default function CookScreen() {
  return (
    <Screen>
      <ScreenHeader eyebrow="From what’s in your pantry" title="What can I make?" />
      <EmptyState
        icon="flame-outline"
        title="Suggestions need recipes and a pantry"
        body="Once you’ve added recipes and what’s in your kitchen, this shows what you can cook right now."
      />
    </Screen>
  );
}
