import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import StaffBottomNav from "@/components/layouts/StaffBottomNav";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Role guard - only STAFF can access
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "STAFF") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top bar with user info */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">SmartResidence</h1>
              <p className="text-sm text-gray-600">Staff Portal</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
              <p className="text-xs text-gray-500 capitalize">
                {session.user.staffJobType?.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>

      {/* Bottom navigation */}
      <StaffBottomNav />
    </div>
  );
}
