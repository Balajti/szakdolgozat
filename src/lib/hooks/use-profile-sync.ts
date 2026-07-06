import { fetchUserAttributes } from "aws-amplify/auth";

/**
 * Repairs profile records that were created with placeholder values
 * (e.g. "New Learner" without a birthday) before the post-confirmation
 * trigger could store the real registration data. Compares the stored
 * profile with the Cognito user attributes and writes back the real
 * name / birthday / email when they differ.
 */

interface SyncableProfile {
  id: string;
  name: string;
  email: string;
  birthday?: string | null;
}

const PLACEHOLDER_NAMES = new Set(["New Learner", "New Teacher"]);

function isFallbackEmail(email: string | null | undefined): boolean {
  return !email || email.endsWith(".wordnest.local");
}

export async function syncProfileFromCognito<T extends SyncableProfile>(
  profile: T,
  kind: "student" | "teacher",
): Promise<T> {
  let attributes: Awaited<ReturnType<typeof fetchUserAttributes>>;
  try {
    attributes = await fetchUserAttributes();
  } catch {
    return profile; // Not signed in with Cognito (e.g. mock mode)
  }

  // Only fix the signed-in user's own profile
  if (attributes.sub && attributes.sub !== profile.id) {
    return profile;
  }

  const updates: Record<string, string> = {};

  if (attributes.name && PLACEHOLDER_NAMES.has(profile.name)) {
    updates.name = attributes.name;
  }
  if (attributes.email && isFallbackEmail(profile.email)) {
    updates.email = attributes.email;
  }
  if (kind === "student" && attributes.birthdate && !profile.birthday) {
    updates.birthday = attributes.birthdate;
  }

  if (Object.keys(updates).length === 0) {
    return profile;
  }

  try {
    const { client } = await import("@/lib/amplify-client");
    const modelName = kind === "student" ? "StudentProfile" : "TeacherProfile";
    const mutation = /* GraphQL */ `
      mutation Update${modelName}($input: Update${modelName}Input!) {
        update${modelName}(input: $input) {
          id
        }
      }
    `;
    await client.graphql({
      query: mutation,
      variables: { input: { id: profile.id, ...updates } },
    });
    return { ...profile, ...updates };
  } catch (error) {
    console.error("Failed to sync profile from Cognito attributes:", error);
    return profile;
  }
}
