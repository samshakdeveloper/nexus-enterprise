// src/adapters/nodemailer.adapter.ts
import nodemailer, { Transporter } from "nodemailer";

import { Env } from "../config/env.js";
import { IEmailProviderPort, SendEmailPayload } from "../ports/email-provider.port.js";

export class NodemailerAdapter implements IEmailProviderPort {
  private transporter: Transporter;

  constructor(env: Env) {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }

  async send({ to, subject, html }: SendEmailPayload): Promise<void> {
    await this.transporter.sendMail({
      from: '"Nexus System" <noreply@nexus.com>',
      to,
      subject,
      html,
    });
  }
}
