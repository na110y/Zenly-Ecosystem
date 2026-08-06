import { Resend } from 'resend';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
class EmailSendError extends Error {
}
class ResendEmailAdapter {
  constructor(apiKey, from) {
    __publicField(this, "apiKey", apiKey);
    __publicField(this, "from", from);
  }
  async send(input) {
    let client;
    try {
      client = new Resend(this.apiKey);
    } catch (error2) {
      throw new EmailSendError(error2 instanceof Error ? error2.message : "invalid_client_config");
    }
    const { error } = await client.emails.send({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html
    });
    if (error) {
      throw new EmailSendError(error.name);
    }
  }
}

export { ResendEmailAdapter as R };
//# sourceMappingURL=resend-email-adapter.mjs.map
