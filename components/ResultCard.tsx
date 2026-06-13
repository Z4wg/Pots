import { Share, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Button } from './Button';
import { colors, radius, space, type } from '@/lib/theme';
import { getArchetype, type ArchetypeKey } from '@/lib/archetypes';

interface Props {
  archetypeKey: ArchetypeKey;
  onStart: () => void;
}

// The shareable money-personality card — the thing people screenshot.
// (Expo Go has no view-to-PNG, so Share sends text + a clean "screenshot this"
// layout stands in for the IG-story image.)
export function ResultCard({ archetypeKey, onStart }: Props) {
  const a = getArchetype(archetypeKey);

  const share = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Share.share({
      message: `I'm ${a.title} on POTS ${a.emoji} — "${a.tagline}" ${a.pctStat} What's your money type?`,
    }).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      <Animated.View entering={FadeInUp.springify().damping(15)} style={styles.card}>
        <Text style={styles.kicker}>YOU’RE</Text>
        <Text style={styles.emoji}>{a.emoji}</Text>
        <Text style={styles.title}>{a.title}</Text>
        <Text style={styles.tagline}>“{a.tagline}”</Text>
        <Text style={styles.pct}>{a.pctStat}</Text>

        <Animated.View entering={FadeIn.delay(220)} style={styles.rows}>
          <Row label="YOU ARE" value={a.youAre} />
          <Row label="SIGNATURE MOVE" value={a.signatureMove} />
          <Row label="KRYPTONITE" value={a.kryptonite} />
          <Row label="IN A POT, YOU’RE THE ONE WHO…" value={a.inAPot} />
        </Animated.View>

        <View style={styles.brandRow}>
          <Text style={styles.brand}>POTS</Text>
          <Text style={styles.brandHint}>Bet on your budget.</Text>
        </View>
      </Animated.View>

      <View style={styles.purpose}>
        <Text style={styles.purposeText}>
          ✨ Your <Text style={styles.purposeStrong}>Coach</Text> uses this to tailor the money
          tips and savings buckets it suggests for you.
        </Text>
      </View>

      <Text style={styles.screenshotHint}>Screenshot to share your card</Text>

      <View style={styles.actions}>
        <Button label="Share" variant="secondary" onPress={share} />
        <Button label="Start a POT with friends →" onPress={onStart} />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.lg, justifyContent: 'center', gap: space.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(200,255,0,0.3)',
    padding: space.xl,
    gap: 8,
    alignItems: 'center',
  },
  kicker: { ...type.label, color: colors.textDim, letterSpacing: 2 },
  emoji: { fontSize: 76, marginVertical: 4 },
  title: { ...type.hero, fontSize: 44, color: colors.lime, textAlign: 'center' },
  tagline: { ...type.h3, color: colors.text, textAlign: 'center', fontWeight: '700' },
  pct: { ...type.caption, color: colors.textMute, marginBottom: 8 },
  rows: { gap: 12, width: '100%', marginTop: 4 },
  row: { gap: 3 },
  rowLabel: { ...type.micro, color: colors.lime, letterSpacing: 0.6 },
  rowValue: { ...type.body, color: colors.text, fontWeight: '600' },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  brand: { ...type.h3, color: colors.text, fontWeight: '900', letterSpacing: 1 },
  brandHint: { ...type.caption, color: colors.textMute },
  purpose: {
    backgroundColor: 'rgba(158,123,255,0.12)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(158,123,255,0.4)',
    padding: 14,
  },
  purposeText: { ...type.caption, color: colors.textDim, lineHeight: 19, textAlign: 'center' },
  purposeStrong: { color: colors.violet, fontWeight: '800' },
  screenshotHint: { ...type.caption, color: colors.textMute, textAlign: 'center' },
  actions: { gap: 12 },
});
