export interface ReminderEmailInput {
  to: string;
  subscriptionName: string;
  nextBillingDate: string;
  daysBefore: number;
  amount: string;
}

export type ReminderEmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: "missing_resend_config" | "resend_error"; message: string };

interface ReminderEmailDependencies {
  env?: Partial<Record<"RESEND_API_KEY" | "REMINDER_EMAIL_FROM", string>>;
  fetch?: typeof fetch;
}

function getEnvValue(
  deps: ReminderEmailDependencies,
  key: "RESEND_API_KEY" | "REMINDER_EMAIL_FROM"
) {
  return deps.env?.[key] ?? process.env[key];
}

function buildText(input: ReminderEmailInput) {
  const when =
    input.daysBefore === 0 ? "今天" : `${input.daysBefore} 天后`;

  return [
    `${input.subscriptionName} 将在${when}续费。`,
    "",
    `续费日期：${input.nextBillingDate}`,
    `金额：${input.amount}`,
    "",
    "这是一封来自 SubTrack 的订阅提醒邮件。",
  ].join("\n");
}

export async function sendSubscriptionReminderEmail(
  input: ReminderEmailInput,
  deps: ReminderEmailDependencies = {}
): Promise<ReminderEmailResult> {
  const apiKey = getEnvValue(deps, "RESEND_API_KEY");
  const from = getEnvValue(deps, "REMINDER_EMAIL_FROM");

  if (!apiKey || !from) {
    return {
      ok: false,
      reason: "missing_resend_config",
      message: "Missing RESEND_API_KEY or REMINDER_EMAIL_FROM",
    };
  }

  const fetchImpl = deps.fetch ?? fetch;
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: `订阅续费提醒：${input.subscriptionName}`,
      text: buildText(input),
    }),
  });

  if (!response.ok) {
    return {
      ok: false,
      reason: "resend_error",
      message: `Resend request failed with ${response.status}`,
    };
  }

  const body = (await response.json()) as { id?: string };
  return { ok: true, id: body.id ?? "" };
}
