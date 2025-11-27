import { randomUUID } from 'crypto';
import type { Schema } from '../../data/resource';
import { DynamoDBDataClient, queryByIndex } from '../shared/dynamodb-client';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { generateAssignmentEmail, generatePlainTextEmail } from './email-templates';

type DistributeAssignmentHandler = Schema['distributeAssignment']['functionHandler'];

const dbClient = new DynamoDBDataClient();
const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Email configuration
const FROM_EMAIL = process.env.FROM_EMAIL || 'wordnest.language.learn@gmail.com';
const BASE_URL = process.env.BASE_URL || 'https://your-app.com';

interface StudentInClass {
  studentId: string;
  studentName?: string;
  studentEmail?: string;
}

// Robust ID generator
const generateId = () => {
  // 1. Try global crypto (Node 19+)
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  // 2. Try imported crypto
  try {
    if (typeof randomUUID === 'function') {
      return randomUUID();
    }
  } catch (e) {
    console.warn('crypto.randomUUID failed, using fallback', e);
  }

  // 3. Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Distributes an assignment to students
 * Sends HTML emails with assignment links
 * Creates in-app notifications for each student
 * Updates assignment status to 'sent'
 */
export const handler: DistributeAssignmentHandler = async (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const {
    assignmentId,
    teacherId,
    studentIds,
    classId,
    sendToAll
  } = event.arguments;

  try {
    // Fetch the assignment
    const assignment = await dbClient.get('Assignment', assignmentId);
    if (!assignment) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }

    // Verify teacher owns this assignment
    if (assignment.teacherId !== teacherId) {
      throw new Error('Unauthorized: You can only distribute your own assignments');
    }

    // Get teacher profile for sender name
    const teacherProfile = await dbClient.get('TeacherProfile', teacherId);
    const teacherName = teacherProfile?.name as string || 'Your Teacher';

    // Determine which students to send to
    let targetStudents: StudentInClass[] = [];

    if (sendToAll && classId) {
      // Send to all students in a class - get from ClassGroup.students array
      const classGroup = await dbClient.get('ClassGroup', classId);

      if (classGroup && classGroup.students) {
        const students = classGroup.students as Array<{ id: string; name: string; email: string }>;
        targetStudents = students.map((student) => ({
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
        }));
      }
    } else if (studentIds && studentIds.length > 0) {
      // Send to specific students - need to find their emails
      // For now, this assumes students are in a class, you may need to adjust
      targetStudents = studentIds.map((id: string) => ({
        studentId: id,
        studentName: '',
        studentEmail: ''
      }));
    } else {
      throw new Error('Must provide either studentIds or set sendToAll with classId');
    }

    if (targetStudents.length === 0) {
      throw new Error('No students found to send assignment to');
    }

    console.log(`Distributing assignment to ${targetStudents.length} students`);

    // Create notification message based on assignment type
    let notificationMessage = `New assignment: ${assignment.title}`;

    if (assignment.assignmentType === 'fill_blanks') {
      const wordCount = (assignment.requiredWords as string[])?.length || 0;
      notificationMessage += ` - Fill in ${wordCount} missing words`;
    } else if (assignment.assignmentType === 'word_matching') {
      const matchCount = (assignment.matchingWords as string[])?.length || 0;
      notificationMessage += ` - Match ${matchCount} words`;
    } else if (assignment.assignmentType === 'custom_words') {
      notificationMessage += ' - Practice with custom vocabulary';
    }

    notificationMessage += ` | Due: ${assignment.dueDate}`;

    // Send emails and create notifications for each student
    const notifications = [];
    const emailResults = [];
    const now = new Date().toISOString();
    const assignmentUrl = `${BASE_URL}/assignment/${assignmentId}`;

    for (const student of targetStudents) {
      // Create notification (in-app)
      const notificationId = generateId();
      if (!notificationId) {
        console.error('Failed to generate ID for notification');
        throw new Error('Failed to generate ID for notification');
      }

      const notification = {
        id: notificationId, // Generate unique ID for DynamoDB
        recipientId: student.studentId,
        senderId: teacherId,
        senderName: teacherName,
        type: 'assignment',
        title: `New Assignment: ${assignment.title}`,
        message: notificationMessage,
        assignmentId: assignmentId,
        isRead: false,
      };

      console.log('Creating notification:', JSON.stringify(notification));
      const saved = await dbClient.put('Notification', notification);
      notifications.push(saved);

      // Send email if student has email
      if (student.studentEmail && student.studentEmail.trim()) {
        try {
          const emailData = {
            studentName: student.studentName || 'Student',
            teacherName,
            assignment: {
              id: assignmentId,
              title: assignment.title as string,
              assignmentType: assignment.assignmentType as any,
              dueDate: assignment.dueDate as string,
              level: assignment.level as string,
              requiredWords: assignment.requiredWords as string[] | undefined,
              matchingWords: assignment.matchingWords as string[] | undefined,
              storyContent: assignment.storyContent as string | undefined,
            },
            assignmentUrl,
          };

          const { html, subject } = generateAssignmentEmail(emailData);
          const plainText = generatePlainTextEmail(emailData);

          const sendEmailCommand = new SendEmailCommand({
            Source: FROM_EMAIL,
            Destination: {
              ToAddresses: [student.studentEmail],
            },
            Message: {
              Subject: {
                Data: subject,
                Charset: 'UTF-8',
              },
              Body: {
                Html: {
                  Data: html,
                  Charset: 'UTF-8',
                },
                Text: {
                  Data: plainText,
                  Charset: 'UTF-8',
                },
              },
            },
          });

          await sesClient.send(sendEmailCommand);
          emailResults.push({ email: student.studentEmail, status: 'sent' });
          console.log(`Email sent to ${student.studentEmail}`);
        } catch (emailError) {
          console.error(`Failed to send email to ${student.studentEmail}:`, emailError);
          emailResults.push({ email: student.studentEmail, status: 'failed', error: String(emailError) });
        }
      }
    }

    // Update assignment status to 'sent'
    await dbClient.update('Assignment', assignmentId, {
      status: 'sent',
      distributedAt: now,
      recipientCount: targetStudents.length
    });

    console.log(`Assignment distributed successfully. Emails sent: ${emailResults.filter(r => r.status === 'sent').length}/${emailResults.length}`);

    return {
      success: true,
      assignmentId: assignmentId,
      recipientCount: targetStudents.length,
      notificationIds: notifications.map(n => n.id as string),
      emailsSent: emailResults.filter(r => r.status === 'sent').length,
      emailsFailed: emailResults.filter(r => r.status === 'failed').length,
    };

  } catch (error) {
    console.error('Error distributing assignment:', error);
    throw error;
  }
};
