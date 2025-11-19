import { HttpRequest } from "@aws-sdk/protocol-http";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend-function/runtime";
import type { DataClientEnv } from "@aws-amplify/backend-function/runtime";
// Import outputs JSON (Lambda bundler should transpile this as static JSON)
import outputs from "../../../amplify_outputs.json";

import type { Schema } from "../../data/resource";

export type GraphQLResult<T> = {
  data?: T | null;
  errors?: Array<{ message?: string }> | null;
  nextToken?: string | null;
};

type GraphQLConfig = {
  endpoint: string;
  region: string;
};

type ModelGetCreateUpdate<T> = {
  get: (input: { id: string }) => Promise<GraphQLResult<T>>;
  create: (input: Record<string, unknown>) => Promise<GraphQLResult<T>>;
  update: (input: Record<string, unknown>) => Promise<GraphQLResult<T>>;
};

type ModelList<T> = {
  list: (input: { filter?: Record<string, unknown>; limit?: number; nextToken?: string }) => Promise<GraphQLResult<T[]>>;
};

type DashboardDataClient = RuntimeDataClient;
type RuntimeDataClient = {
  models: {
    StudentProfile: ModelGetCreateUpdate<Schema["StudentProfile"]["type"]>;
    TeacherProfile: ModelGetCreateUpdate<Schema["TeacherProfile"]["type"]>;
    Word: ModelGetCreateUpdate<Schema["Word"]["type"]> & ModelList<Schema["Word"]["type"]>;
    Story: Pick<ModelGetCreateUpdate<Schema["Story"]["type"]>, "create"> & ModelList<Schema["Story"]["type"]>;
    Achievement: ModelList<Schema["Achievement"]["type"]>;
    Assignment: Pick<ModelGetCreateUpdate<Schema["Assignment"]["type"]>, "create"> & ModelList<Schema["Assignment"]["type"]>;
    SubmissionSummary: ModelList<Schema["SubmissionSummary"]["type"]>;
    ClassSummary: ModelList<Schema["ClassSummary"]["type"]>;
  };
};

let dataClient: DashboardDataClient | undefined;
let graphQLConfigPromise: Promise<GraphQLConfig> | undefined;

async function getGraphQLConfig(): Promise<GraphQLConfig> {
  if (!graphQLConfigPromise) {
    graphQLConfigPromise = (async () => {
      try {
        const env = process.env as unknown as DataClientEnv;
        const { resourceConfig } = await getAmplifyDataClientConfig(env);
        const graphQL = resourceConfig?.API?.GraphQL;
        if (graphQL?.endpoint && graphQL?.region) {
          return { endpoint: graphQL.endpoint, region: graphQL.region };
        }
        throw new Error("GraphQL configuration is missing endpoint or region");
      } catch (error) {
        if (outputs?.data?.url && outputs?.data?.aws_region) {
          return { endpoint: outputs.data.url, region: outputs.data.aws_region };
        }
        const guidance =
          "Failed to resolve AppSync endpoint/region. Redeploy with latest Amplify tooling or ensure amplify_outputs.json is bundled.";
        throw new Error(`${(error as Error).message ?? error} ${guidance}`);
      }
    })();
  }
  return graphQLConfigPromise;
}

async function callGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<GraphQLResult<T>> {
  const { endpoint, region } = await getGraphQLConfig();
  const url = new URL(endpoint);
  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region,
    service: "appsync",
    sha256: Sha256,
  });
  const normalizedVariables = variables ?? {};
  const body = JSON.stringify({ query, variables: normalizedVariables });

  const httpRequest = new HttpRequest({
    method: "POST",
    headers: { "Content-Type": "application/json", host: url.host },
    hostname: url.host,
    path: url.pathname,
    body,
  });

  const signed = await signer.sign(httpRequest);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: signed.headers as Record<string, string>,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GraphQL request failed (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as { data?: T; errors?: Array<{ message?: string }> };
  return {
    data: payload.data ?? null,
    errors: payload.errors ?? null,
  };
}

export async function getDataClient(): Promise<DashboardDataClient> {
  if (!dataClient) {
    dataClient = buildGraphQLDataClient();
  }

  return dataClient;
}

