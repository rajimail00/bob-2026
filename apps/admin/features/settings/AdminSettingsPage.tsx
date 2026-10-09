import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PageIntro } from "@/components/ui";

const settings = [
  { href: "/categories", icon: "categories" as const, title: "Categories", detail: "Manage the services available in BOB" },
  { href: "/settings/faqs", icon: "tickets" as const, title: "FAQs", detail: "Manage the app help questions and answers" },
  { href: "/advertisements", icon: "advertisements" as const, title: "Advertisements", detail: "Create and manage home feed campaigns" },
  { href: "/settings/configuration", icon: "settings" as const, title: "Configuration", detail: "Manage safe application settings" },
];

export function AdminSettingsPage() {
  return <>
    <PageIntro title="Settings" description="Manage the same administration options available from the app." />
    <section className="admin-settings-card" aria-label="Admin settings">
      {settings.map((item) => <Link className="admin-settings-row" href={item.href} key={item.href}>
        <span className="admin-settings-icon"><Icon name={item.icon} /></span>
        <span><strong>{item.title}</strong><small>{item.detail}</small></span>
        <Icon name="chevron" />
      </Link>)}
    </section>
  </>;
}
