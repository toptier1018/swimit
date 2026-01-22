import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "스윔잇 수영 저항 특강",
  description: "[마감임박] 하루 만에 수영이 편해지는 저항의 비밀",
  openGraph: {
    title: "스윔잇 수영 저항 특강",
    description: "[마감임박] 하루 만에 수영이 편해지는 저항의 비밀",
    type: "website",
    locale: "ko_KR",
    url: "https://swimit.vercel.app/",
  },
  twitter: {
    card: "summary_large_image",
    title: "스윔잇 수영 저항 특강",
    description: "[마감임박] 하루 만에 수영이 편해지는 저항의 비밀",
  },
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Vercel Analytics 초기화 로그
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.log("📊 Vercel Analytics가 활성화되었습니다.")
  }

  return (
    <html lang="ko">
      <body className={`font-sans antialiased`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
