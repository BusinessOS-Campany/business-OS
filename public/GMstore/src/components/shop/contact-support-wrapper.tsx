"use client";
import dynamic from "next/dynamic";
const ContactSupportBtn = dynamic(() => import("./contact-support").then(m => ({ default: m.ContactSupport })), { ssr: false });
export function ContactSupportWrapper() {
  return <ContactSupportBtn />;
}
