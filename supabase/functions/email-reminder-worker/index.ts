import {createReminderWorker} from '../_shared/emailNotifications.ts';
import {createResendTransport} from '../_shared/emailTransport.ts';
const env=Deno.env.toObject();
// Still planning-only unless RESEND_API_KEY, EMAIL_FROM and EMAIL_DISPATCH_ENABLED=true are all set.
Deno.serve(createReminderWorker(env,createResendTransport(env)));
