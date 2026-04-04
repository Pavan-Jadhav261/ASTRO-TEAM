import os
import json
import logging
import requests
import asyncio
from dotenv import load_dotenv
from pathlib import Path

from livekit import agents, rtc
from livekit.agents import Agent, AgentSession, AgentServer, JobContext, RunContext, function_tool
from livekit.plugins import google

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / '.env.local')
load_dotenv(ROOT_DIR / '.env')

LIVEKIT_URL = (
    os.getenv('LIVEKIT_PATIENT_URL')
    or os.getenv('NEXT_PUBLIC_LIVEKIT_PATIENT_URL')
    or os.getenv('LIVEKIT_URL')
    or os.getenv('NEXT_PUBLIC_LIVEKIT_URL')
)
LIVEKIT_API_KEY = os.getenv('LIVEKIT_PATIENT_API_KEY') or os.getenv('LIVEKIT_API_KEY')
LIVEKIT_API_SECRET = os.getenv('LIVEKIT_PATIENT_API_SECRET') or os.getenv('LIVEKIT_API_SECRET')
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
GOOGLE_REALTIME_MODEL = os.getenv('GOOGLE_REALTIME_MODEL', 'gemini-2.5-flash-native-audio-preview-12-2025')
GOOGLE_REALTIME_VOICE = os.getenv('GOOGLE_REALTIME_VOICE', 'Puck')
AGENT_NAME = os.getenv('LIVEKIT_AGENT_NAME', 'hospital-agent')
APP_URL = os.getenv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
BASE_URL = APP_URL.rstrip('/')
AGENT_API_KEY = os.getenv('AGENT_API_KEY')

missing = []
if not LIVEKIT_URL:
    missing.append('LIVEKIT_URL or NEXT_PUBLIC_LIVEKIT_URL')
if not LIVEKIT_API_KEY:
    missing.append('LIVEKIT_API_KEY')
if not LIVEKIT_API_SECRET:
    missing.append('LIVEKIT_API_SECRET')
if not GOOGLE_API_KEY:
    missing.append('GOOGLE_API_KEY')

if missing:
    raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('hospital-agent')


class HospitalAssistant(Agent):
    def __init__(self, room: rtc.Room):
        self.room = room
        self.pending_details: dict | None = None
        self.otp_verified = False
        self.registration_payload: dict | None = None
        super().__init__(
            instructions="""
You are a strict multilingual hospital OPD intake agent for SAHAYA AI Hospital.

Language behavior:
- Detect the user's language from speech and continue in that language automatically.
- If the user asks for Hindi, Kannada, English, or any other language, switch language immediately.
- After switching language, continue from the current registration step. Do not skip backward or forward.

Required question order:
1. full name
2. age
3. gender
4. phone number
5. symptoms or reason for visit

Fixed flow:
1. Greet briefly.
2. Collect the required fields in the exact order above.
3. When all five fields are known, choose the best department from symptoms and call send_registration_otp.
4. After OTP is sent, ask the user to say the OTP.
5. Call verify_registration_otp with the spoken code.
6. If OTP is wrong, ask once more. If still wrong, offer resend OTP or phone number change.
7. When OTP is verified, the browser will show the details popup. Ask the user if the details are correct.
8. If the user corrects name, age, gender, or symptoms after OTP, update the details but do not resend OTP.
9. Only resend OTP if the phone number changes or the user explicitly asks to resend OTP.
10. If the user says the details are correct, call confirm_registration_and_prepare_payment.
11. Then tell the user payment is opening on screen.

Tool calling rules:
- You must use tools to perform OTP actions. Never claim an OTP was sent or verified unless the tool returns success.
- As soon as all five fields are collected, you MUST call send_registration_otp exactly once.
- If the user provides an OTP, immediately call verify_registration_otp with the spoken digits.
- If the user asks to resend OTP or changes phone number, call resend_registration_otp.
- If the user confirms details are correct after OTP verification, call confirm_registration_and_prepare_payment.

Rules:
- Ask only one missing field at a time.
- Keep replies short and direct.
- Do not discuss unrelated topics.
- Politely refuse non-registration conversation.
- Do not skip the name question. Name must always be collected first.
- Do not resend OTP for name, age, gender, or symptom changes.
- Do not ask the user to type OTP. The user will speak it.
- Do not confirm registration until the user says the details are correct.
- Do not make up tool outcomes. Follow tool responses verbatim.

Available departments:
- General Medicine
- Cardiology
- Orthopedics
- Pediatrics
- Dermatology
- Neurology
- ENT
- Gynecology
"""
        )

    async def _publish(self, action: str, data: dict):
        payload = json.dumps({'action': action, 'data': data})
        await self.room.local_participant.publish_data(payload.encode(), reliable=True)

    def _post_json(self, path: str, payload: dict, timeout: int):
        urls = [BASE_URL]
        if 'localhost' in BASE_URL:
            urls.append(BASE_URL.replace('localhost', '127.0.0.1'))
        last_error = None
        for base in urls:
            try:
                return requests.post(f"{base}{path}", json=payload, timeout=timeout)
            except requests.RequestException as exc:
                last_error = exc
                logger.error('Request failed to %s%s: %s', base, path, exc)
        if last_error:
            logger.error('All requests failed for %s: %s', path, last_error)
        return None


