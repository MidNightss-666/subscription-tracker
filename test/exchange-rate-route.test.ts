import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { handleExchangeRateSyncRequest } from "../src/app/api/exchange-rates/sync/route.ts";

describe("exchange-rate sync route", () => {
  it("rejects requests without a bearer token", async () => {
    const response = await handleExchangeRateSyncRequest(
      new Request("https://example.com/api/exchange-rates/sync", { method: "POST" }),
      {
        env: { EXCHANGE_RATE_CRON_SECRET: "secret" },
        runJob: async () => ({ fetched: 0, stored: 0 }),
      }
    );

    assert.equal(response.status, 401);
  });

  it("rejects requests with the wrong bearer token", async () => {
    const response = await handleExchangeRateSyncRequest(
      new Request("https://example.com/api/exchange-rates/sync", {
        method: "POST",
        headers: { Authorization: "Bearer wrong" },
      }),
      {
        env: { EXCHANGE_RATE_CRON_SECRET: "secret" },
        runJob: async () => ({ fetched: 0, stored: 0 }),
      }
    );

    assert.equal(response.status, 401);
  });

  it("runs the sync job for requests with the cron secret", async () => {
    let called = false;
    const response = await handleExchangeRateSyncRequest(
      new Request("https://example.com/api/exchange-rates/sync", {
        method: "POST",
        headers: { Authorization: "Bearer secret" },
      }),
      {
        env: { EXCHANGE_RATE_CRON_SECRET: "secret" },
        runJob: async () => {
          called = true;
          return { fetched: 5, stored: 5 };
        },
      }
    );

    assert.equal(response.status, 200);
    assert.equal(called, true);
    assert.deepEqual(await response.json(), { fetched: 5, stored: 5 });
  });

  it("only returns sync aggregate fields from the job result", async () => {
    const response = await handleExchangeRateSyncRequest(
      new Request("https://example.com/api/exchange-rates/sync", {
        method: "POST",
        headers: { Authorization: "Bearer secret" },
      }),
      {
        env: { EXCHANGE_RATE_CRON_SECRET: "secret" },
        runJob: async () => ({
          fetched: 5,
          stored: 5,
          providerDebug: "do not expose",
        }),
      }
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { fetched: 5, stored: 5 });
  });

  it("returns a generic error when the sync job fails", async () => {
    const response = await handleExchangeRateSyncRequest(
      new Request("https://example.com/api/exchange-rates/sync", {
        method: "POST",
        headers: { Authorization: "Bearer secret" },
      }),
      {
        env: { EXCHANGE_RATE_CRON_SECRET: "secret" },
        runJob: async () => {
          throw new Error("provider details");
        },
      }
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Exchange rate sync failed" });
  });
});
