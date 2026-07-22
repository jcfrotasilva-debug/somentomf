import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Registro de Ponto - EE Profa. Marlene Frattini",
  description: "Sistema oficial de registro de ponto eletrônico dos servidores da EE Profa. Marlene Frattini.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-100 text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
