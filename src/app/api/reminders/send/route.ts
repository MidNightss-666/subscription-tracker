import { createAdminClient } from "@/lib/supabase/admin";
import {
  runSubscriptionReminderJob,
  type ReminderCandidate,
  type ReminderJobResult,
} from "@/lib/reminder-runner";

interface RouteDependencies {
  env?: Partial<Record<"SUBSCRIPTION_REMINDER_CRON_SECRET", string>>;
  runJob?: () => Promise<ReminderJobResult>;
}

function getCronSecret(deps?: RouteDependencies) {
  return (
    deps?.env?.SUBSCRIPTION_REMINDER_CRON_SECRET ??
    process.env.SUBSCRIPTION_REMINDER_CRON_SECRET
  );
}

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

async function loadReminderCandidates() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id,user_id,name,price,currency,billing_cycle,next_billing_date,email_notifications_enabled,notify_days_before,last_notification_sent_at"
    )
    .eq("email_notifications_enabled", true);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<Omit<ReminderCandidate, "user_email"> & {
    user_id: string;
  }>;
  const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
  const emailByUserId = new Map<string, string | null>();

  for (const userId of userIds) {
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(userId);

    if (userError) {
      emailByUserId.set(userId, null);
    } else {
      emailByUserId.set(userId, userData.user.email ?? null);
    }
  }

  return rows.map((row) => ({
    ...row,
    user_email: emailByUserId.get(row.user_id) ?? null,
  }));
}

async function markReminderSent(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ last_notification_sent_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

async function runDefaultJob() {
  return runSubscriptionReminderJob({
    loadCandidates: loadReminderCandidates,
    markSent: markReminderSent,
  });
}

export async function handleReminderRequest(
  request: Request,
  deps?: RouteDependencies
) {
  const cronSecret = getCronSecret(deps);
  const token = readBearerToken(request);

  if (!cronSecret || token !== cronSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await (deps?.runJob ?? runDefaultJob)();
    return Response.json(result);
  } catch {
    return Response.json({ error: "Reminder job failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleReminderRequest(request);
}
