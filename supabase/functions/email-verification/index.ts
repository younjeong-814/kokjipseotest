import {createVerificationHandler} from '../_shared/emailNotifications.ts';
// A provider is intentionally NOT connected in the foundation stage.
Deno.serve(createVerificationHandler(Deno.env.toObject()));
