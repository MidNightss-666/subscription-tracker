import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sendSubscriptionReminderEmail } from "../src/lib/email/reminder.ts";

const reminderInput = {
  to: "user@example.com",
  subscriptionName: "Netflix",
  nextBillingDate: "2026-05-15",
  daysBefore: 7,
  amount: "USD 9.99",
};

describe("sendSubscriptionReminderEmail", () => {
  it("returns a configuration error without calling fetch when Resend is missing", async () => {
    let called = false;

    const result = await sendSubscriptionReminderEmail(reminderInput, {
      env: {},
      fetch: async () => {
        called = true;
        return new Response("{}");
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.reason, "missing_resend_config");
    assert.equal(called, false);
  });

  it("sends a Resend API request with reminder content", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];

    const result = await sendSubscriptionReminderEmail(reminderInput, {
      env: {
        RESEND_API_KEY: "re_test",
        REMINDER_EMAIL_FROM: "SubTrack <notifications@example.com>",
      },
      fetch: async (url, init) => {
        requests.push({ url: String(url), init });
        return Response.json({ id: "email_123" });
      },
    });

    assert.deepEqual(result, { ok: true, id: "email_123" });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "https://api.resend.com/emails");
    assert.equal(requests[0].init?.method, "POST");
    assert.equal(
      (requests[0].init?.headers as Record<string, string>).Authorization,
      "Bearer re_test"
    );
    assert.match(String(requests[0].init?.body), /Netflix/);
    assert.match(String(requests[0].init?.body), /2026-05-15/);
  });
});