class ElderlyCareAssistant(Agent):
    def __init__(self, room: rtc.Room, patient_id: str):
        self.room = room
        self.patient_id = patient_id
        self.summary_unavailable = False
        super().__init__(
            instructions="""
You are a calm, respectful ABHA+ AI personal companion for elderly patients.

Your role:
- Explain the patient's latest doctor summary in simple language.
- Answer questions like "What did the doctor say?" or "When should I take my medicines?"
- Give clear DO and DO NOT guidance based on the summary.
- Offer safe, gentle home remedies for mild symptoms when appropriate (e.g., hydration, rest, warm fluids).
- Be empathetic and speak slowly in short sentences.
- If the user says they feel lonely, keep them company with warm conversation and gentle check-ins.
- If the user asks to book an appointment, ask for symptoms and call book_appointment.
 - If the user mentions any new health-related symptoms or changes, call log_health_note with a concise summary.
 - If the conversation is not about health, do NOT log a note. Respond as a normal companion.

Safety triggers:
- If the user says they feel dizzy or lightheaded, call log_health_note with a concise note (e.g., "Patient reported dizziness on call").
- If the user reports sharp chest pain, heart pain, severe shortness of breath, or any urgent health issue, call trigger_emergency immediately.
- If the user says they feel lonely and also mentions any health issues, call notify_helpers with a brief alert.

Strict boundaries:
- Do NOT perform OPD registration, OTP flows, or payment steps.
- Do NOT collect registration details like name/age/phone unless needed to clarify.
- This agent is purely for guidance and appointment booking.

Home remedy safety:
- Only suggest low-risk, general remedies.
- Do not provide new medication doses or replacements for prescriptions.
- If symptoms are severe, worsening, or unclear, advise seeing a doctor promptly.

Rules:
- Always base advice on the latest available summary and prescriptions.
- If you do not have a summary yet, call get_recent_summary first.
- Never invent medical facts or prescriptions.
- If symptoms sound severe or urgent, advise immediate medical attention.
- Keep answers short and reassuring.
- Do NOT tell the user that you notified helpers or triggered emergency; do it silently in the background.

Fallback guidance:
- If get_recent_summary fails or returns no summary, say the short fallback line ONCE, then continue the conversation normally.
- Do not repeat the fallback line on every turn.
- Ask one simple question to gather what the doctor told them, then continue helping.
"""
        )

    async def _publish(self, action: str, data: dict):
        payload = json.dumps({'action': action, 'data': data})
        await self.room.local_participant.publish_data(payload.encode(), reliable=True)

    def _post_json(self, path: str, payload: dict, timeout: int):
        urls = [BASE_URL]
        if 'localhost' in BASE_URL:
            urls.append(BASE_URL.replace('localhost', '127.0.0.1'))
        last_error = None
        headers = {}
        if AGENT_API_KEY:
            headers['x-agent-key'] = AGENT_API_KEY
        for base in urls:
            try:
                return requests.post(f"{base}{path}", json=payload, timeout=timeout, headers=headers)
            except requests.RequestException as exc:
                last_error = exc
                logger.error('Request failed to %s%s: %s', base, path, exc)
        if last_error:
            logger.error('All requests failed for %s: %s', path, last_error)
        return None

    @function_tool(description='Fetch the most recent doctor summary and prescriptions for the patient.')
    async def get_recent_summary(self, ctx: RunContext) -> str:
        response = self._post_json('/api/agent/patient-summary', {'patientId': self.patient_id}, 12)
        if not response or response.status_code != 200:
            self.summary_unavailable = True
            return 'I could not load the latest doctor summary right now. Please describe what the doctor told you, and I will help.'

        payload = response.json()
        summary = payload.get('summary') or 'No recent summary available.'
        self.summary_unavailable = summary == 'No recent summary available.'
        diagnosis = payload.get('diagnosis') or 'Not specified'
        plan = payload.get('plan') or 'Not specified'
        prescriptions = payload.get('prescriptions') or []

        meds_lines = []
        for p in prescriptions:
            meds_lines.append(f"{p.get('medicineName')} - {p.get('dosage')} - {p.get('frequency')} - {p.get('duration')}")

        meds_text = '\n'.join(meds_lines) if meds_lines else 'No prescriptions on record.'
        return f"Summary: {summary}\nDiagnosis: {diagnosis}\nPlan: {plan}\nMedicines: {meds_text}"

    @function_tool(description='Save a health note from the companion conversation into the patient summary notes.')
    async def log_health_note(self, ctx: RunContext, note: str) -> str:
        if not note or not note.strip():
            return 'No note provided.'
        response = self._post_json('/api/agent/patient-note', {'patientId': self.patient_id, 'note': note.strip()}, 10)
        if not response or response.status_code != 200:
            return 'Noted.'
        return 'Noted.'

    @function_tool(description='Trigger an emergency alert to the doctor for critical symptoms.')
    async def trigger_emergency(self, ctx: RunContext, reason: str) -> str:
        response = self._post_json('/api/agent/emergency', {'patientId': self.patient_id, 'reason': reason}, 10)
        if not response or response.status_code != 200:
            return 'Please call emergency services immediately.'

        payload = response.json()
        map_link = payload.get('mapLink')
        if map_link:
            await self.notify_helpers(ctx, f"🚨 Emergency alert for patient. Reason: {reason}. Location: {map_link}")

        await self._publish('emergency_sent', {'reason': reason})
        return 'Please stay calm and seek immediate help.'

    @function_tool(description='Notify helper/family members via Telegram about a serious health update.')
    async def notify_helpers(self, ctx: RunContext, message: str) -> str:
        response = self._post_json('/api/agent/notify-helpers', {'patientId': self.patient_id, 'message': message}, 10)
        if not response or response.status_code != 200:
            return 'Okay.'
        return 'Okay.'
    @function_tool(description='Book an appointment for the patient and return the OPD token details.')
    async def book_appointment(self, ctx: RunContext, symptoms: str, department: str = 'GENERAL') -> str:
        response = self._post_json(
            '/api/agent/book-appointment',
            {'patientId': self.patient_id, 'symptoms': symptoms, 'department': department},
            12,
        )
        if not response or response.status_code != 200:
            return 'I could not book the appointment yet. Please try again.'

        payload = response.json()
        await self._publish('appointment_booked', payload)
        return f"Appointment booked. Token {payload.get('tokenNumber')} for {payload.get('department')} in room {payload.get('roomNumber')}."


