import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moonblues Sneaker Doctor & Spa Simulator",
  description: "กู้ชีพสนีกเกอร์คู่โปรดกับหมอน้องบลู - เกมจำลองการทำความสะอาดรองเท้าเสมือนจริง พร้อมรับสิทธิพิเศษ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased min-h-screen bg-[#090d16] text-[#f8fafc]">
        {children}
      </body>
    </html>
  );
}
