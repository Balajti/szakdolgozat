// Email template generator for assignment notifications
// Different templates for each assignment type

interface Assignment {
    id: string;
    title: string;
    assignmentType: 'basic' | 'fill_blanks' | 'word_matching' | 'custom_words';
    dueDate: string;
    level: string;
    requiredWords?: string[];
    matchingWords?: string[];
    storyContent?: string;
}

interface EmailTemplateData {
    studentName: string;
    teacherName: string;
    assignment: Assignment;
    assignmentUrl: string;
}


/**
 * Base HTML email template with WordNest branding
 */
function getBaseTemplate(content: string, subject: string): string {
    return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F9FAFB;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px; background: linear-gradient(135deg, #ff7a30 0%, #f97316 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">🪺 WordNest</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; color: #FFF9F3;">English Learning Platform</p>
            </td>
          </tr>
          <!-- Content -->
          ${content}
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #F9FAFB; border-radius: 0 0 12px 12px; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6B7280; text-align: center;">Sok sikert a feladathoz! 📚</p>
              <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">© 2025 WordNest. Minden jog fenntartva.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Template for basic assignment (story reading)
 */
function getBasicAssignmentTemplate(data: EmailTemplateData): string {
    const { studentName, teacherName, assignment, assignmentUrl } = data;
    const dueDate = new Date(assignment.dueDate).toLocaleDateString('hu-HU');

    const content = `
    <tr>
      <td style="padding: 40px;">
        <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #111827;">
          📖 Új Olvasási Feladat
        </h2>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">
          Szia ${studentName}!
        </p>
        <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">
          ${teacherName} tanár új olvasási feladatot küldött neked: <strong>${assignment.title}</strong>
        </p>
        
        <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 30px; background-color: #FFF7ED; border-radius: 8px; border-left: 4px solid #ff7a30;">
              <p style="margin: 0 0 15px 0; font-size: 14px; color: #92400E; font-weight: 600; text-transform: uppercase;">Feladat részletei</p>
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1F2937;">
                <strong>Típus:</strong> Szövegértés
              </p>
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1F2937;">
                <strong>Szint:</strong> ${assignment.level}
              </p>
              <p style="margin: 0; font-size: 16px; color: #1F2937;">
                <strong>Határidő:</strong> ${dueDate}
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" style="width: 100%; margin: 30px 0;">
          <tr>
            <td align="center">
              <a href="${assignmentUrl}" style="display: inline-block; padding: 16px 32px; background-color: #ff7a30; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                📚 Feladat megnyitása
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #6B7280;">
          Kattints a gombra a feladat elolvasásához és megoldásához. Sok sikert! 🌟
        </p>
      </td>
    </tr>
  `;

    return getBaseTemplate(content, `Új feladat: ${assignment.title}`);
}

/**
 * Template for fill-in-the-blanks assignment
 */
function getFillBlanksTemplate(data: EmailTemplateData): string {
    const { studentName, teacherName, assignment, assignmentUrl } = data;
    const dueDate = new Date(assignment.dueDate).toLocaleDateString('hu-HU');
    const wordCount = assignment.requiredWords?.length || 0;

    const content = `
    <tr>
      <td style="padding: 40px;">
        <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #111827;">
          🧩 Új Szókitöltős Feladat
        </h2>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">
          Szia ${studentName}!
        </p>
        <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">
          ${teacherName} tanár új szókitöltős feladatot küldött neked: <strong>${assignment.title}</strong>
        </p>
        
        <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 30px; background-color: #EFF6FF; border-radius: 8px; border-left: 4px solid #3B82F6;">
              <p style="margin: 0 0 15px 0; font-size: 14px; color: #1E40AF; font-weight: 600; text-transform: uppercase;">Feladat részletei</p>
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1F2937;">
                <strong>Típus:</strong> Szókitöltés
              </p>
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1F2937;">
                <strong>Hiányzó szavak:</strong> ${wordCount} db
              </p>
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1F2937;">
                <strong>Szint:</strong> ${assignment.level}
              </p>
              <p style="margin: 0; font-size: 16px; color: #1F2937;">
                <strong>Határidő:</strong> ${dueDate}
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" style="width: 100%; margin: 30px 0;">
          <tr>
            <td align="center">
              <a href="${assignmentUrl}" style="display: inline-block; padding: 16px 32px; background-color: #3B82F6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                🧩 Feladat megkezdése
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #6B7280;">
          Töltsd ki a hiányzó szavakat a szövegben! Figyelmesen olvasd el minden mondatot. 💪
        </p>
      </td>
    </tr>
  `;

    return getBaseTemplate(content, `Új szókitöltős feladat: ${assignment.title}`);
}

/**
 * Template for word matching assignment
 */
function getWordMatchingTemplate(data: EmailTemplateData): string {
    const { studentName, teacherName, assignment, assignmentUrl } = data;
    const dueDate = new Date(assignment.dueDate).toLocaleDateString('hu-HU');
    const pairCount = assignment.matchingWords?.length || 0;

    const content = `
    <tr>
      <td style="padding: 40px;">
        <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #111827;">
          🔗 Új Szópárosítós Feladat
        </h2>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">
          Szia ${studentName}!
        </p>
        <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">
          ${teacherName} tanár új szópárosítós feladatot küldött neked: <strong>${assignment.title}</strong>
        </p>
        
        <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 30px; background-color: #F0FDF4; border-radius: 8px; border-left: 4px solid #10B981;">
              <p style="margin: 0 0 15px 0; font-size: 14px; color: #065F46; font-weight: 600; text-transform: uppercase;">Feladat részletei</p>
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1F2937;">
                <strong>Típus:</strong> Szópárosítás
              </p>
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1F2937;">
                <strong>Szópárok száma:</strong> ${pairCount} pár
              </p>
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1F2937;">
                <strong>Szint:</strong> ${assignment.level}
              </p>
              <p style="margin: 0; font-size: 16px; color: #1F2937;">
                <strong>Határidő:</strong> ${dueDate}
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" style="width: 100%; margin: 30px 0;">
          <tr>
            <td align="center">
              <a href="${assignmentUrl}" style="display: inline-block; padding: 16px 32px; background-color: #10B981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                🔗 Feladat megkezdése
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #6B7280;">
          Párosítsd össze a szavakat a megfelelő jelentésükkel! Gondolkodj el minden szó használatán. 🎯
        </p>
      </td>
    </tr>
  `;

    return getBaseTemplate(content, `Új szópárosítós feladat: ${assignment.title}`);
}

/**
 * Template for custom words assignment
 */
function getCustomWordsTemplate(data: EmailTemplateData): string {
    const { studentName, teacherName, assignment, assignmentUrl } = data;
    const dueDate = new Date(assignment.dueDate).toLocaleDateString('hu-HU');
    const wordCount = assignment.requiredWords?.length || 0;

    const content = `
    <tr>
      <td style="padding: 40px;">
        <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #111827;">
          ⭐ Új Szógyakorlás Feladat
        </h2>
        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">
          Szia ${studentName}!
        </p>
        <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">
          ${teacherName} tanár új szógyakorlás feladatot küldött neked: <strong>${assignment.title}</strong>
        </p>
        
        <table role="presentation" style="width: 100%; margin: 30px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 30px; background-color: #FDF4FF; border-radius: 8px; border-left: 4px solid #A855F7;">
              <p style="margin: 0 0 15px 0; font-size: 14px; color: #6B21A8; font-weight: 600; text-transform: uppercase;">Feladat részletei</p>
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1F2937;">
                <strong>Típus:</strong> Egyedi szókészlet
              </p>
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1F2937;">
                <strong>Szavak száma:</strong> ${wordCount} db
              </p>
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #1F2937;">
                <strong>Szint:</strong> ${assignment.level}
              </p>
              <p style="margin: 0; font-size: 16px; color: #1F2937;">
                <strong>Határidő:</strong> ${dueDate}
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" style="width: 100%; margin: 30px 0;">
          <tr>
            <td align="center">
              <a href="${assignmentUrl}" style="display: inline-block; padding: 16px 32px; background-color: #A855F7; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                ⭐ Feladat megkezdése
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #6B7280;">
          Gyakorold az egyedi szókészletet a tanárod által kiválasztott szavakkal! 🚀
        </p>
      </td>
    </tr>
  `;

    return getBaseTemplate(content, `Új szógyakorlás: ${assignment.title}`);
}

/**
 * Main function to generate email HTML based on assignment type
 */
export function generateAssignmentEmail(data: EmailTemplateData): { html: string; subject: string } {
    const { assignment } = data;

    let html: string;
    let subject: string;

    switch (assignment.assignmentType) {
        case 'basic':
            html = getBasicAssignmentTemplate(data);
            subject = `📖 Új olvasási feladat: ${assignment.title}`;
            break;
        case 'fill_blanks':
            html = getFillBlanksTemplate(data);
            subject = `🧩 Új szókitöltős feladat: ${assignment.title}`;
            break;
        case 'word_matching':
            html = getWordMatchingTemplate(data);
            subject = `🔗 Új szópárosítós feladat: ${assignment.title}`;
            break;
        case 'custom_words':
            html = getCustomWordsTemplate(data);
            subject = `⭐ Új szógyakorlás: ${assignment.title}`;
            break;
        default:
            html = getBasicAssignmentTemplate(data);
            subject = `Új feladat: ${assignment.title}`;
    }

    return { html, subject };
}

/**
 * Generate plain text version for email clients that don't support HTML
 */
export function generatePlainTextEmail(data: EmailTemplateData): string {
    const { studentName, teacherName, assignment, assignmentUrl } = data;
    const dueDate = new Date(assignment.dueDate).toLocaleDateString('hu-HU');

    return `
Szia ${studentName}!

${teacherName} tanár új feladatot küldött neked: ${assignment.title}

Típus: ${getAssignmentTypeLabel(assignment.assignmentType)}
Szint: ${assignment.level}
Határidő: ${dueDate}

Feladat megnyitása:
${assignmentUrl}

WordNest - English Learning Platform
© 2025 WordNest. Minden jog fenntartva.
  `.trim();
}

function getAssignmentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
        'basic': 'Szövegértés',
        'fill_blanks': 'Szókitöltés',
        'word_matching': 'Szópárosítás',
        'custom_words': 'Egyedi szókészlet',
    };
    return labels[type] || 'Feladat';
}
