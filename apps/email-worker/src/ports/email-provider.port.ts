// src/ports/email-provider.port.ts

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

export interface IEmailProviderPort {
  send(payload: SendEmailPayload): Promise<void>;
}
