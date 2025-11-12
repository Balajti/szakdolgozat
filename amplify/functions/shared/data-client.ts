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

async function ensureAmplifyConfigured(): Promise<void> {
  if (!configurePromise) {
    configurePromise = (async () => {
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(process.env as DataClientEnv);
      Amplify.configure(resourceConfig, libraryOptions);
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
