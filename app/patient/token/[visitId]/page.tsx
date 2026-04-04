import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { OpdRecordTemplate } from "@/components/print/opd-record";

export const dynamic = "force-dynamic";

export default async function PatientTokenPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const { visitId } = await params;

  const visit = await prisma.opdVisit
    .findUnique({ where: { visit_id: visitId } })
    .catch(() => null);

  if (!visit) {
    return <div style={{ padding: 24 }}>Token not found.</div>;
  }

  const qrPayload = JSON.stringify({ visitId, tokenNumber: visit.token_number });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 200 });

  return (
    <OpdRecordTemplate
      tokenNumber={visit.token_number}
      roomNumber={visit.room_number || "Counter 1"}
      uhid={`UHID-${visit.token_number}`}
      name={visit.name}
      prNumber={`PR-${visit.token_number}`}
      department={visit.department}
      ehrId={`EHR-${visit.token_number}`}
      age={visit.age}
      gender={visit.gender}
      phone={visit.phone}
      createdAt={visit.created_at.toLocaleDateString()}
      qrDataUrl={qrDataUrl}
    />
  );
}
