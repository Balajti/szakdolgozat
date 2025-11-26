import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from "@aws-sdk/client-cognito-identity-provider";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { getDBClient, setTableName } from "../shared/dynamodb-client";

const cognitoClient = new CognitoIdentityProviderClient({});
const ssmClient = new SSMClient({});
let tableNamesLoaded = false;

const loadTableNames = async () => {
  if (tableNamesLoaded) return;

  try {
    const studentParamName = process.env.STUDENT_PROFILE_TABLE_PARAM;
    const teacherParamName = process.env.TEACHER_PROFILE_TABLE_PARAM;

    if (studentParamName) {
      const { Parameter } = await ssmClient.send(new GetParameterCommand({ Name: studentParamName }));
      if (Parameter?.Value) {
        setTableName("StudentProfile", Parameter.Value);
      }
    }

    if (teacherParamName) {
      const { Parameter } = await ssmClient.send(new GetParameterCommand({ Name: teacherParamName }));
      if (Parameter?.Value) {
        setTableName("TeacherProfile", Parameter.Value);
      }
    }

    tableNamesLoaded = true;
  } catch (error) {
    console.error("Failed to load table names from SSM:", error);
    // Don't throw here, let the db operation fail if table name is missing
  }
};

export const handler: PostConfirmationTriggerHandler = async (event) => {
  console.log("Post-confirmation trigger", event);

  // Load table names from SSM first
  await loadTableNames();

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
