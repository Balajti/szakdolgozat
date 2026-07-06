import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from "@aws-sdk/client-cognito-identity-provider";
import { getDataClient } from "../shared/data-client";

const cognitoClient = new CognitoIdentityProviderClient({});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  console.log("Post-confirmation trigger for user:", event.userName);
  console.log("User attributes:", event.request.userAttributes);

  const { sub, email, name, birthdate } = event.request.userAttributes;
  const role = event.request.userAttributes["custom:role"] || "student";
  const teacherBio = event.request.userAttributes["custom:teacherBio"] || "";

  const fallbackName = email?.split("@")[0];

  try {
    const client = await getDataClient();

    if (role === "teacher") {
      const result = await client.models.TeacherProfile.create({
        id: sub,
        name: name || fallbackName || "New Teacher",
        email,
        bio: teacherBio,
      });
      if (result.errors?.length) {
        throw new Error(result.errors.map((e) => e?.message).join("; "));
      }
      console.log("Created TeacherProfile", { id: sub, name });

      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        GroupName: "teachers",
      }));
      console.log("Added user to teachers group", { username: event.userName });
    } else {
      const result = await client.models.StudentProfile.create({
        id: sub,
        name: name || fallbackName || "New Learner",
        email,
        birthday: birthdate || null,
        level: "A1",
        streak: 0,
        vocabularyCount: 0,
      });
      if (result.errors?.length) {
        throw new Error(result.errors.map((e) => e?.message).join("; "));
      }
      console.log("Created StudentProfile", { id: sub, name, birthday: birthdate });

      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        GroupName: "students",
      }));
      console.log("Added user to students group", { username: event.userName });
    }
  } catch (error) {
    console.error("Failed to create profile or add to group", error);
    // Don't throw - allow user to complete sign up even if profile creation fails
  }

  return event;
};