server = AgentServer()


@server.rtc_session(agent_name=AGENT_NAME)
async def entrypoint(ctx: JobContext):
    logger.info('New session: %s', ctx.room.name)
    await ctx.connect()

    try:
        participant = await ctx.wait_for_participant()
        logger.info('Patient joined: %s', participant.identity)
    except asyncio.CancelledError:
        logger.info('Job cancelled while waiting for participant.')
        return
    except RuntimeError as exc:
        if 'room disconnected' in str(exc).lower():
            logger.info('Room disconnected before participant joined.')
            return
        raise

    room_name = ctx.room.name or ''
    is_elderly_room = room_name.startswith('elderly-assistant-')
    patient_id = room_name.replace('elderly-assistant-', '').strip() or 'patient-001'

    agent = ElderlyCareAssistant(room=ctx.room, patient_id=patient_id) if is_elderly_room else HospitalAssistant(room=ctx.room)
    model = google.realtime.RealtimeModel(
        model=GOOGLE_REALTIME_MODEL,
        voice=GOOGLE_REALTIME_VOICE,
        temperature=0.2,
    )

    session = AgentSession(
        llm=model,
        allow_interruptions=True,
        min_interruption_duration=0.5,
        min_interruption_words=1,
        min_endpointing_delay=0.4,
        max_endpointing_delay=4.0,
    )

    await session.start(room=ctx.room, agent=agent)
    if is_elderly_room:
        await session.generate_reply(
            instructions='Greet the patient warmly, then offer to explain the latest doctor summary and medicines.'
        )
    else:
        await session.generate_reply(
            instructions='Greet the user briefly in their language and ask only for their full name first to begin OPD registration.'
        )


if __name__ == '__main__':
    agents.cli.run_app(server)



