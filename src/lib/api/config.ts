import { Amplify, type ResourcesConfig } from "aws-amplify";

/**
 * Central Amplify configuration. Update the environment variables below with the
 * provisioned resources once the AWS backend has been deployed.
 */
type AmplifyGraphQLAuthMode = "apiKey" | "iam" | "userPool" | "oidc" | "lambda";

const defaultGraphQLAuthMode: AmplifyGraphQLAuthMode =
  (process.env.NEXT_PUBLIC_APPSYNC_AUTH_MODE as AmplifyGraphQLAuthMode | undefined) ?? "userPool";

export const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "",
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID ?? "",
      identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID ?? "",
      loginWith: {
        oauth: {
          domain: process.env.NEXT_PUBLIC_COGNITO_OAUTH_DOMAIN ?? "",
          scopes: ["email", "openid", "profile"],
          redirectSignIn: [process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN ?? ""],
          redirectSignOut: [process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT ?? ""],
          responseType: "code",
        },
      },
    },
  },
  API: {
    GraphQL: {
      endpoint: process.env.NEXT_PUBLIC_APPSYNC_ENDPOINT ?? "",
      region: process.env.NEXT_PUBLIC_AWS_REGION ?? "eu-central-1",
      defaultAuthMode: defaultGraphQLAuthMode,
      apiKey: process.env.NEXT_PUBLIC_APPSYNC_API_KEY,
    },
  },
};

let configured = false;

export function ensureAmplifyConfigured() {
  if (configured) return;

  Amplify.configure(amplifyConfig);
  configured = true;
}
