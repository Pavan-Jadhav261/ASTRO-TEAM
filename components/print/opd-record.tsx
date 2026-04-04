
type OpdRecordProps = {
  tokenNumber: string;
  roomNumber: string;
  uhid: string;
  name: string;
  prNumber: string;
  department: string;
  ehrId: string;
  age: number;
  gender: string;
  phone: string;
  createdAt: string;
  qrDataUrl: string;
};

export function OpdRecordTemplate({
  tokenNumber,
  roomNumber,
  uhid,
  name,
  prNumber,
  department,
  ehrId,
  age,
  gender,
  phone,
  createdAt,
  qrDataUrl,
}: OpdRecordProps) {
  return (
    <div
      style={{
        width: "820px",
        maxWidth: "100%",
        margin: "24px auto",
        background: "#fff",
        border: "1px solid #ccc",
        padding: "24px 28px 36px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        color: "#111",
        fontFamily: "\"Times New Roman\", Times, serif",
      }}
    >
      <div style={{ textAlign: "center", fontWeight: "bold", textTransform: "uppercase", fontSize: 16 }}>
        Medical College Hospital
      </div>
      <div style={{ textAlign: "center", fontSize: 13, color: "#555" }}>
        Vijayanagar Institute of Medical Sciences Ballari
      </div>
      <div style={{ textAlign: "center", fontSize: 13, color: "#555" }}>
        Medical College Hospital VIMS Cantonment Ballari
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, marginTop: 8 }}>
        <div>
          <strong>Consulting Room No</strong> : {roomNumber}
        </div>
        <div>
          <strong>Clinic</strong> : OPD
        </div>
        <div>
          <strong>Token No</strong> : {tokenNumber}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, marginTop: 8 }}>
        <div>
          <strong>Days</strong> : Mon, Tue, Wed, Thu, Fri, Sat
        </div>
        <div>
          <strong>UHID</strong> : {uhid}
        </div>
      </div>

      <div style={{ borderTop: "1px solid #111", margin: "12px 0" }} />
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 14, letterSpacing: 0.5, margin: "8px 0" }}>
        Out Patient Record
      </div>
      <div style={{ borderTop: "1px solid #111", margin: "12px 0" }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 18px",
          fontSize: 13,
        }}
      >
        {[
          ["Name", name],
          ["PR No", prNumber],
          ["Department", department],
          ["EHR ID", ehrId],
          ["Dept No", `D-${roomNumber}`],
          ["Fee", "10"],
          ["Date of Registration", createdAt],
          ["Sex", gender.toUpperCase()],
          ["Unit", "1"],
          ["Doctor", "Dr. Smith"],
          ["Age", String(age)],
          ["Occupation", "Student"],
          ["Billing Type", "General"],
          ["Prepared by", "Nurse Alice"],
          ["Mobile No", phone],
          ["Address", "Makavalli"],
          ["Patient Type", "NON MLC"],
        ].map(([label, value], index) => (
          <div
            key={index}
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1px dotted #aaa",
              paddingBottom: 3,
            }}
          >
            <span style={{ fontWeight: "bold", marginRight: 8 }}>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid #111", margin: "12px 0" }} />
      <div style={{ fontSize: 13 }}>
        <strong>Date and Time of initial assessment</strong> : {createdAt}
      </div>

      <div style={{ marginTop: 18, fontSize: 13 }}>
        <div>
          <strong>Clinical History</strong> :
        </div>
        <div>
          <strong>Examination Findings</strong> :
        </div>
        <div>
          <strong>Investigation</strong> :
        </div>
        <div>
          <strong>Diagnosis</strong> :
        </div>
        <div>
          <strong>Treatment</strong> :
        </div>
        <div>
          <strong>Follow-up advice</strong> :
        </div>
      </div>

      <div style={{ display: "flex", marginTop: 16, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: "bold" }}>Doctor's Name</div>
          <div>Signature / Date</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ border: "1px solid #999", padding: 6, background: "#fff" }}>
            <img src={qrDataUrl} alt="QR code" width={120} height={120} />
          </div>
          <div style={{ fontSize: 13, color: "#555" }}>Scan to open patient record</div>
        </div>
      </div>
    </div>
  );
}
