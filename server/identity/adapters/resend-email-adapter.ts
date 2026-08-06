import { Resend } from 'resend'
import type { EmailAdapter, SendEmailInput } from './email-adapter'

export class EmailSendError extends Error {}

export class ResendEmailAdapter implements EmailAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(input: SendEmailInput): Promise<void> {
    let client: Resend
    try {
      client = new Resend(this.apiKey)
    } catch (error) {
      throw new EmailSendError(error instanceof Error ? error.message : 'invalid_client_config')
    }

    const { error } = await client.emails.send({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    })

    if (error) {
      throw new EmailSendError(error.name)
    }
  }
}
