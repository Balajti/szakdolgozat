import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'wordnestStorage',
  access: (allow) => ({
    'avatars/{entity_id}/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});
