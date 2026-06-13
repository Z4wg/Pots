import { Redirect } from 'expo-router';
import { useProfile } from '@/hooks/useProfile';

export default function Index() {
  const profile = useProfile();
  return <Redirect href={profile.onboarded ? '/(tabs)' : '/onboarding'} />;
}
