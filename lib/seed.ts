import { backend } from './backend';

// Reset the demo to its seeded starting state (Maya safe, Tom one coffee away).
// Works against Supabase when configured, otherwise the in-memory mock.
export async function resetDemo(): Promise<void> {
  await backend.resetDemo();
}
