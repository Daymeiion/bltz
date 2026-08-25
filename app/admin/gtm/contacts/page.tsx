import { GtmContactsWorkspace } from "@/components/admin/gtm/GtmContactsWorkspace";
import { getGtmContacts } from "@/lib/gtm/server";

export const metadata = {
  title: "GTM Contacts | BLTZ Admin",
  description: "Private relationship intelligence for authorized BLTZ administrators.",
};

export default async function GtmContactsPage() {
  const data = await getGtmContacts();
  return <GtmContactsWorkspace data={data} />;
}
