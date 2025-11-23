import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from "@aws-sdk/client-cognito-identity-provider";
import { getDBClient } from "../shared/dynamodb-client";

const cognitoClient = new CognitoIdentityProviderClient({});

export const handler: PostConfirmationTriggerHandler = async (event) => {
  console.log("Post-confirmation trigger", event);
  console.log("User attributes:", event.request.userAttributes);

  const { sub, email, name, birthdate } = event.request.userAttributes;
  const role = event.request.userAttributes["custom:role"] || "student";
  const teacherBio = event.request.userAttributes["custom:teacherBio"] || "";
  
  // Store profile based on role
  const db = getDBClient();
  const timestamp = new Date().toISOString();

  try {
    if (role === "student") {
      await db.put("StudentProfile", {
        id: sub,
        name: name || email?.split("@")[0] || "New Learner",
        email: email,
        birthday: birthdate || null,
        level: "A1",
        streak: 0,
        vocabularyCount: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      console.log("Created StudentProfile", { id: sub, name, birthday: birthdate });

      // Add user to students group
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        GroupName: "students",
      }));
      console.log("Added user to students group", { username: event.userName });
    } else if (role === "teacher") {
      await db.put("TeacherProfile", {
        id: sub,
        name: name || email?.split("@")[0] || "New Teacher",
        email: email,
        bio: teacherBio,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      console.log("Created TeacherProfile", { id: sub, name });

      // Add user to teachers group
      await cognitoClient.send(new AdminAddUserToGroupCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        GroupName: "teachers",
      }));
      console.log("Added user to teachers group", { username: event.userName });
    }
  } catch (error) {
    console.error("Failed to create profile or add to group", error);
    // Don't throw - allow user to complete sign up even if profile creation fails
  }

  return event;
};
