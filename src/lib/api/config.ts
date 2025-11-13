import { Amplify, type ResourcesConfig } from "aws-amplify";
import outputs from "../../../amplify_outputs.json" assert { type: "json" };

/**
 * Central Amplify configuration. Update the environment variables below with the
 * provisioned resources once the AWS backend has been deployed.
 */
type AmplifyGraphQLAuthMode = "apiKey" | "iam" | "userPool" | "oidc" | "lambda";

function mapAuthMode(input?: string): AmplifyGraphQLAuthMode {
  switch (input) {
    case "API_KEY":
    case "apiKey":
      return "apiKey";
    case "AWS_IAM":
    case "iam":
      return "iam";
    case "AMAZON_COGNITO_USER_POOLS":
    case "userPool":
    default:
      return "userPool";
  }
}

const defaultGraphQLAuthMode: AmplifyGraphQLAuthMode = mapAuthMode(
  process.env.NEXT_PUBLIC_APPSYNC_AUTH_MODE || (outputs?.data?.default_authorization_type as string | undefined),
);

const envOr = (envName: string, fallback?: string) => process.env[envName] || fallback || "";

const resolvedConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: envOr("NEXT_PUBLIC_COGNITO_USER_POOL_ID", outputs?.auth?.user_pool_id),
      userPoolClientId: envOr("NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID", outputs?.auth?.user_pool_client_id),
      identityPoolId: envOr("NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID", outputs?.auth?.identity_pool_id),
      // Oauth is optional; include only if domain provided via env
      ...(process.env.NEXT_PUBLIC_COGNITO_OAUTH_DOMAIN
        ? {
            loginWith: {
              oauth: {
                domain: process.env.NEXT_PUBLIC_COGNITO_OAUTH_DOMAIN,
                scopes: ["email", "openid", "profile"],
                redirectSignIn: [envOr("NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN")],
                redirectSignOut: [envOr("NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT")],
                responseType: "code",
              },
            },
          }
        : {}),
    },
  },
  API: {
    GraphQL: {
      endpoint: envOr("NEXT_PUBLIC_APPSYNC_ENDPOINT", outputs?.data?.url),
      region: envOr("NEXT_PUBLIC_AWS_REGION", outputs?.data?.aws_region || "eu-central-1"),
      defaultAuthMode: defaultGraphQLAuthMode,
      apiKey: process.env.NEXT_PUBLIC_APPSYNC_API_KEY,
    },
  },
};

let configured = false;

export function ensureAmplifyConfigured() {
  if (configured) return;

  Amplify.configure(resolvedConfig);
  configured = true;
}
