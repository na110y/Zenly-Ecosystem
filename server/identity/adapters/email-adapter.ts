export interface SendEmailInput {
  to: string
  subject: string
  html: string
}

export interface EmailAdapter {
  send(input: SendEmailInput): Promise<void>
}
