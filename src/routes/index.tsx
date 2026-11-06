import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blank" },
      { name: "description", content: "Blank project" },
      { property: "og:title", content: "Blank" },
      { property: "og:description", content: "Blank project" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return null;
}
