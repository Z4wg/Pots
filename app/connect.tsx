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
import { completeOnboarding } from '@/hooks/useProfile';
import {
  PROVIDERS,
  getProvider,
  recentTransactions,
  CONNECT_ACCOUNTS,
  type BankProvider,
} from '@/lib/bankSeed';
import type { BankConnection } from '@/lib/types';

type Phase = 'providers' | 'consent' | 'accounts' | 'connecting' | 'connected';

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Brand mark — a Revolut-style monogram. Bank-auth styling without the real asset.
function BankMark({ provider, size = 44 }: { provider: BankProvider; size?: number }) {
  return (
    <View
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: provider.accent },
      ]}>
      <Text style={[styles.markText, { fontSize: size * 0.42 }]}>{provider.initials}</Text>
    </View>
  );
}

export default function Connect() {
  const router = useRouter();
  const me = useIdentity();
  const [phase, setPhase] = useState<Phase>('providers');
  const [provider, setProvider] = useState<BankProvider | null>(null);
  const [accountId, setAccountId] = useState<string>('savings');
  const [connection, setConnection] = useState<BankConnection | null>(null);

  // ✕ — exit the connect flow. From create → back; from onboarding → into the app.
  const exitConnect = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const choose = (p: BankProvider) => {
    Haptics.selectionAsync().catch(() => {});
    setProvider(p);
    setPhase('consent');
  };

  const allow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPhase('accounts');
  };

  const connectAccount = async () => {
    if (!provider) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPhase('connecting');
    const personal = CONNECT_ACCOUNTS.find((a) => a.kind === 'personal')!;
    const savings = CONNECT_ACCOUNTS.find((a) => a.kind === 'savings')!;
    const tracked = CONNECT_ACCOUNTS.find((a) => a.id === accountId) ?? savings;
    const existing = await backend.getBankConnection(me.id);
    const conn: BankConnection = {
      id: existing?.id ?? uuidv4(),
      user_id: me.id,
      provider: provider.id,
      balance_pence: personal.balance_pence,
      savings_balance_pence: tracked.balance_pence,
      spend_by_category:
        existing?.spend_by_category ?? { cafe: 0, going_out: 0, grocery: 0, transport: 0 },
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
    <Screen onClose={exitConnect}>
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
                  <BankMark provider={p} />
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

        {/* Fake OAuth consent — styled like a bank auth page. */}
        {phase === 'consent' && provider && (
          <Animated.View entering={FadeIn} style={styles.consentWrap}>
            <View style={[styles.authBar, { backgroundColor: provider.accent }]}>
              <BankMark provider={provider} size={30} />
              <Text style={styles.authBarText}>{provider.name} · Secure sign-in</Text>
              <Text style={styles.authLock}>🔒</Text>
            </View>
            <View style={styles.consentCard}>
              <Text style={styles.consentTitle}>POTS wants to access your account</Text>
              <Text style={styles.consentBank}>Signed in as {me.display_name.toLowerCase()}@{provider.id}.com</Text>
              <View style={styles.scopeList}>
                <Scope text="View your account balance" />
                <Scope text="View your savings balance" />
                <Scope text="View recent transactions & categories" />
              </View>
              <Text style={styles.consentFine}>
                POTS can read balances to referee the bet. It can never move money.
              </Text>
            </View>
            <View style={styles.consentActions}>
              <Button label="Allow access" onPress={allow} />
              <Button label="Deny" variant="ghost" onPress={() => setPhase('providers')} />
            </View>
          </Animated.View>
        )}

        {/* Account selection — Savings is what POTS tracks. */}
        {phase === 'accounts' && provider && (
          <Animated.View entering={FadeIn} style={styles.block}>
            <View style={[styles.authBar, { backgroundColor: provider.accent }]}>
              <BankMark provider={provider} size={30} />
              <Text style={styles.authBarText}>{provider.name} · Choose account</Text>
              <Text style={styles.authLock}>🔒</Text>
            </View>
            <Text style={styles.title}>Which account?</Text>
            <Text style={styles.sub}>Pick the account POTS should track for this pot.</Text>
            <View style={{ gap: 10 }}>
              {CONNECT_ACCOUNTS.map((a) => {
                const on = accountId === a.id;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => {
                      setAccountId(a.id);
                      Haptics.selectionAsync().catch(() => {});
                    }}
                    style={[styles.account, on && styles.accountOn]}>
                    <View style={[styles.radio, on && styles.radioOn]}>
                      {on && <View style={styles.radioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.accountHead}>
                        <Text style={styles.accountLabel}>{a.label}</Text>
                        {a.kind === 'savings' && <Text style={styles.trackTag}>TRACKED</Text>}
                      </View>
                      <Text style={styles.accountSub}>{a.subtitle}</Text>
                    </View>
                    <Text style={styles.accountBalance}>{formatPence(a.balance_pence)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Button label="Connect account" onPress={connectAccount} />
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
              <BankMark provider={getProvider(connection.provider)} />
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
              <View style={[styles.balanceBox, styles.balanceBoxTracked]}>
                <Text style={styles.balanceLabel}>SAVINGS · TRACKED</Text>
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
  mark: { alignItems: 'center', justifyContent: 'center' },
  markText: { color: colors.white, fontWeight: '900' },
  providerName: { ...type.h3, color: colors.text },
  providerSub: { ...type.caption, color: colors.textDim, marginTop: 2 },
  chevron: { ...type.title, color: colors.textMute },
  demoNote: { ...type.caption, color: colors.textMute, textAlign: 'center', marginTop: 8 },
  // fake OAuth chrome
  authBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  authBarText: { ...type.label, color: colors.white, flex: 1, fontWeight: '800' },
  authLock: { fontSize: 14 },
  // consent
  consentWrap: { gap: space.md },
  consentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
    gap: 10,
  },
  consentBank: { ...type.caption, color: colors.textMute },
  consentTitle: { ...type.h2, color: colors.text },
  scopeList: { gap: 10, marginTop: 6 },
  scope: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scopeDot: { color: colors.lime, fontWeight: '900' },
  scopeText: { ...type.body, color: colors.textDim },
  consentFine: { ...type.caption, color: colors.textMute, marginTop: 8 },
  consentActions: { gap: 12 },
  // accounts
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  accountOn: { borderColor: colors.lime, backgroundColor: colors.surfaceHi },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.lime },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.lime },
  accountHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accountLabel: { ...type.h3, color: colors.text },
  trackTag: {
    ...type.micro,
    color: colors.black,
    backgroundColor: colors.lime,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  accountSub: { ...type.caption, color: colors.textMute, marginTop: 2 },
  accountBalance: { ...type.h3, color: colors.text },
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
  balanceBoxTracked: { borderColor: 'rgba(200,255,0,0.4)' },
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
