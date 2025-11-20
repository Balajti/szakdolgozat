import type { Schema } from '../../data/resource';
import { DynamoDBDataClient, queryByIndex } from '../shared/dynamodb-client';

type DistributeAssignmentHandler = Schema['distributeAssignment']['functionHandler'];

const dbClient = new DynamoDBDataClient();

interface StudentInClass {
  studentId: string;
  studentName?: string;
  studentEmail?: string;
}

/**
 * Distributes an assignment to students
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
      // Send to all students in a class
      const studentClasses = await queryByIndex(
        'StudentClass',
        'byTeacherId',
        'teacherId',
        teacherId,
        100
      );

      // Filter by classId if provided
      const filteredClasses = classId 
        ? studentClasses.filter((sc: unknown) => (sc as { classId?: string }).classId === classId)
        : studentClasses;

      targetStudents = filteredClasses.map((sc: unknown) => ({
        studentId: (sc as { studentId: string }).studentId,
        studentName: '',
        studentEmail: ''
      }));

    } else if (studentIds && studentIds.length > 0) {
      // Send to specific students
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

    // Create notifications for each student
    const notifications = [];
    const now = new Date().toISOString();

    for (const student of targetStudents) {
      const notification = {
        recipientId: student.studentId,
        senderId: teacherId,
        senderName: teacherName,
        type: 'assignment',
        title: `New Assignment: ${assignment.title}`,
        message: notificationMessage,
        assignmentId: assignmentId,
        isRead: false,
        createdAt: now,
        updatedAt: now
      };

      const saved = await dbClient.put('Notification', notification);
      notifications.push(saved);
    }

    // Update assignment status to 'sent'
    await dbClient.update('Assignment', assignmentId, {
      status: 'sent',
      distributedAt: now,
      recipientCount: targetStudents.length
    });

    return {
      success: true,
      assignmentId: assignmentId,
      recipientCount: targetStudents.length,
      notificationIds: notifications.map(n => n.id as string)
    };

  } catch (error) {
    console.error('Error distributing assignment:', error);
    throw error;
  }
};
