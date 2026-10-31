import {createVerificationHandler} from '../_shared/emailNotifications.ts';
import {createGmailVerificationTransport} from '../_shared/gmail.ts';
const env=Deno.env.toObject();
Deno.serve(createVerificationHandler(env,createGmailVerificationTransport(env)));
