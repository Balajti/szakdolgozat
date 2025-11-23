import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'wordnestStorage',
  access: (allow) => ({
    'avatars/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
  }),
});
