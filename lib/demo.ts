// Hardcoded demo identities. No auth in this build.
// Phone A runs as Maya, Phone B runs as Tom (toggle in the dev row / Squad).

export const DEMO = {
  // Users
  MAYA_ID: '11111111-1111-1111-1111-111111111111',
  TOM_ID: '22222222-2222-2222-2222-222222222222',

  // The seeded pot
  POT_ID: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  INVITE_CODE: 'POTS42',

  // Member rows
  MAYA_MEMBER_ID: 'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  TOM_MEMBER_ID: 'cccccccc-cccc-cccc-cccc-ccccccccccc2',
} as const;

export interface DemoUser {
  id: string;
  display_name: string;
  archetype: string;
  avatar_emoji: string;
}

export const MAYA: DemoUser = {
  id: DEMO.MAYA_ID,
  display_name: 'Maya',
  archetype: 'traveller',
  avatar_emoji: '🦊',
};

export const TOM: DemoUser = {
  id: DEMO.TOM_ID,
  display_name: 'Tom',
  archetype: 'socialiser',
  avatar_emoji: '🐢',
};

export const DEMO_USERS: DemoUser[] = [MAYA, TOM];

export function otherUser(id: string): DemoUser {
  return id === MAYA.id ? TOM : MAYA;
}
