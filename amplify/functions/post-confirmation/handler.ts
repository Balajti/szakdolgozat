import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { getDBClient } from "../shared/dynamodb-client";

export const handler: PostConfirmationTriggerHandler = async (event) => {
  console.log("Post-confirmation trigger", event);

  const { sub, email } = event.request.userAttributes;
  
  // Store basic profile - will be updated by frontend after login
  const db = getDBClient();
  const timestamp = new Date().toISOString();

  try {
    // Create both profiles - frontend will use the appropriate one based on role
    // This ensures the profile exists when the user first logs in
    await db.put("StudentProfile", {
      id: sub,
      name: email?.split("@")[0] || "New Learner",
      email: email,
      level: "A1",
      streak: 0,
      vocabularyCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    console.log("Created StudentProfile", { id: sub });
  } catch (error) {
    console.error("Failed to create profile", error);
    // Don't throw - allow user to complete sign up even if profile creation fails
  }

  return event;
};
