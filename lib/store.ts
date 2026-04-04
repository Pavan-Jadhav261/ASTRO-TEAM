type OtpEntry = {
  phone: string;
  code: string;
  createdAt: number;
};

type VisitRecord = {
  visitId: string;
  tokenNumber: string;
  roomNumber?: string;
  patientId?: string | null;
  name: string;
  age: number;
  gender: string;
  phone: string;
  symptoms: string;
  department: string;
  createdAt: number;
};

const otpStore = new Map<string, OtpEntry>();
const visitStore = new Map<string, VisitRecord>();

export function saveOtp(phone: string, code: string) {
  otpStore.set(phone, { phone, code, createdAt: Date.now() });
}

export function verifyOtp(phone: string, code: string) {
  const entry = otpStore.get(phone);
  if (!entry) return false;
  return entry.code === code;
}

export function saveVisit(record: VisitRecord) {
  visitStore.set(record.visitId, record);
}

export function getVisit(visitId: string) {
  return visitStore.get(visitId) || null;
}

export function getLatestVisit() {
  let latest: VisitRecord | null = null;
  for (const value of visitStore.values()) {
    if (!latest || value.createdAt > latest.createdAt) {
      latest = value;
    }
  }
  return latest;
}
