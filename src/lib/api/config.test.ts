import { beforeEach, describe, expect, it, vi } from "vitest";

const configureMock = vi.fn();

vi.mock("aws-amplify", () => ({
  Amplify: {
    configure: configureMock,
  },
}));

describe("Amplify configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    configureMock.mockReset();
  });

  it("configures Amplify only once", async () => {
    const configModule = await import("@/lib/api/config");

    configModule.ensureAmplifyConfigured();
    configModule.ensureAmplifyConfigured();

    expect(configureMock).toHaveBeenCalledTimes(1);
  });

  it("respects environment overrides", async () => {
    vi.stubEnv("NEXT_PUBLIC_COGNITO_USER_POOL_ID", "pool-123");
    vi.stubEnv("NEXT_PUBLIC_APPSYNC_AUTH_MODE", "apiKey");
    vi.stubEnv("NEXT_PUBLIC_APPSYNC_ENDPOINT", "https://example.appsync-api.com/graphql");
    vi.stubEnv("NEXT_PUBLIC_AWS_REGION", "eu-west-1");

    const { amplifyConfig } = await import("@/lib/api/config");

    expect(amplifyConfig.Auth?.Cognito?.userPoolId).toBe("pool-123");
    expect(amplifyConfig.API?.GraphQL?.defaultAuthMode).toBe("apiKey");
    expect(amplifyConfig.API?.GraphQL?.endpoint).toBe("https://example.appsync-api.com/graphql");
    expect(amplifyConfig.API?.GraphQL?.region).toBe("eu-west-1");
  });
});
