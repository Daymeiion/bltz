# Upstash agent connection status

**October 5 application setup:** The existing account connection remains unchanged. Matching US QStash runtime credentials were subsequently saved only in ignored `.env.local` and verified read-only; see the [application setup report](auth-qstash-setup-2026-10-05.md). No key values, messages, schedules, rotations or production changes are part of this update. The original account-connection verification below remains historical.

Verified October 4, 2026. This record covers the Codex agent connection only; it does not authorize or implement application features.

**Current result: Upstash MCP is configured and verified using the existing Developer API credentials, with normal AVG inspection active.** A fresh native Codex process loaded 59 tools without a discovery error. A real read-only remote MCP `qstash_list_users` call succeeded and returned the same two QStash instances at October 4, 2026, 10:39 AM Pacific (17:39:54 UTC). The founder explicitly approved this authentication switch. No key was copied into the repository, `.env.local`, Codex configuration text, or environment variables. The current chat's preexisting tool inventory may need a Codex app/session refresh to expose the newly configured tools directly.

## Active Developer API MCP configuration

- Canonical server name remains `upstash`, at `https://mcp.upstash.com/mcp`.
- The user-level server configuration is saved in `C:/Users/Administrator/.codex/config.toml`; only `mcp_servers.upstash` was added. Existing unrelated settings were preserved using Codex's native version-checked `config/batchWrite` API.
- Secret-free helper code is installed at `C:/Users/Administrator/.codex/helpers/bltz-upstash-api-headers.mjs`. It imports the installed Upstash CLI `1.4.0` read-only `readConfig()` loader and sends an `Authorization` header only through Codex's private helper stdout pipe. **Never run this helper directly to display its output.**
- The existing Upstash CLI credential store remains the single credential source. Credentials were not duplicated. The helper does not import the CLI launcher, load project dotenv files, or run telemetry. It rejects invalid/control-character values and terminal output, and fails with a fixed error message without printing credentials.
- The supported `mcp logout upstash` command removed only the cached local Upstash OAuth credentials before the API connection was saved. Bare `codex logout` was not used, and no server-side OAuth grant was revoked.
- The explicit user server registration takes precedence over the plugin's bundled MCP registration. Native `pluginId: null` is expected for this configured server; the official Upstash plugin and its skills remain installed.
- Native `authStatus: unknown` is expected for helper authentication: that status inspector does not execute the credential helper. Successful native initialization/tool discovery and the authenticated read-only account call establish that the connection works. Do not treat this label alone as a login failure.
- **Do not run `mcp login upstash` for this configuration.** Cached OAuth takes precedence over the helper and would restore the broken Clerk discovery path.
- Existing Developer API key permissions were not changed. Verification calls were read-only; the connection is not claimed to have a read-only key unless independently established.

| Final verification | Result |
| --- | --- |
| Nonpersistent test before configuration changes | Passed; 59 tools loaded |
| Saved user-level connection in a fresh Codex process | Passed; 59 tools, no discovery error |
| Real remote MCP account tool | `qstash_list_users`, `include_credentials: false`; passed |
| QStash instances | 2: `eu-central-1`, `us-east-1` |
| AVG inspection on MCP endpoint | Still active; public TLS probe reports `AVG Web/Mail Shield Root` |
| Certificate validation | Enabled throughout |
| Installed helper integrity | Matches reviewed secret-free source |
| Account resource mutations | None |
| BLTZ application, environment, database, migrations, deployment | Unchanged |

The successful account verifier communicates directly with the official remote MCP protocol and captures all credential-bearing values privately in memory. It prints only success, count, and allowed region names; neither credentials nor raw account responses are printed or persisted. This is a real MCP account-tool check, separate from the prior Developer API CLI check. No existing chat was resumed or duplicated for it.

The helper depends on the installed CLI's implementation export, not a guaranteed stable public package API. If a future CLI upgrade changes or removes `readConfig()`, the helper fails closed and may need repair. Use existing Upstash CLI credential management for key rotation; do not paste keys into chat or tracked files. Codex's documented helper refresh behavior can reread changed credentials on a new connection or qualifying authorization retry.

