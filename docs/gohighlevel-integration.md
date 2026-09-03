# GoHighLevel Integration

How this project (and Claude, when working on it) reaches the GoHighLevel API.

## The constraint

Claude Code sessions that run on the web execute inside a sandboxed container
whose outbound network access is governed by an egress policy. In this
environment that policy denies **all** general internet hosts — including
`services.leadconnectorhq.com`, `rest.gohighlevel.com` and `api.msgsndr.com`.
Connections fail at the proxy with `connect_rejected` before TLS is attempted.

The practical consequence: **a GHL credential pasted into a session cannot be
used directly from that session.** Holding a valid token changes nothing if the
host is unreachable. Calls have to be relayed by a service that is already
reachable.

## The architecture

```
Claude  ──MCP──>  Make (us2.make.com)  ──HTTPS──>  services.leadconnectorhq.com
```

Make is reachable because it is an MCP server rather than a general web host, and
Make's own servers have unrestricted access to the GHL API. Make holds the
credential; Claude only ever passes request parameters.

## The pieces

| Piece | ID | Notes |
|---|---|---|
| Make organization | `6966204` | zone `us2.make.com` |
| Make team | `2027498` | |
| GHL connection | `9941031` | "GoHighlevel Location OAuth 2.0", 12 scopes |
| GHL location | `R9jCDx92OdJxLvCM8vIl` | sub-account "Scalia" |
| Relay scenario | `5814457` | "GHL Read (on-demand) — API tool" |

The relay wraps the `highlevel:universal` module ("Make an API Call"), which
performs an arbitrary authorized call against `https://services.leadconnectorhq.com`
and injects the Authorization header from connection `9941031`.

### Inputs

| Input | Required | Purpose |
|---|---|---|
| `method` | yes | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| `path` | yes | Path relative to the API root, e.g. `/contacts/` |
| `locationId` | no | Sent as the `locationId` query param; defaults to the Scalia location |
| `body` | no | JSON body for writes; empty for reads |

### Mapping syntax

Scenario inputs are referenced in the module mapper as `{{var.input.<name>}}`.

This matters: `{{scenario.<name>}}` is **not** correct and fails silently — the
placeholder does not resolve, the module requests the API root instead of the
intended path, and GHL answers `404`. A 404 from this relay usually means a
mapping mistake, not a missing endpoint.

## Known limitations

- **Scope gaps.** The OAuth connection carries 12 scopes, which do not cover
  everything. `/workflows/` returns `[401] The token is not authorized for this
  scope.` Endpoints outside the granted scopes need the connection to be
  reauthorized in Make with the additional scopes selected.
- **No response payload from a plain scenario.** An on-demand *scenario* returns
  only `{executionId, status}` to its caller; declaring an `interface.output`
  does not bind response data to it, and `executions_get-detail` reports only
  `SUCCESS`/`ERROR`. Returning the response body requires a Make **Tool**
  (`tools_create`) rather than a scenario.
- **Active scenario cap.** The Make plan limits how many scenarios may be active
  at once; creating a Tool can require deactivating something first.

## Credential handling

Do **not** put a GHL credential in this repository.

This is a Vite single-page app. Everything reachable from client code ends up in
the built bundle, and that includes any `VITE_*` environment variable — Vite
inlines those at build time by design. A Private Integration Token (`pit-…`) or
an API key committed here, or exposed through a `VITE_*` variable, is
world-readable to anyone who loads the site.

If the app itself needs GHL data, add a server-side route (a serverless function
or small backend) that holds the token in a non-`VITE_` server environment
variable and proxies the request. The browser talks to that route; the token
never leaves the server.

Rotate any token that has been pasted into a chat, a terminal, or a ticket:
GHL → Settings → Private Integrations → revoke and reissue.
