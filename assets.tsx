import { createFileRoute } from "@tanstack/react-router";
import { PortalApp } from "@/components/portal-app";

export const Route = createFileRoute("/assets")({
  head: () => ({ meta: [{ title: "IT assets · ITServicePro" }, { name: "description", content: "Track hardware, software licenses, assignments, and warranty dates." }, { property: "og:title", content: "IT assets · ITServicePro" }, { property: "og:description", content: "Track hardware, software licenses, assignments, and warranty dates." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PortalApp,
});