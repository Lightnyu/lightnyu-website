# Anatolii Private Club — version 14

This branch contains the prepared portfolio deployment. It is separate from this repository's LIGHTNYU production branch.

## Cloudflare Pages settings

- Project name: `anatolii-private-club`
- Repository: `Lightnyu/lightnyu-website`
- Production branch: `anatolii-private-club`
- Framework preset: None
- Build command: `exit 0`
- Build output directory: `/`
- Root directory: leave empty

Create a D1 database named `anatolii-private-club-enquiries`. In this new Pages project's production settings, bind it as `ANATOLII_DB`, then redeploy. The form creates its enquiry table after the first valid submission. The dedicated binding keeps its records separate from LIGHTNYU.

Add `anatoliiprivate.club` under this new project's Custom domains. If the domain is already an active Cloudflare zone, Cloudflare can add the required DNS record automatically. The previous ChatGPT Sites domain attachment is separate from this deployment.

The page and browser assets come from version 14. The enquiries API preserves its validation and consent rules. No database records, tokens, or other credentials are included in this branch. Until the dedicated database is bound, submissions show an unavailable message and do not claim to have been stored.
