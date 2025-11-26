import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from '../functions/post-confirmation/resource';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    birthdate: {
      required: false,
      mutable: true,
    },
    "custom:role": {
      dataType: "String",
      mutable: true,
    },
    "custom:teacherBio": {
      dataType: "String",
      mutable: true,
    },
  },
  groups: ['students', 'teachers', 'admins'],
  accountRecovery: 'EMAIL_ONLY',
  triggers: {
    postConfirmation,
  },
});