References: [Official OpenAI MCP helper documentation](https://learn.chatgpt.com/docs/extend/mcp), [OpenAI configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference), and [Upstash Developer API MCP authentication](https://upstash.com/docs/agent-resources/mcp).

## Confirmed setup

- Official marketplace: `https://github.com/upstash/skills.git`.
- Plugin: `upstash@upstash`, version `1.2.6`, installed and enabled.
- MCP server: `upstash`, configured and enabled at `https://mcp.upstash.com/mcp`; the current explicit user configuration supplies Developer API authentication instead of the plugin's default OAuth.
- The founder reports completing OAuth sign-in and confirms creating an Account Developer API key. Authenticated CLI access and the later successful OAuth/MCP discovery were independently verified as recorded below.

## OAuth/MCP connection checks

Before the approved AVG exception, a separate read-only check through Codex's documented native app-server API (`mcpServerStatus/list`, targeted to `upstash`) returned:

| Check | Result |
| --- | --- |
| Plugin association | `upstash@upstash` |
| Authentication status | `unknown` |
| Available tools | 0 |
| Tool discovery | Failed; authentication required during initialization |
| Native Codex version | `0.160.0`, both the plugin helper and desktop binary |

The earlier supported `mcp login upstash` reconnect command failed before opening a browser or receiving an OAuth callback. Its redacted diagnostic identified OAuth metadata discovery at `clerk.upstash.com`, with an HTTP response decoding error. The later successful login is recorded below.

Independent credential-free HTTP checks confirmed:

- `https://mcp.upstash.com/.well-known/oauth-protected-resource/mcp` responds with HTTP 200 and valid JSON, advertising `https://clerk.upstash.com` as its authorization server.
- Clerk's OAuth authorization-server and OpenID discovery endpoints respond with HTTP 200 and valid JSON.
- Public issuer, authorization, token, registration, documentation, and terms URL fields are present and valid URLs.

These initial checks establish public endpoint reachability. They do not prove account authentication. The later request-shape investigation below identifies a response-body failure more precisely.

### OAuth response-body investigation, October 4

The founder supplied the exact metadata-discovery failure from `mcp login upstash`. Independent source review and credential-free probes found:

- Codex `0.160.0` uses RMCP `3.2.0`. Its authorization metadata schema accepts the current Clerk metadata. The reported HTTP error occurs before typed JSON deserialization; recreating an API key or OAuth client does not address that failure.
- A public metadata GET without `MCP-Protocol-Version` returns HTTP 200, `Content-Length: 1133`, and valid JSON.
- Adding OAuth discovery's actual `MCP-Protocol-Version: 2024-11-05` header reproduces a body failure in both the native Codex HTTP client and Node HTTPS. The response advertises `Transfer-Encoding: chunked`, but the body begins with raw JSON rather than a chunk-size frame. Node reports `HPE_INVALID_CHUNK_SIZE`; native Codex reports `error decoding response body`.
- Changing `Accept` to `application/json` does not fix the actual OAuth request. An earlier comparison changed both `Accept` and the MCP header, so it was not sufficient to attribute the failure to `Accept`.
- Compressed public probes produce correctly framed responses, but Codex's OAuth client does not enable the required response decompression. This is diagnostic evidence, not a supported configuration fix.
- The TLS peer certificate observed on this path is issued by `AVG Web/Mail Shield Root`. Installed software inspection confirms AVG AntiVirus Free `26.9.11171.3833`. This establishes local HTTPS interception. AVG is a strong compatibility suspect; without an uninspected comparison, the origin server and AVG cannot conclusively be separated as causes.
- No supported Codex setting was found to override only the cross-origin metadata request's headers. Configured MCP HTTP headers are scoped to the MCP resource origin, not Clerk's separate authorization-server origin. The already-installed older CLI also sends this protocol header; downgrading is not a demonstrated repair.

No antivirus settings, certificate validation, proxy routes, OAuth caches, account credentials, or Upstash resources were changed. Probes used public URLs only and preserved TLS certificate verification.

The remaining controlled test is a temporary AVG exception for the exact `clerk.upstash.com` host, followed first by the credential-free metadata probe and then, only if it passes, the supported OAuth login. The founder explicitly approved this temporary test in the next reply (`yes`). Manual AVG interaction is still required because native application control is unavailable here. Approval is not evidence that the exception has been added. Keep all other protection enabled; do not exclude all of Upstash, Codex executables, or the repository. Remove the temporary exception after testing and assess whether the connection still works. Updating AVG before that test is a preferable option when available. A permanent exception is not approved or assumed.

Prepared credential-free verification: ignored `output/tinybird-setup/retest-upstash-oauth-metadata.mjs` compares the ordinary metadata request with the exact MCP protocol header, reports only status/error categories and the public certificate issuer, and retains certificate verification. OAuth must not be reported repaired until the header-bearing request and then supported login pass.

### Successful approved exception test

The founder confirmed adding the temporary exception (`done`). The public metadata retest returned HTTP 200 and valid metadata both with and without the MCP protocol header. Neither response advertised chunked encoding, and the public certificate issuer was `WE1` rather than AVG. No credentials were sent by this test; certificate validation remained enabled.

The existing supported `mcp login upstash` flow then exited successfully and reported successful login. Codex itself launched the OAuth browser flow. Authorization URLs and credentials were captured only by the process wrapper in memory, not printed or recorded.

Native read-only MCP discovery at 2026-10-04 17:26:12 UTC returned:

| Check | Result |
| --- | --- |
| Server | `upstash`, plugin `upstash@upstash` |
| Authentication status | `oAuth` |
| Available tools | 59 |
| Discovery error | None |
| Resource endpoint | `https://mcp.upstash.com` |
| QStash verifier schema | `qstash_list_users`, with `include_credentials` defaulting to false |

This verifies OAuth credential use during native MCP initialization and tool discovery. No MCP account-resource tool was executed in this chat. Such a call requires a thread already loaded in that app-server process; the separate diagnostic server cannot reuse the desktop's active thread. The active chat was not resumed or duplicated to obtain a verification call. Account-resource reads remain separately verified through the existing Developer API CLI.

### Retest after restoring normal protection

The founder confirmed removing the exception (`Removed`). Public and native retests reproduced the original failure at 2026-10-04 17:28:05 UTC:

| Check | Result with normal AVG inspection restored |
| --- | --- |
| Ordinary public metadata GET | HTTP 200, valid JSON |
| Metadata GET with actual MCP protocol header | HTTP 200, incorrectly framed chunked body; `HPE_INVALID_CHUNK_SIZE` |
| TLS certificate issuer | `AVG Web/Mail Shield Root` |
| Native saved-authentication status | `oAuth` |
| Native available tools | 0 |
| Native tool discovery | Failed |

A further native check at 2026-10-04 17:29:49 UTC confirmed the error specifically mentions Clerk OAuth metadata and `error decoding response body`; it was not an absent-token or refresh-expiration classification. Saved `oAuth` status alone must not be presented as a working connection.

The controlled failure → narrow exception success → exception removal failure strongly identifies AVG HTTPS inspection compatibility as the cause on this computer. It does not identify which upstream software component should implement the lasting correction. The temporary exception is removed, TLS certificate validation was never disabled, and no wider protection change was made.

The existing Developer API CLI still passed a read-only account check after removal, returning the same two QStash regions. The founder subsequently explicitly approved Developer API authentication for MCP; the working configuration and verification are recorded above. This is an approved authentication switch, not an OAuth repair. No lasting antivirus exception is required by the current setup. Keeping one would still require separate explicit approval: AVG's Website/Domain exceptions exclude that domain from all scans and shields, not just the public metadata URL. No permanent antivirus exception is approved or assumed.

References: [OpenAI OAuth HTTP adapter source](https://raw.githubusercontent.com/openai/codex/rust-v0.160.0/codex-rs/rmcp-client/src/oauth_http_client.rs), [RMCP authorization implementation](https://docs.rs/rmcp/3.2.0/src/rmcp/transport/auth.rs.html), [AVG HTTPS scanning](https://support.avg.com/SupportArticleView?l=en&urlname=use-avg-antivirus-https-scan), and [AVG exceptions and risk](https://support.avg.com/SupportArticleView?l=en&urlname=avg-antivirus-scan-exclusions).

### Requested recheck before application setup

The founder requested another connection check before adding application credentials. Repeated native read-only discovery still returned `authStatus: unknown`, zero tools, and authentication required during initialization. The current chat also still exposes no Upstash tools. At that point, neither account-access path had been independently verified; Developer API authorization was subsequently verified below. No new login flow, installation, application environment change, or resource mutation was initiated for that recheck.

Latest explicit authorization test: 2026-10-04 14:12:28 UTC. The same read-only native check again returned unknown authentication status, zero tools, and authentication required. The requested skills-installation attempt was interrupted before any install command ran; it has not been reported as complete. No OAuth reconnect was initiated during this authorization test.

## Developer API account verification

Verified at 2026-10-04 14:19:26 UTC using installed `@upstash/cli` version `1.4.0`. No new login or secret entry was necessary: the existing CLI authentication successfully completed a read-only `qstash list` request.

Reverified at 2026-10-04 14:33:05 UTC after the OAuth response-body investigation: account authorization still passes, with the same two regions and no resource mutations.

Reverified again at 2026-10-04 17:29:49 UTC after restoring AVG protection: account authorization still passes, with the same two regions and no resource mutations.

| Check | Result |
| --- | --- |
| Account authorization | Passed via Upstash Developer API/CLI |
| QStash instance count | 2 |
| Regions | `eu-central-1`, `us-east-1` |
| Resource changes | None |
| Application environment changes | None |

The installed CLI's raw QStash list response can include credential fields. The verifier captures that response only in memory and exposes an allowlist containing authorization status, instance count, and regions. Raw account responses, tokens, passwords, and credential values were not printed or written to logs or source. The one-time verifier is in ignored `output/tinybird-setup/verify-upstash-cli-account.mjs`.

Keep the account Developer API key separate from BLTZ's application environment. Application publishing uses a distinct `QSTASH_TOKEN`, and receiving deliveries requires appropriate signature verification and signing keys when that integration is authorized. No application QStash workflow was implemented by this account-access check.

## Historical OAuth limitation

OAuth/MCP native initialization and discovery passed only while the approved temporary exception was active; they failed after its removal. Do not repeat OAuth login or recommend restarting as a fix for that historical metadata failure. The active Developer API MCP configuration avoids Clerk discovery and is now verified with AVG protection unchanged. A Codex restart may refresh this already-running chat's tool inventory; it is not needed to repair the saved API connection. Never print raw account responses or bypass certificate validation.

## Completion record

| Item | Result |
| --- | --- |
| Summary | Approved Developer API MCP authentication is configured and verified, with 59 tools and a successful real read-only QStash MCP account call. AVG protection remains unchanged. |
| Files changed | This status document; user-level Codex `config.toml` only at `mcp_servers.upstash`; installed secret-free helper outside the repository. Temporary checks and generated protocol schemas remain in ignored `output/tinybird-setup/`. |
| Routes, database, migrations | No application changes. |
| Environment variables | No application or registry environment changes. No keys or authorization URLs recorded in this document. Credentials remain in the existing Upstash CLI credential store. |
| Permission changes | Upstash's local OAuth cache was logged out through the supported command. The existing Developer API key scope is reused unchanged; no provider roles/key permissions or BLTZ permissions changed. The temporary AVG exception remains removed. |
| Checks run | Reviewed helper/configuration code, nonpersistent native MCP test, version-checked native configuration write, fresh native discovery, real read-only remote MCP account tool with credentials disabled, public TLS inspection check, helper hash comparison, script syntax checks, and scoped diff/ignored-path validation. Earlier OAuth/API diagnostics remain recorded above. Application tests/build were not rerun for this connection-only task. |
| Manual verification | Founder approved the authentication switch after confirming removal of the AVG exception. Native MCP discovery and the real remote MCP account lookup independently passed after saving the configuration. |
| Known limitations | This already-running chat has no direct Upstash tool namespace until tool inventory refresh. The helper depends on the installed CLI loader export and existing saved credentials. The historical OAuth path remains incompatible with AVG inspection. |
| Deferred work | Refresh this chat's tool inventory, any future AVG OAuth compatibility repair, application QStash configuration, provisioning, schedules, workflows, and production deployment. No application work was performed in this task. |

No resources were created or modified, and no changes were committed or pushed. This setup adds access to an existing third-party workflow rather than duplicating it; it introduces no Career, Moment, or Value Graph relationships or schemas.
