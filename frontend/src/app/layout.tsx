"use client"

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { useState } from "react";
import { usePathname } from "next/navigation";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Note: metadata should be in a separate metadata file for client components
// export const metadata: Metadata = {
//   title: "Recruitment Management",
//   description: "Comprehensive recruitment and hiring management system",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const pathname = usePathname()

  const isAuthPage = pathname === '/signin' || pathname === '/unauthorized'
  const isWebDeskPage = pathname?.startsWith('/webdesk')

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <html lang="en">
      <head>
        <title>Recruitment Management</title>
        <meta name="description" content="Comprehensive recruitment and hiring management system" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {isWebDeskPage ? (
            // WebDesk pages: no sidebar, no header, fullscreen
            children
          ) : (
            <div className="min-h-screen bg-slate-50 text-slate-900">
              {!isAuthPage && <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />}

              {/* Main column with conditional left margin for fixed sidebar */}
              <div className={`flex min-w-0 flex-1 flex-col ${!isAuthPage ? 'md:ml-72' : ''}`}>
                {!isAuthPage && <Header onMenuClick={toggleSidebar} />}

                {/* Page content */}
                <main className="flex-1">
                  {children}
                </main>
              </div>
            </div>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
