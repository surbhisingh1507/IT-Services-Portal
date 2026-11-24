import { createFileRoute } from "@tanstack/react-router";
import { PortalApp } from "@/components/portal-app";

export const Route = createFileRoute("/clients")({
  head: () => ({ meta: [{ title: "Clients · ITServicePro" }, { name: "description", content: "Maintain client organizations and review their IT service history." }, { property: "og:title", content: "Clients · ITServicePro" }, { property: "og:description", content: "Maintain client organizations and review their IT service history." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PortalApp,
});