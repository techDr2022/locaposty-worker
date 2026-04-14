import { Resend } from "resend";

const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";

export async function sendReportEmailWithPdf(params: {
  to: string;
  subject: string;
  html: string;
  pdfBuffer: Buffer;
  filename: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY is not configured" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data, error } = await resend.emails.send({
    from: `LocaPosty Reports <${fromEmail}>`,
    to: [params.to],
    subject: params.subject,
    html: params.html,
    attachments: [
      {
        filename: params.filename,
        content: params.pdfBuffer,
      },
    ],
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, id: data?.id };
}
