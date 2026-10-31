import {createReminderWorker} from '../_shared/emailNotifications.ts';
// Planning only until a reviewed provider transport is injected and dispatch explicitly enabled.
Deno.serve(createReminderWorker(Deno.env.toObject()));
