import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat Inbox",
  manifest: "/inbox.webmanifest",
  themeColor: "#0b141a",
  icons: {
    apple: "/inbox-icon-192.png",
  },
};

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
