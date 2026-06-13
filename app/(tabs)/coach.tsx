import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { TabActions } from '@/components/TabActions';
import { colors, radius, space, type } from '@/lib/theme';
import { formatPence } from '@/lib/money';
import { useProfile } from '@/hooks/useProfile';
import { useIdentity } from '@/hooks/useIdentity';
import { getArchetype, type ArchetypeKey } from '@/lib/archetypes';
import { addBucket, hasBucket } from '@/lib/buckets';

interface Suggestion {
  name: string;
  emoji: string;
  targetPence: number;
  color: string;
}

interface Beat {
  id: string;
  lines: string[];
  suggestion?: Suggestion;
}

// The archetype-flavored second bucket the coach proposes.
const SECOND: Record<ArchetypeKey, Suggestion> = {
  vault: { name: 'House Deposit', emoji: '🏡', targetPence: 500000, color: colors.lime },
  baller: { name: 'Fun Fund', emoji: '🍾', targetPence: 40000, color: colors.gold },
  hustler: { name: 'Invest Pot', emoji: '📈', targetPence: 150000, color: colors.lime },
  magpie: { name: 'Treat Budget', emoji: '✨', targetPence: 30000, color: colors.violet },
  strategist: { name: 'Annual Bills', emoji: '🗂️', targetPence: 120000, color: '#5AC8FA' },
  free_spirit: { name: 'Buffer', emoji: '🌊', targetPence: 50000, color: '#5AC8FA' },
};

function buildBeats(name: string, key: ArchetypeKey): Beat[] {
  const a = getArchetype(key);
  return [
    {
      id: 'intro',
      lines: [
        `Hey ${name} 👋`,
        `You came out as ${a.emoji} ${a.title}. Let's set up a couple of buckets so your plan matches your money type.`,
      ],
    },
    {
      id: 'emergency',
      lines: [
        `As a ${a.title}, let's start with the safety net everyone needs.`,
        `I'd ringfence an Emergency bucket first — set-and-forget peace of mind.`,
      ],
      suggestion: { name: 'Emergency fund', emoji: '🛟', targetPence: 200000, color: colors.lime },
    },
    {
      id: 'second',
      lines: [`Now something that fits you — ${a.signatureMove.toLowerCase()}`, `Here's one I'd line up next.`],
      suggestion: SECOND[key],
    },
    {
      id: 'done',
      lines: [`That's a solid plan 🙌`, `Top these up whenever you sync. You can always add more.`],
    },
  ];
}

export default function Coach() {
  const router = useRouter();
  const me = useIdentity();
  const profile = useProfile();
  const a = getArchetype(profile.archetype);
  const beats = useMemo(() => buildBeats(me.display_name, profile.archetype), [me.display_name, profile.archetype]);

  const [revealed, setRevealed] = useState(1);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<ScrollView>(null);

  const current = beats[revealed - 1];
  const atEnd = revealed >= beats.length;

  const advance = () => {
    if (revealed < beats.length) {
      setRevealed((r) => r + 1);
      Haptics.selectionAsync().catch(() => {});
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    }
  };

  const accept = (beat: Beat) => {
    if (!beat.suggestion) return;
    if (!hasBucket(beat.suggestion.name)) {
      addBucket({
        name: beat.suggestion.name,
        emoji: beat.suggestion.emoji,
        targetPence: beat.suggestion.targetPence,
        currentPence: 0,
        color: beat.suggestion.color,
      });
    }
    setAccepted((s) => ({ ...s, [beat.id]: true }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    advance();
  };

  // What the bottom action offers depends on the current beat.
  const needsDecision = !!current?.suggestion && !accepted[current.id];

  return (
    <Screen>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Avatar emoji="🤖" size={44} ring="lime" />
          <View>
            <Text style={styles.title}>Coach</Text>
            <Text style={styles.sub}>Advice tuned to your money type — never calls the bet.</Text>
          </View>
        </View>

        {beats.slice(0, revealed).map((beat) => (
          <Animated.View key={beat.id} entering={FadeInDown.springify().damping(16)} style={{ gap: 10 }}>
            {beat.lines.map((line, i) => (
              <View key={i} style={styles.bubble}>
                <Text style={styles.bubbleText}>{line}</Text>
              </View>
            ))}
            {beat.suggestion && (
              <View style={[styles.suggestion, accepted[beat.id] && styles.suggestionDone]}>
                <Text style={styles.suggestionEmoji}>{beat.suggestion.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionName}>{beat.suggestion.name}</Text>
                  <Text style={styles.suggestionTarget}>Target {formatPence(beat.suggestion.targetPence)}</Text>
                </View>
                {accepted[beat.id] && <Text style={styles.added}>✓ Added</Text>}
              </View>
            )}
          </Animated.View>
        ))}

        {/* Bottom action adapts to the conversation. */}
        <Animated.View entering={FadeIn} style={styles.actions}>
          {needsDecision ? (
            <View style={styles.actionRow}>
              <Button label={`Add ${current.suggestion!.name}`} onPress={() => accept(current)} style={{ flex: 1 }} />
              <Button label="Skip" variant="ghost" onPress={advance} style={{ flex: 1 }} />
            </View>
          ) : atEnd ? (
            <Button label="See my buckets →" onPress={() => router.push('/(tabs)/buckets')} />
          ) : (
            <Button label="Continue" variant="secondary" onPress={advance} />
          )}
        </Animated.View>

        <Text style={styles.flavor}>
          Tuned for {a.emoji} {a.title} · {a.tagline}
        </Text>

        <TabActions />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 4 },
  title: { ...type.title, color: colors.text },
  sub: { ...type.caption, color: colors.textDim },
  bubble: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  bubbleText: { ...type.body, color: colors.text, lineHeight: 21 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceHi,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(200,255,0,0.3)',
    padding: 14,
  },
  suggestionDone: { borderColor: colors.lime },
  suggestionEmoji: { fontSize: 24 },
  suggestionName: { ...type.h3, color: colors.text },
  suggestionTarget: { ...type.caption, color: colors.textDim, marginTop: 2 },
  added: { ...type.label, color: colors.lime },
  actions: { marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10 },
  flavor: { ...type.caption, color: colors.textMute, textAlign: 'center', marginTop: 4 },
});
