import fs from "node:fs";
import path from "node:path";

const batches = [
  {
    name: "batch-01-greenhouse-heavy",
    focus: "greenhouse",
    entries: [
      ["stripe", "Stripe", "greenhouse"],
      ["vercel", "Vercel", "greenhouse"],
      ["datadog", "Datadog", "greenhouse"],
      ["coinbase", "Coinbase", "greenhouse"],
      ["robinhood", "Robinhood", "greenhouse"],
      ["doordash", "DoorDash", "greenhouse"],
      ["airbnb", "Airbnb", "greenhouse"],
      ["reddit", "Reddit", "greenhouse"],
      ["instacart", "Instacart", "greenhouse"],
      ["asana", "Asana", "greenhouse"],
      ["notion", "Notion", "greenhouse"],
      ["figma", "Figma", "greenhouse"],
      ["canva", "Canva", "greenhouse"],
      ["dropbox", "Dropbox", "greenhouse"],
      ["pinterest", "Pinterest", "greenhouse"],
      ["gusto", "Gusto", "greenhouse"],
      ["ramp", "Ramp", "greenhouse"],
      ["brex", "Brex", "greenhouse"],
      ["chime", "Chime", "greenhouse"],
      ["discord", "Discord", "greenhouse"],
      ["block", "Block", "greenhouse"],
      ["lyft", "Lyft", "greenhouse"],
      ["hubspot", "HubSpot", "greenhouse"],
      ["shopify", "Shopify", "greenhouse"],
      ["zendesk", "Zendesk", "greenhouse"],
    ],
  },
  {
    name: "batch-02-greenhouse-plus-lever",
    focus: "greenhouse",
    entries: [
      ["atlassian", "Atlassian", "greenhouse"],
      ["twilio", "Twilio", "greenhouse"],
      ["cloudflare", "Cloudflare", "greenhouse"],
      ["snowflake", "Snowflake", "greenhouse"],
      ["palantir", "Palantir", "greenhouse"],
      ["adobe", "Adobe", "greenhouse"],
      ["nvidia", "NVIDIA", "greenhouse"],
      ["tesla", "Tesla", "greenhouse"],
      ["spacex", "SpaceX", "greenhouse"],
      ["uber", "Uber", "greenhouse"],
      ["microsoft", "Microsoft", "greenhouse"],
      ["meta", "Meta", "greenhouse"],
      ["netflix", "Netflix", "greenhouse"],
      ["unity", "Unity", "greenhouse"],
      ["okta", "Okta", "greenhouse"],
      ["hashicorp", "HashiCorp", "greenhouse"],
      ["gitlab", "GitLab", "greenhouse"],
      ["confluent", "Confluent", "greenhouse"],
      ["mongodb", "MongoDB", "greenhouse"],
      ["databricks", "Databricks", "greenhouse"],
      ["plaid", "Plaid", "lever"],
      ["rippling", "Rippling", "lever"],
      ["affirm", "Affirm", "lever"],
      ["coursera", "Coursera", "lever"],
      ["eventbrite", "Eventbrite", "lever"],
    ],
  },
  {
    name: "batch-03-mixed-greenhouse-lever",
    focus: "mixed",
    entries: [
      ["sentry", "Sentry", "greenhouse"],
      ["elastic", "Elastic", "greenhouse"],
      ["newrelic", "New Relic", "greenhouse"],
      ["docusign", "DocuSign", "greenhouse"],
      ["servicenow", "ServiceNow", "greenhouse"],
      ["samsara", "Samsara", "greenhouse"],
      ["toast", "Toast", "greenhouse"],
      ["zscaler", "Zscaler", "greenhouse"],
      ["crowdstrike", "CrowdStrike", "greenhouse"],
      ["pagerduty", "PagerDuty", "greenhouse"],
      ["digitalocean", "DigitalOcean", "greenhouse"],
      ["box", "Box", "greenhouse"],
      ["mural", "Mural", "greenhouse"],
      ["loom", "Loom", "greenhouse"],
      ["miro", "Miro", "greenhouse"],
      ["postman", "Postman", "lever"],
      ["calendly", "Calendly", "lever"],
      ["segment", "Segment", "lever"],
      ["benchling", "Benchling", "lever"],
      ["scaleai", "Scale AI", "lever"],
      ["flexport", "Flexport", "lever"],
      ["intercom", "Intercom", "lever"],
      ["grammarly", "Grammarly", "lever"],
      ["webflow", "Webflow", "lever"],
      ["zapier", "Zapier", "lever"],
    ],
  },
  {
    name: "batch-04-lever-plus-ashby",
    focus: "lever",
    entries: [
      ["opensea", "OpenSea", "lever"],
      ["hims", "Hims & Hers", "lever"],
      ["planetscale", "PlanetScale", "lever"],
      ["clari", "Clari", "lever"],
      ["patreon", "Patreon", "lever"],
      ["glossier", "Glossier", "lever"],
      ["checkr", "Checkr", "lever"],
      ["procore", "Procore", "lever"],
      ["clearco", "Clearco", "lever"],
      ["blend", "Blend", "lever"],
      ["talkdesk", "Talkdesk", "lever"],
      ["upstart", "Upstart", "lever"],
      ["opentable", "OpenTable", "lever"],
      ["fivetran", "Fivetran", "lever"],
      ["algolia", "Algolia", "lever"],
      ["openai", "OpenAI", "ashby"],
      ["anthropic", "Anthropic", "ashby"],
      ["linear", "Linear", "ashby"],
      ["retool", "Retool", "ashby"],
      ["perplexity", "Perplexity", "ashby"],
      ["sourcegraph", "Sourcegraph", "ashby"],
      ["vanta", "Vanta", "ashby"],
      ["mercury", "Mercury", "ashby"],
      ["cursor", "Cursor", "ashby"],
      ["runway", "Runway", "ashby"],
    ],
  },
  {
    name: "batch-05-ashby-plus-lever",
    focus: "ashby",
    entries: [
      ["harvey", "Harvey", "ashby"],
      ["replit", "Replit", "ashby"],
      ["pave", "Pave", "ashby"],
      ["ramp-ai", "Ramp AI", "ashby"],
      ["arc", "Arc", "ashby"],
      ["twelve-labs", "Twelve Labs", "ashby"],
      ["heygen", "HeyGen", "ashby"],
      ["glean", "Glean", "ashby"],
      ["shield-ai", "Shield AI", "ashby"],
      ["anduril", "Anduril", "ashby"],
      ["replicate", "Replicate", "ashby"],
      ["modal", "Modal", "ashby"],
      ["pinecone", "Pinecone", "ashby"],
      ["langchain", "LangChain", "ashby"],
      ["weights-biases", "Weights & Biases", "ashby"],
      ["coda", "Coda", "lever"],
      ["attentive", "Attentive", "lever"],
      ["applied-intuition", "Applied Intuition", "lever"],
      ["snyk", "Snyk", "lever"],
      ["tripactions", "Navan", "lever"],
      ["gong", "Gong", "lever"],
      ["onfido", "Onfido", "lever"],
      ["sendgrid", "SendGrid", "lever"],
      ["deel", "Deel", "lever"],
      ["personio", "Personio", "lever"],
    ],
  },
  {
    name: "batch-06-broad-final-mix",
    focus: "mixed",
    entries: [
      ["workday", "Workday", "greenhouse"],
      ["servicetitan", "ServiceTitan", "greenhouse"],
      ["splunk", "Splunk", "greenhouse"],
      ["nutanix", "Nutanix", "greenhouse"],
      ["paloalto", "Palo Alto Networks", "greenhouse"],
      ["deepgram", "Deepgram", "ashby"],
      ["cohere", "Cohere", "ashby"],
      ["mistral", "Mistral", "ashby"],
      ["turing", "Turing", "ashby"],
      ["together", "Together AI", "ashby"],
      ["octoai", "OctoAI", "ashby"],
      ["character", "Character", "ashby"],
      ["crusoe", "Crusoe", "ashby"],
      ["zip", "Zip", "ashby"],
      ["render", "Render", "ashby"],
      ["hightouch", "Hightouch", "lever"],
      ["temporal", "Temporal", "lever"],
      ["n8n", "n8n", "lever"],
      ["cerebras", "Cerebras", "lever"],
      ["chainalysis", "Chainalysis", "lever"],
      ["monday", "monday.com", "lever"],
      ["braze", "Braze", "lever"],
      ["amplitude", "Amplitude", "lever"],
      ["launchdarkly", "LaunchDarkly", "lever"],
      ["mixpanel", "Mixpanel", "lever"],
    ],
  },
];

