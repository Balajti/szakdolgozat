import type { CustomMessageTriggerHandler } from "aws-lambda";

export const handler: CustomMessageTriggerHandler = async (event) => {
    console.log("Custom message trigger v2 (Default Sender)", event);

    // Handle email verification code
    if (event.triggerSource === "CustomMessage_SignUp" || event.triggerSource === "CustomMessage_ResendCode") {
        const code = event.request.codeParameter;

        event.response.emailSubject = "WordNest - Email megerősítés szükséges";
        event.response.emailMessage = `<!DOCTYPE html>
<html lang="hu">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F9FAFB;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td align="center" style="padding: 40px; background: linear-gradient(135deg, #ff7a30 0%, #f97316 100%); border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">🪺 WordNest</h1>
                            <p style="margin: 10px 0 0 0; font-size: 16px; color: #FFF9F3;">English Learning Platform</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #111827;">Üdvözlünk a WordNest-en! 🎉</h2>
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">Köszönjük, hogy regisztráltál! A regisztráció befejezéséhez kérjük, erősítsd meg az email címedet az alábbi kóddal:</p>
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td align="center" style="padding: 30px; background-color: #F3F4F6; border-radius: 8px; border: 2px dashed #ff7a30;">
                                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #6B7280; text-transform: uppercase;">Megerősítő kód</p>
                                        <p style="margin: 0; font-size: 36px; font-weight: 700; color: #ff7a30; letter-spacing: 4px; font-family: monospace;">${code}</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">Másold be ezt a kódot a regisztrációs oldalon a folytatáshoz.</p>
                            <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #6B7280;"><strong>Megjegyzés:</strong> Ez a kód 24 órán belül jár le. Ha nem te kérted ezt az emailt, nyugodtan figyelmen kívül hagyhatod.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 40px; background-color: #F9FAFB; border-radius: 0 0 12px 12px; border-top: 1px solid #E5E7EB;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #6B7280; text-align: center;">Kezdd el az angol tanulást még ma! 🚀</p>
                            <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">© 2024 WordNest. Minden jog fenntartva.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
    }

    // Handle forgot password
    if (event.triggerSource === "CustomMessage_ForgotPassword") {
        const code = event.request.codeParameter;

        event.response.emailSubject = "WordNest - Jelszó visszaállítás";
        event.response.emailMessage = `<!DOCTYPE html>
<html lang="hu">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F9FAFB;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td align="center" style="padding: 40px; background: linear-gradient(135deg, #ff7a30 0%, #f97316 100%); border-radius: 12px 12px 0 0;">
                            <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #ffffff;">🪺 WordNest</h1>
                            <p style="margin: 10px 0 0 0; font-size: 16px; color: #FFF9F3;">English Learning Platform</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #111827;">Jelszó visszaállítása 🔒</h2>
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">Jelszó visszaállítási kérést kaptunk a fiókodhoz. Használd az alábbi kódot a jelszavad visszaállításához:</p>
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td align="center" style="padding: 30px; background-color: #F3F4F6; border-radius: 8px; border: 2px dashed #ff7a30;">
                                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #6B7280; text-transform: uppercase;">Visszaállítási kód</p>
                                        <p style="margin: 0; font-size: 36px; font-weight: 700; color: #ff7a30; letter-spacing: 4px; font-family: monospace;">${code}</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">Másold be ezt a kódot a jelszó visszaállítási oldalon a folytatáshoz.</p>
                            <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #6B7280;"><strong>Megjegyzés:</strong> Ez a kód 1 órán belül jár le. Ha nem te kérted a jelszó visszaállítást, azonnal jelezd felénk!</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 40px; background-color: #F9FAFB; border-radius: 0 0 12px 12px; border-top: 1px solid #E5E7EB;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #6B7280; text-align: center;">Biztonságos tanulást! 🚀</p>
                            <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">© 2024 WordNest. Minden jog fenntartva.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
    }

    return event;
};
