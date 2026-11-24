import { createFileRoute } from "@tanstack/react-router";
import { PortalApp } from "@/components/portal-app";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · ITServicePro" },
      { name: "description", content: "Your ITServicePro service desk overview, ticket activity, and operational metrics." },
      { property: "og:title", content: "Overview · ITServicePro" },
      { property: "og:description", content: "Your ITServicePro service desk overview, ticket activity, and operational metrics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalApp,
});
