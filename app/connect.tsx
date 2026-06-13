import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';
import { colors, radius, space, type } from '@/lib/theme';
import { formatPence } from '@/lib/money';
import { backend } from '@/lib/backend';
import { useIdentity } from '@/hooks/useIdentity';
import { PROVIDERS, getProvider, recentTransactions, type BankProvider } from '@/lib/bankSeed';
import type { BankConnection } from '@/lib/types';

type Phase = 'providers' | 'consent' | 'connecting' | 'connected';

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function Connect() {
  const router = useRouter();
  const me = useIdentity();
  const [phase, setPhase] = useState<Phase>('providers');
  const [provider, setProvider] = useState<BankProvider | null>(null);
  const [connection, setConnection] = useState<BankConnection | null>(null);

  const choose = (p: BankProvider) => {
    Haptics.selectionAsync().catch(() => {});
    setProvider(p);
    setPhase('consent');
  };

  const allow = async () => {
    if (!provider) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPhase('connecting');
    const existing = await backend.getBankConnection(me.id);
    const base: BankConnection =
      existing ?? {
        id: uuidv4(),
        user_id: me.id,
        provider: provider.id,
        balance_pence: 95000,
        savings_balance_pence: 30000,
        spend_by_category: { cafe: 0, going_out: 0, grocery: 0, transport: 0 },
        connected_at: new Date().toISOString(),
      };
    const conn: BankConnection = {
      ...base,
      provider: provider.id,
      connected_at: new Date().toISOString(),
    };
    // Convincing 1.6s "securely connecting…" beat.
    setTimeout(async () => {
      await backend.upsertBankConnection(conn);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setConnection(conn);
      setPhase('connected');
    }, 1600);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {phase === 'providers' && (
          <Animated.View entering={FadeIn} style={styles.block}>
            <Text style={styles.title}>Connect your bank to play</Text>
            <Text style={styles.sub}>
              POTS reads your balance to track the bet. The bank is the referee — never a person.
            </Text>
            <View style={styles.providers}>
              {PROVIDERS.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => choose(p)}
                  style={({ pressed }) => [styles.provider, pressed && styles.providerPressed]}>
                  <View style={[styles.logo, { backgroundColor: p.accent }]}>
                    <Text style={styles.logoText}>{p.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.providerName}>{p.name}</Text>
                    <Text style={[styles.providerSub, p.primary && { color: colors.lime }]}>
                      {p.subtitle}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.demoNote}>Demo only — no real bank data is used.</Text>
          </Animated.View>
        )}

        {phase === 'consent' && provider && (
          <Animated.View entering={FadeIn} style={styles.consentWrap}>
            <View style={styles.consentCard}>
              <View style={[styles.logo, styles.logoBig, { backgroundColor: provider.accent }]}>
                <Text style={[styles.logoText, { fontSize: 26 }]}>{provider.initials}</Text>
              </View>
              <Text style={styles.consentBank}>{provider.name}</Text>
              <Text style={styles.consentTitle}>POTS wants to access your account</Text>
              <View style={styles.scopeList}>
                <Scope text="Your account balance" />
                <Scope text="Your savings balance" />
                <Scope text="Recent transactions & categories" />
              </View>
              <Text style={styles.consentFine}>
                You can disconnect anytime. POTS never moves money without your say.
              </Text>
            </View>
            <View style={styles.consentActions}>
              <Button label={`Allow ${provider.name}`} onPress={allow} />
              <Button label="Deny" variant="ghost" onPress={() => setPhase('providers')} />
            </View>
          </Animated.View>
        )}

        {phase === 'connecting' && provider && (
          <View style={styles.center}>
            <Spinner accent={provider.accent} />
            <Text style={styles.connectingText}>Securely connecting to {provider.name}…</Text>
          </View>
        )}

        {phase === 'connected' && connection && (
          <Animated.View entering={FadeInDown.springify().damping(15)} style={styles.block}>
            <View style={styles.connectedHead}>
              <View style={[styles.logo, { backgroundColor: getProvider(connection.provider).accent }]}>
                <Text style={styles.logoText}>{getProvider(connection.provider).initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.connectedTitle}>{getProvider(connection.provider).name} connected ✓</Text>
                <Text style={styles.sub}>Demo transactions loaded.</Text>
              </View>
            </View>

            <View style={styles.balanceRow}>
              <View style={styles.balanceBox}>
                <Text style={styles.balanceLabel}>BALANCE</Text>
                <Text style={styles.balanceValue}>{formatPence(connection.balance_pence)}</Text>
              </View>
              <View style={styles.balanceBox}>
                <Text style={styles.balanceLabel}>SAVINGS</Text>
                <Text style={[styles.balanceValue, { color: colors.lime }]}>
                  {formatPence(connection.savings_balance_pence)}
                </Text>
              </View>
            </View>

            <Text style={styles.txnHeader}>Recent transactions</Text>
            <View style={styles.txnList}>
              {recentTransactions(me.id).map((t) => {
                const income = t.amount_pence > 0;
                return (
                  <View key={t.id} style={styles.txnRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnMerchant}>{t.merchant}</Text>
                      <Text style={styles.txnCat}>{t.category}</Text>
                    </View>
                    <Text style={[styles.txnAmount, { color: income ? colors.lime : colors.text }]}>
                      {income ? '+' : '−'}
                      {formatPence(Math.abs(t.amount_pence))}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Button label="Continue →" onPress={() => router.replace('/create')} />
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Scope({ text }: { text: string }) {
  return (
    <View style={styles.scope}>
      <Text style={styles.scopeDot}>✓</Text>
      <Text style={styles.scopeText}>{text}</Text>
    </View>
  );
}

function Spinner({ accent }: { accent: string }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value * 360}deg` }] }));
  return <Animated.View style={[styles.spinner, { borderColor: accent, borderTopColor: 'transparent' }, style]} />;
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md, flexGrow: 1 },
  block: { gap: space.md },
  title: { ...type.title, color: colors.text },
  sub: { ...type.body, color: colors.textDim },
  providers: { gap: 10, marginTop: 4 },
  provider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  providerPressed: { borderColor: colors.lime, backgroundColor: colors.surfaceHi },
  logo: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoBig: { width: 64, height: 64, borderRadius: 18 },
  logoText: { color: colors.white, fontWeight: '900', fontSize: 18 },
  providerName: { ...type.h3, color: colors.text },
  providerSub: { ...type.caption, color: colors.textDim, marginTop: 2 },
  chevron: { ...type.title, color: colors.textMute },
  demoNote: { ...type.caption, color: colors.textMute, textAlign: 'center', marginTop: 8 },
  // consent
  consentWrap: { flex: 1, gap: space.lg, justifyContent: 'center' },
  consentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
    alignItems: 'center',
    gap: 10,
  },
  consentBank: { ...type.h3, color: colors.text },
  consentTitle: { ...type.h2, color: colors.text, textAlign: 'center', marginTop: 4 },
  scopeList: { gap: 8, alignSelf: 'stretch', marginTop: 10 },
  scope: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scopeDot: { color: colors.lime, fontWeight: '900' },
  scopeText: { ...type.body, color: colors.textDim },
  consentFine: { ...type.caption, color: colors.textMute, textAlign: 'center', marginTop: 8 },
  consentActions: { gap: 12 },
  // connecting
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 80 },
  spinner: { width: 44, height: 44, borderRadius: 22, borderWidth: 4 },
  connectingText: { ...type.body, color: colors.textDim },
  // connected
  connectedHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  connectedTitle: { ...type.h3, color: colors.lime },
  balanceRow: { flexDirection: 'row', gap: 12 },
  balanceBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 4,
  },
  balanceLabel: { ...type.micro, color: colors.textMute },
  balanceValue: { ...type.h2, color: colors.text },
  txnHeader: { ...type.label, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 },
  txnList: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txnMerchant: { ...type.body, color: colors.text, fontWeight: '600' },
  txnCat: { ...type.caption, color: colors.textMute, marginTop: 2 },
  txnAmount: { ...type.h3 },
});
