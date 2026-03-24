export function formatPhoneForWhatsApp(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return "880" + digits.slice(1);
  return "880" + digits;
}

export function buildPaymentWhatsAppUrl(
  phone: string | null | undefined,
  amount: number,
  studentName: string,
  month: string
): string {
  const p = formatPhoneForWhatsApp(phone);
  if (!p) return "";
  const msg = `সম্মানিত অভিভাবক, আপনার সন্তান ${studentName}-এর ${month} মাসের কোচিং ফি বাবদ ${amount} টাকা সফলভাবে জমা হয়েছে। ডায়নামিক কোচিং সেন্টারের সাথেই থাকুন। ধন্যবাদ। - কর্তৃপক্ষ।`;
  return `https://wa.me/${p}?text=${encodeURIComponent(msg)}`;
}

export function buildSubjectWhatsAppUrl(
  phone: string | null | undefined,
  studentName: string,
  examName: string,
  subject: string,
  marks: number,
  totalFull: number,
): string {
  const p = formatPhoneForWhatsApp(phone);
  if (!p) return "";
  const msg = `Academic Update: ${studentName}'s performance in ${examName}\nSubject: ${subject}\nResult: ${marks} out of ${totalFull}\n— Dynamic Coaching Center`;
  return `https://wa.me/${p}?text=${encodeURIComponent(msg)}`;
}

export function buildResultWhatsAppUrl(
  phone: string | null | undefined,
  studentName: string,
  examName: string,
  totalObtained: number,
  totalFull: number,
  gpa: number
): string {
  const p = formatPhoneForWhatsApp(phone);
  if (!p) return "";
  const msg = `Academic Update:${studentName}'s performance in ${examName}\nResult: ${totalObtained} out of ${totalFull}\nGPA: ${gpa.toFixed(2)}\n— Please check the marksheet for more details. - Dynamic Coaching Center`;
  return `https://wa.me/${p}?text=${encodeURIComponent(msg)}`;
}
