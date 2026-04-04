import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || "";

export const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;
export const twilioVerifySid = verifyServiceSid;
