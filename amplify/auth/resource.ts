import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from '../functions/post-confirmation/resource';
import { customMessage } from '../functions/custom-message/resource';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    fullname: {
      required: false,
      mutable: true,
    },
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
    customMessage,
  },
  access: (allow) => [
    allow.resource(postConfirmation).to(['addUserToGroup']),
  ],
  // senders: {
  //   email: {
  //     fromEmail: 'no-reply@wordnest.app',
  //   },
  // },
});
