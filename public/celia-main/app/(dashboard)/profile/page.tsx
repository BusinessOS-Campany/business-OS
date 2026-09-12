import { requireUser } from "@/lib/session";
import { getUserProfile } from "@/lib/users/queries";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProfileView } from "@/components/profile/profile-view";
import { notFound } from "next/navigation";

export const metadata = {
  title: "الملف الشخصي",
  description: "عرض وتعديل بياناتك الشخصية وكلمة المرور",
};

export default async function ProfilePage() {
  const session = await requireUser();
  const profile = await getUserProfile(session.user.id);
  if (!profile) notFound();

  return (
    <>
      <PageHeader titleKey="profilePage.title" />
      <div className="relative flex w-full flex-col overflow-hidden">
        <div
          className="pointer-events-none absolute -top-10 -end-16 size-60 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex-1">
          <ProfileView
            initialProfile={{
              id: profile.id,
              name: profile.name,
              email: profile.email,
              username: profile.username,
              displayUsername: profile.displayUsername,
              phone: profile.phone,
              role: profile.role,
              createdAt: profile.createdAt.toISOString(),
            }}
          />
        </div>
      </div>
    </>
  );
}
