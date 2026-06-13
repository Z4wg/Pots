import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { space } from '@/lib/theme';
import { DEMO } from '@/lib/demo';

// Global actions available on every tab (§7d): start a new pot, or invite
// friends with the same invite component used in pot creation.
export function TabActions({ potId = DEMO.POT_ID }: { potId?: string }) {
  const router = useRouter();
  return (
    <View style={styles.row}>
      <Button
        label="+ New pot"
        onPress={() => router.push('/create')}
        style={styles.btn}
      />
      <Button
        label="Invite friends"
        variant="secondary"
        onPress={() => router.push(`/invite/${potId}?ctx=tab`)}
        style={styles.btn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  btn: { flex: 1 },
});
