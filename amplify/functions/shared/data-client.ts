import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend-function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";

import type { Schema } from "../../data/resource";

export type GraphQLResult<T> = {
  data?: T | null;
  errors?: Array<{ message?: string }> | null;
  nextToken?: string | null;
};

let dataClient: ReturnType<typeof generateClient<Schema>> | undefined;
let configurePromise: Promise<void> | undefined;

function validateEnvForData(env: Record<string, string | undefined>): void {
  // Accept either new consolidated key or SSM key used in some runtimes
  const hasPrimary = !!env["AMPLIFY_DATA_ENV_CONFIG"] && env["AMPLIFY_DATA_ENV_CONFIG"] !== "{}";
  const hasSsm = !!env["AMPLIFY_SSM_ENV_CONFIG"] && env["AMPLIFY_SSM_ENV_CONFIG"] !== "{}";
  const regionOk = !!env["AWS_REGION"] || !!env["AWS_DEFAULT_REGION"];
  if (!(regionOk && (hasPrimary || hasSsm))) {
    throw new Error(
      "Amplify Data configuration missing or incomplete in Lambda environment. Add 'permissions: [data]' to defineFunction and redeploy with 'npx ampx push'.",
    );
  }
}

async function ensureAmplifyConfigured(): Promise<void> {
  if (!configurePromise) {
    configurePromise = (async () => {
      const rawEnv = process.env as Record<string, string | undefined>;
      try {
        validateEnvForData(rawEnv);
        const env = rawEnv as unknown as DataClientEnv;
        const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
        Amplify.configure(resourceConfig, libraryOptions);
      } catch (e) {
        // Re-throw with concise guidance; avoid dumping entire env for security.
        const guidance =
          "Failed to configure Amplify Data client. Ensure function is part of defineBackend, run 'npx ampx push', and that you are on latest Amplify CLI. " +
          "If using sandbox, try 'npx ampx sandbox --refreshBackend'.";
        throw new Error(`${(e as Error).message} ${guidance}`);
      }
    })();
  }
  await configurePromise;
}

export async function getDataClient() {
  await ensureAmplifyConfigured();
  if (!dataClient) {
    dataClient = generateClient<Schema>();
  }

  return dataClient;
}

export function unwrapResult<T>(result: GraphQLResult<unknown>, notFoundMessage: string): T {
  if (result.errors && result.errors.length > 0) {
    const messages = result.errors.map((error) => error?.message ?? "Unknown error");
    throw new Error(messages.join("; "));
  }

  if (!result.data) {
    throw new Error(notFoundMessage);
  }

  return result.data as T;
}

export function unwrapOptionalResult<T>(result: GraphQLResult<unknown>): T | null {
  if (result.errors && result.errors.length > 0) {
    const messages = result.errors.map((error) => error?.message ?? "Unknown error");
    throw new Error(messages.join("; "));
  }

  return (result.data as T | null | undefined) ?? null;
}

export function unwrapListResult<T>(
  result: GraphQLResult<unknown>,
): { items: T[]; nextToken: string | undefined } {
  if (result.errors && result.errors.length > 0) {
    const messages = result.errors.map((error) => error?.message ?? "Unknown error");
    throw new Error(messages.join("; "));
  }

  return {
    items: ((result.data as T[] | null | undefined) ?? []) as T[],
    nextToken: (result as GraphQLResult<T[]> & { nextToken?: string | null }).nextToken ?? undefined,
  };
}
