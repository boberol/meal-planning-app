import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { colors, fonts, radius, space, TAP_TARGET } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { daysUntil, fetchMembers, leaveHousehold, regenerateInviteCode, removeMember } from '@/lib/household';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

/**
 * Household and settings: the invite code, who's in the household,
 * and signing out. Opened from your avatar at the top of each tab.
 */
export default function HouseholdScreen() {
  const { profile, refreshProfile, signOut } = useAuth();
  const household = profile?.household ?? null;
  const isOwner = Boolean(household && profile && household.owner_id === profile.id);

  const [members, setMembers] = useState<Profile[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!household) return;
    try {
      setMembers(await fetchMembers(household.id));
    } catch (e) {
      Alert.alert('Couldn’t load members', (e as Error).message);
    }
  }, [household]);

  useEffect(() => {
    if (!household) return;
    let cancelled = false;
    fetchMembers(household.id)
      .then((list) => {
        if (!cancelled) setMembers(list);
      })
      .catch((e) => Alert.alert('Couldn’t load members', (e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [household]);

  // Live updates: when someone joins or leaves, the list refreshes on every phone.
  useEffect(() => {
    if (!household) return;
    const channel = supabase
      .channel(`members-${household.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadMembers())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [household, loadMembers]);

  if (!household || !profile) return null;

  const daysLeft = daysUntil(household.invite_expires_at);
  const codeWorks = Boolean(household.invite_code) && daysLeft > 0;

  async function shareCode() {
    if (!household?.invite_code) return;
    await Share.share({
      message:
        `Join our household “${household.name}” on Pantrio. ` +
        `Sign up, tap “Join household” and type this code: ${household.invite_code}\n` +
        `The code works for ${daysLeft} more ${daysLeft === 1 ? 'day' : 'days'}.`,
    });
  }

  async function newCode() {
    setBusy('code');
    try {
      await regenerateInviteCode();
      await refreshProfile();
    } catch (e) {
      Alert.alert('Couldn’t make a new code', (e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function confirmRemove(member: Profile) {
    Alert.alert(`Remove ${member.display_name}?`, 'They’ll lose access to this household’s recipes, plan and lists. You can invite them again later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setBusy(member.id);
          try {
            await removeMember(member.id);
            await loadMembers();
          } catch (e) {
            Alert.alert('Couldn’t remove them', (e as Error).message);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  function confirmLeave() {
    const alone = (members?.length ?? 1) <= 1;
    const message = alone
      ? 'You’re the only member, so leaving deletes this household and everything in it.'
      : isOwner
        ? 'You’ll stop seeing its recipes, plan and lists. The member who joined first after you becomes the owner.'
        : 'You’ll stop seeing its recipes, plan and lists. You can join again with a new code.';
    Alert.alert(`Leave ${household?.name}?`, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: alone ? 'Delete and leave' : 'Leave',
        style: 'destructive',
        onPress: async () => {
          setBusy('leave');
          try {
            await leaveHousehold();
            // With no household, the app takes you back to set up a new one.
            await refreshProfile();
          } catch (e) {
            Alert.alert('Couldn’t leave', (e as Error).message);
            setBusy(null);
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <View style={styles.topBar}>
        <BackButton label="Back to the app" />
        <Txt variant="heading">Household</Txt>
        <View style={styles.topBarSpacer} />
      </View>

      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Txt variant="eyebrow" color={colors.nightMuted}>
            Your household
          </Txt>
          <Txt variant="title" color={colors.onAccent} style={styles.heroTitle}>
            {household.name}
          </Txt>
        </View>

        <View style={styles.codeBox}>
          <View style={styles.codeText}>
            <Txt variant="caption" color={colors.nightMuted} style={styles.codeLabel}>
              {codeWorks ? `Invite code · works ${daysLeft} more ${daysLeft === 1 ? 'day' : 'days'}` : 'Invite code expired'}
            </Txt>
            <Txt style={[styles.code, !codeWorks && styles.codeExpired]} accessibilityLabel={`Invite code ${household.invite_code?.split('').join(' ')}`}>
              {household.invite_code ?? '––––'}
            </Txt>
          </View>
          {codeWorks ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Share invite code" onPress={shareCode} style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}>
              <Ionicons name="share-outline" size={16} color={colors.ink} />
              <Txt style={styles.shareText}>Share</Txt>
            </Pressable>
          ) : null}
        </View>

        <Txt variant="caption" color="#CFDBD3">
          Family members sign up, tap “Join household” and type this code. Everything you add syncs to everyone.
        </Txt>

        {isOwner ? (
          <Pressable accessibilityRole="button" onPress={newCode} disabled={busy === 'code'} style={styles.newCode}>
            {busy === 'code' ? <ActivityIndicator color={colors.onAccent} /> : <Txt style={styles.newCodeText}>{codeWorks ? 'Make a new code' : 'Make a new code to invite people'}</Txt>}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.section}>
        <Txt variant="overline">Members</Txt>
        <View style={styles.list}>
          {members === null ? (
            <ActivityIndicator style={styles.loading} color={colors.accent} />
          ) : (
            members.map((m, i) => {
              const memberIsOwner = m.id === household.owner_id;
              const isMe = m.id === profile.id;
              return (
                <View key={m.id} style={[styles.member, i > 0 && styles.memberBorder]}>
                  <Avatar name={m.display_name} color={m.color} />
                  <Txt variant="bodyStrong" style={styles.memberName}>
                    {m.display_name || 'New member'}
                    {isMe ? ' (you)' : ''}
                  </Txt>
                  {memberIsOwner ? (
                    <View style={styles.ownerBadge}>
                      <Txt style={styles.ownerText}>Owner</Txt>
                    </View>
                  ) : isOwner && !isMe ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${m.display_name}`}
                      onPress={() => confirmRemove(m)}
                      disabled={busy === m.id}
                      style={styles.removeButton}>
                      {busy === m.id ? <ActivityIndicator color={colors.danger} /> : <Txt style={styles.removeText}>Remove</Txt>}
                    </Pressable>
                  ) : (
                    <Txt variant="caption">Member</Txt>
                  )}
                </View>
              );
            })
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <Button title="Sign out" variant="quiet" onPress={() => signOut()} />
        <Button title="Leave household" variant="danger" onPress={confirmLeave} loading={busy === 'leave'} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBarSpacer: { width: TAP_TARGET },
  hero: { backgroundColor: colors.night, borderRadius: radius.xl, padding: space.xl, gap: space.md },
  heroText: { gap: 4 },
  heroTitle: { fontSize: 26, lineHeight: 32 },
  codeBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.lg - 4,
    padding: space.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  codeText: { flex: 1, gap: 2 },
  codeLabel: { fontFamily: fonts.semibold, fontSize: 12 },
  code: { fontFamily: fonts.headingHeavy, fontSize: 26, letterSpacing: 2, color: colors.onAccent },
  codeExpired: { color: colors.nightMuted, textDecorationLine: 'line-through' },
  shareButton: {
    minHeight: TAP_TARGET,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  newCode: { minHeight: TAP_TARGET, justifyContent: 'center', alignSelf: 'flex-start' },
  newCodeText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onAccent, textDecorationLine: 'underline' },
  section: { gap: space.sm },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: space.lg },
  loading: { paddingVertical: space.xl },
  member: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: space.md },
  memberBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  memberName: { flex: 1 },
  ownerBadge: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  ownerText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.accentInk },
  removeButton: { minHeight: TAP_TARGET, minWidth: TAP_TARGET, justifyContent: 'center', alignItems: 'flex-end' },
  removeText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.danger },
  actions: { gap: space.sm },
});
