import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { handleReminderRequest } from "../src/app/api/reminders/send/route.ts";

describe("subscription reminder route", () => {
  it("rejects requests without a bearer token", async () => {
    const response = await handleReminderRequest(
      new Request("https://example.com/api/reminders/send"),
      {
        env: { SUBSCRIPTION_REMINDER_CRON_SECRET: "secret" },
        runJob: async () => ({ checked: 0, due: 0, sent: 0, failed: 0 }),
      }
    );

    assert.equal(response.status, 401);
  });

  it("rejects requests with the wrong bearer token", async () => {
    const response = await handleReminderRequest(
      new Request("https://example.com/api/reminders/send", {
        headers: { Authorization: "Bearer wrong" },
      }),
      {
        env: { SUBSCRIPTION_REMINDER_CRON_SECRET: "secret" },
        runJob: async () => ({ checked: 0, due: 0, sent: 0, failed: 0 }),
      }
    );

    assert.equal(response.status, 401);
  });

  it("runs the reminder job for requests with the cron secret", async () => {
    let called = false;
    const response = await handleReminderRequest(
      new Request("https://example.com/api/reminders/send", {
        method: "POST",
        headers: { Authorization: "Bearer secret" },
      }),
      {
        env: { SUBSCRIPTION_REMINDER_CRON_SECRET: "secret" },
        runJob: async () => {
          called = true;
          return { checked: 2, due: 1, sent: 1, failed: 0 };
        },
      }
    );

    assert.equal(response.status, 200);
    assert.equal(called, true);
    assert.deepEqual(await response.json(), {
      checked: 2,
      due: 1,
      sent: 1,
      failed: 0,
    });
  });
});
