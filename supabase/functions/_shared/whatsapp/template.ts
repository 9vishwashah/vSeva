// The approved Meta template "vihar_reminder" (Hindi, MARKETING). Do not change the body or the parameter order:
// it must match what Meta approved, or Meta rejects the message.
//   {{1}} = Sevak's name      {{2}} = days since the last approved Vihar (from the existing reminder run)

export const VIHAR_REMINDER = {
  name: 'vihar_reminder',
  language: 'hi',
  category: 'MARKETING',
  paramCount: 2,
  body:
    '🙏 Jai Jinendra {{1}},\n\n' +
    'Aapki pichhli Vihar Seva ko {{2}} din ho gaye hain.\n\n' +
    'Apna Vihar Seva record aur Sankalp ki progress dekhne ke liye vSeva app open karein.\n\n' +
    'Jab bhi avsar mile, Guru Bhagwant ki Seva se judne ka labh lein.\n\n' +
    'Har Kadam Mayne Rakhta Hai.\n\n' +
    'vSeva App',
} as const;

export class TemplateParamError extends Error {}

// Meta rejects body parameters with new lines, tabs or more than 4 spaces in a row (error 132012/132018).
function cleanParam(value: unknown, label: string): string {
  const text = String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();
  if (!text) throw new TemplateParamError(`${label} is empty`);
  if (text.length > 60) throw new TemplateParamError(`${label} is too long`);
  return text;
}

/** [name, days] exactly as stored in whatsapp_messages.template_params, validated. */
export function viharReminderParams(params: unknown): [string, string] {
  if (!Array.isArray(params) || params.length !== VIHAR_REMINDER.paramCount) {
    throw new TemplateParamError(`vihar_reminder needs exactly ${VIHAR_REMINDER.paramCount} parameters`);
  }
  const name = cleanParam(params[0], 'Sevak name');
  const days = cleanParam(params[1], 'Days');
  if (!/^\d{1,3}$/.test(days)) throw new TemplateParamError('Days must be a whole number');
  return [name, days];
}

/** The Cloud API request body for POST /{phone-number-id}/messages. */
export function buildTemplateMessage(opts: { to: string; templateName: string; language: string; params: unknown }) {
  if (!/^\d{10,15}$/.test(opts.to)) throw new TemplateParamError('Recipient must be digits with country code');
  const [name, days] = viharReminderParams(opts.params);
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: opts.to,
    type: 'template',
    template: {
      name: opts.templateName,
      language: { code: opts.language },
      components: [{ type: 'body', parameters: [{ type: 'text', text: name }, { type: 'text', text: days }] }],
    },
  };
}

/** What the Sevak will read, for the admin preview. */
export function renderPreview(params: unknown): string {
  const [name, days] = viharReminderParams(params);
  return VIHAR_REMINDER.body.replace('{{1}}', name).replace('{{2}}', days);
}
