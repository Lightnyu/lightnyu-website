# LIGHTNYU landing page
Cloudflare Pages production domain: lightnyu.co.uk.

Production settings: D1 binding DB; encrypted secret TURNSTILE_SECRET_KEY; plaintext public variables WAITLIST_CONTROLLER_NAME and WAITLIST_CONTACT_EMAIL (the real operator and monitored privacy contact, both shown publicly in the privacy notice). Redeploy after changing bindings. The subscribers table is initialized automatically after a valid Turnstile response. No SQL setup required. Review the privacy notice, actual retention commitments and Cloudflare processing/transfer terms before public promotion.

Registration records unverified interest only. No launch email or verification email is sent. Implement email ownership confirmation and unsubscribe management before sending any promotional email. No public software routes or subscriber read endpoint.
