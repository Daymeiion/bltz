import { MessageCenter } from "@/components/admin/MessageCenter";

export const metadata = {
  title: "Message Center | BLTZ Admin",
  description: "Admin message center for communicating with users",
};

export default function AdminMessagesPage() {
  return (
    <div className="p-3 md:p-8 max-w-[1600px] mx-auto">
      <MessageCenter />
    </div>
  );
}
