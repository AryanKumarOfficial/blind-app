import {createTransport} from "nodemailer";

/**
 * An instance of a transporter created using the `createTransport` method of the nodemailer package.
 * This transporter is configured to use the Gmail service for sending emails.
 *
 * Properties:
 * - `service`: Specifies the email service provider as "Gmail".
 * - `auth`: Authentication object containing:
 *    - `user`: The email address of the sender, retrieved from the environment variable `EMAIL_USER`.
 *    - `pass`: The password or app-specific password for the email account, retrieved from the environment variable `EMAIL_PASSWORD`.
 *
 * This transporter is used to send emails through Gmail's SMTP servers.
 */
export const transporter = createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});