function buildGraphQLDataClient(): DashboardDataClient {
  type Vars = Record<string, unknown>;
  async function call<T>(query: string, variables: Vars): Promise<GraphQLResult<T>> {
    return callGraphQL<T>(query, variables);
  }

  const fields = {
    studentProfile: "id name email birthday avatarUrl level streak vocabularyCount createdAt updatedAt",
    teacherProfile: "id name email school createdAt updatedAt",
    word: "id studentId text translation exampleSentence mastery lastReviewedAt createdAt updatedAt",
    story:
      "id studentId teacherId title content level createdAt updatedAt mode unknownWordIds highlightedWords { word offset length }",
    achievement: "id studentId title description icon achievedAt createdAt updatedAt",
    assignment: "id teacherId title dueDate level status requiredWords excludedWords createdAt updatedAt",
    submissionSummary:
      "id assignmentId teacherId studentId studentName submittedAt score unknownWords createdAt updatedAt",
    classSummary:
      "id teacherId name studentCount averageLevel completionRate mostChallengingWord createdAt updatedAt",
  } as const;

  const models: RuntimeDataClient["models"] = {
    StudentProfile: {
      async get({ id }: { id: string }) {
        const query = `query GetStudentProfile($id: ID!) { getStudentProfile(id: $id) { ${fields.studentProfile} } }`;
        const result = await call<{ getStudentProfile: Schema["StudentProfile"]["type"] | null }>(query, { id });
        return { data: result.data?.getStudentProfile ?? null, errors: result.errors ?? null };
      },
      async create(input: Record<string, unknown>) {
        const mutation = `mutation CreateStudentProfile($input: CreateStudentProfileInput!) { createStudentProfile(input: $input) { ${fields.studentProfile} } }`;
        const result = await call<{ createStudentProfile: Schema["StudentProfile"]["type"] | null }>(mutation, { input });
        return { data: result.data?.createStudentProfile ?? null, errors: result.errors ?? null };
      },
      async update(input: Record<string, unknown>) {
        const mutation = `mutation UpdateStudentProfile($input: UpdateStudentProfileInput!) { updateStudentProfile(input: $input) { ${fields.studentProfile} } }`;
        const result = await call<{ updateStudentProfile: Schema["StudentProfile"]["type"] | null }>(mutation, { input });
        return { data: result.data?.updateStudentProfile ?? null, errors: result.errors ?? null };
      },
    },
    TeacherProfile: {
      async get({ id }: { id: string }) {
        const query = `query GetTeacherProfile($id: ID!) { getTeacherProfile(id: $id) { ${fields.teacherProfile} } }`;
        const result = await call<{ getTeacherProfile: Schema["TeacherProfile"]["type"] | null }>(query, { id });
        return { data: result.data?.getTeacherProfile ?? null, errors: result.errors ?? null };
      },
      async create(input: Record<string, unknown>) {
        const mutation = `mutation CreateTeacherProfile($input: CreateTeacherProfileInput!) { createTeacherProfile(input: $input) { ${fields.teacherProfile} } }`;
        const result = await call<{ createTeacherProfile: Schema["TeacherProfile"]["type"] | null }>(mutation, { input });
        return { data: result.data?.createTeacherProfile ?? null, errors: result.errors ?? null };
      },
      async update(input: Record<string, unknown>) {
        const mutation = `mutation UpdateTeacherProfile($input: UpdateTeacherProfileInput!) { updateTeacherProfile(input: $input) { ${fields.teacherProfile} } }`;
        const result = await call<{ updateTeacherProfile: Schema["TeacherProfile"]["type"] | null }>(mutation, { input });
        return { data: result.data?.updateTeacherProfile ?? null, errors: result.errors ?? null };
      },
    },
    Word: {
      async get({ id }: { id: string }) {
        const query = `query GetWord($id: ID!) { getWord(id: $id) { ${fields.word} } }`;
        const result = await call<{ getWord: Schema["Word"]["type"] | null }>(query, { id });
        return { data: result.data?.getWord ?? null, errors: result.errors ?? null };
      },
      async create(input: Record<string, unknown>) {
        const mutation = `mutation CreateWord($input: CreateWordInput!) { createWord(input: $input) { ${fields.word} } }`;
        const result = await call<{ createWord: Schema["Word"]["type"] | null }>(mutation, { input });
        return { data: result.data?.createWord ?? null, errors: result.errors ?? null };
      },
      async update(input: Record<string, unknown>) {
        const mutation = `mutation UpdateWord($input: UpdateWordInput!) { updateWord(input: $input) { ${fields.word} } }`;
        const result = await call<{ updateWord: Schema["Word"]["type"] | null }>(mutation, { input });
        return { data: result.data?.updateWord ?? null, errors: result.errors ?? null };
      },
      async list({ filter, limit, nextToken }) {
        const query = `query ListWords($filter: ModelWordFilterInput, $limit: Int, $nextToken: String) {
          listWords(filter: $filter, limit: $limit, nextToken: $nextToken) {
            items { ${fields.word} }
            nextToken
          }
        }`;

        const result = await call<{ listWords: { items: Schema["Word"]["type"][]; nextToken?: string | null } }>(query, {
          filter,
          limit,
          nextToken,
        });

        const payload = result.data?.listWords;
        return { data: payload?.items ?? [], nextToken: payload?.nextToken ?? null, errors: result.errors ?? null };
      },
    },
    Story: {
      async create(input: Record<string, unknown>) {
        const mutation = `mutation CreateStory($input: CreateStoryInput!) { createStory(input: $input) { ${fields.story} } }`;
        const result = await call<{ createStory: Schema["Story"]["type"] | null }>(mutation, { input });
        return { data: result.data?.createStory ?? null, errors: result.errors ?? null };
      },
      async list({ filter, limit, nextToken }) {
        const query = `query ListStories($filter: ModelStoryFilterInput, $limit: Int, $nextToken: String) {
          listStories(filter: $filter, limit: $limit, nextToken: $nextToken) {
            items { ${fields.story} }
            nextToken
          }
        }`;

        const result = await call<{ listStories: { items: Schema["Story"]["type"][]; nextToken?: string | null } }>(query, {
          filter,
          limit,
          nextToken,
        });

        const payload = result.data?.listStories;
        return { data: payload?.items ?? [], nextToken: payload?.nextToken ?? null, errors: result.errors ?? null };
      },
    },
    Achievement: {
      async list({ filter, limit, nextToken }) {
        const query = `query ListAchievements($filter: ModelAchievementFilterInput, $limit: Int, $nextToken: String) {
          listAchievements(filter: $filter, limit: $limit, nextToken: $nextToken) {
            items { ${fields.achievement} }
            nextToken
          }
        }`;

        const result = await call<{ listAchievements: { items: Schema["Achievement"]["type"][]; nextToken?: string | null } }>(query, {
          filter,
          limit,
          nextToken,
        });

        const payload = result.data?.listAchievements;
        return { data: payload?.items ?? [], nextToken: payload?.nextToken ?? null, errors: result.errors ?? null };
      },
    },
    Assignment: {
      async create(input: Record<string, unknown>) {
        const mutation = `mutation CreateAssignment($input: CreateAssignmentInput!) { createAssignment(input: $input) { ${fields.assignment} } }`;
        const result = await call<{ createAssignment: Schema["Assignment"]["type"] | null }>(mutation, { input });
        return { data: result.data?.createAssignment ?? null, errors: result.errors ?? null };
      },
      async list({ filter, limit, nextToken }) {
        const query = `query ListAssignments($filter: ModelAssignmentFilterInput, $limit: Int, $nextToken: String) {
          listAssignments(filter: $filter, limit: $limit, nextToken: $nextToken) {
            items { ${fields.assignment} }
            nextToken
          }
        }`;

        const result = await call<{ listAssignments: { items: Schema["Assignment"]["type"][]; nextToken?: string | null } }>(query, {
          filter,
          limit,
          nextToken,
        });

        const payload = result.data?.listAssignments;
        return { data: payload?.items ?? [], nextToken: payload?.nextToken ?? null, errors: result.errors ?? null };
      },
    },
    SubmissionSummary: {
      async list({ filter, limit, nextToken }) {
        const query = `query ListSubmissionSummaries($filter: ModelSubmissionSummaryFilterInput, $limit: Int, $nextToken: String) {
          listSubmissionSummaries(filter: $filter, limit: $limit, nextToken: $nextToken) {
            items { ${fields.submissionSummary} }
            nextToken
          }
        }`;

        const result = await call<{ listSubmissionSummaries: { items: Schema["SubmissionSummary"]["type"][]; nextToken?: string | null } }>(query, {
          filter,
          limit,
          nextToken,
        });

        const payload = result.data?.listSubmissionSummaries;
        return { data: payload?.items ?? [], nextToken: payload?.nextToken ?? null, errors: result.errors ?? null };
      },
    },
    ClassSummary: {
      async list({ filter, limit, nextToken }) {
        const query = `query ListClassSummaries($filter: ModelClassSummaryFilterInput, $limit: Int, $nextToken: String) {
          listClassSummaries(filter: $filter, limit: $limit, nextToken: $nextToken) {
            items { ${fields.classSummary} }
            nextToken
          }
        }`;

        const result = await call<{ listClassSummaries: { items: Schema["ClassSummary"]["type"][]; nextToken?: string | null } }>(query, {
          filter,
          limit,
          nextToken,
        });

        const payload = result.data?.listClassSummaries;
        return { data: payload?.items ?? [], nextToken: payload?.nextToken ?? null, errors: result.errors ?? null };
      },
    },
  };

  return { models } as unknown as DashboardDataClient;
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
