/** Connection kinds and what the browser may see about them; safe to import in client code. */
export const INTEGRATION_KINDS = ["slack", "teams", "wordpress"] as const;
export type IntegrationKind = (typeof INTEGRATION_KINDS)[number];

/** Never the link or password: only which tool, a recognizable name and when. */
export type IntegrationStatus = { kind: IntegrationKind; label: string | null; updatedAt: string };