const tierByBatch = {
  1: "high",
  2: "high",
  3: "medium",
  4: "medium",
  5: "medium",
  6: "low",
};

const cadenceByTier = {
  high: "daily",
  medium: "daily",
  low: "weekly",
};

const all = [];
const seen = new Set();

for (const [batchIdx, batch] of batches.entries()) {
  if (batch.entries.length !== 25) {
    throw new Error(`${batch.name} must contain exactly 25 entries`);
  }

  const batchSources = [];

  for (const [orderIdx, [slug, companyName, provider]] of batch.entries.entries()) {
    if (seen.has(slug)) {
      throw new Error(`Duplicate slug across batches: ${slug}`);
    }
    seen.add(slug);

    const priorityTier = tierByBatch[batchIdx + 1];
    const ingestCadence = cadenceByTier[priorityTier];

    const item = {
      rank: all.length + 1,
      batch: batchIdx + 1,
      batchName: batch.name,
      batchOrder: orderIdx + 1,
      slug,
      companyName,
      provider,
      boardTokenCandidate: slug,
      tokenConfidence: "unverified",
      enabled: true,
      priorityTier,
      ingestCadence,
      owner: "platform",
      status: "candidate_unverified",
      notes: `Initial candidate (${batch.focus}-focused batch)`
    };

    all.push(item);

    batchSources.push({
      slug,
      companyName,
      provider,
      boardToken: slug,
      enabled: true,
      priorityTier,
      ingestCadence,
      owner: "platform",
      notes: `Batch ${String(batchIdx + 1).padStart(2, "0")} onboarding candidate (token unverified)`,
    });
  }

  const batchPath = path.join(
    process.cwd(),
    "data",
    "source-onboarding",
    "batches",
    `${batch.name}.json`,
  );
  fs.writeFileSync(batchPath, `${JSON.stringify(batchSources, null, 2)}\n`, "utf8");
}

if (all.length !== 150) {
  throw new Error(`Expected 150 entries, found ${all.length}`);
}

const candidatePath = path.join(
  process.cwd(),
  "data",
  "source-onboarding",
  "top-150-candidates.json",
);
fs.writeFileSync(candidatePath, `${JSON.stringify(all, null, 2)}\n`, "utf8");

const summary = {
  totalCandidates: all.length,
  batches: batches.map((batch, idx) => ({
    batch: idx + 1,
    name: batch.name,
    size: batch.entries.length,
  })),
  providerCounts: all.reduce(
    (acc, item) => {
      acc[item.provider] += 1;
      return acc;
    },
    { greenhouse: 0, lever: 0, ashby: 0 },
  ),
};

const summaryPath = path.join(
  process.cwd(),
  "data",
  "source-onboarding",
  "batch-summary.json",
);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

console.log(JSON.stringify(summary, null, 2));
