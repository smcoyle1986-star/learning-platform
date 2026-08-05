# Classendo legal operations

Internal working guide for CLASSENDO LTD. Review it whenever the product, providers, prices, target customers or countries change. This is an operational checklist, not a substitute for advice from a solicitor, accountant or tax adviser.

## Refund requests

1. The teacher selects **Request a refund** in their profile or emails `classendosupport@gmail.com`.
2. Ask for the account email, Stripe receipt or invoice number, payment date and reason. Never ask for full card details.
3. Confirm whether this is the first paid subscription and whether the request arrived within 14 days. Also consider any stronger mandatory right in the customer's country, duplicate charges, technical failure or exceptional circumstances.
4. Record the request, decision, reason, amount, currency and decision date in a restricted-access log.
5. If approved, open the payment in the Stripe Dashboard and issue the refund to the original payment method. Stripe does not refund a payment merely because a subscription is cancelled.
6. For a full refund, cancel the subscription immediately so Premium access ends. For a declined refund with ordinary cancellation, cancel at the end of the billing period so access continues until then.
7. Email the decision. Explain that an approved card refund is initiated immediately but the bank may take approximately 5–10 business days to display it.
8. Check Classendo's profile/subscription state after the Stripe webhook arrives. Investigate any account that remains Premium after an immediate full refund and cancellation.

Stripe may retain its processing fees. The customer should still receive the full approved refund; that fee is a cost to CLASSENDO LTD and must not silently be deducted from the customer's refund.

## Stripe setup

- Keep customer portal cancellation enabled.
- Enable Stripe emails for successful payments, refunds and failed payments.
- Keep webhook signing secrets separate between test and live mode.
- Monitor failed webhook deliveries and retry or reconcile them promptly.
- Show price, currency, billing interval, renewal, cancellation and refund information before checkout.

## Privacy and cookies

- Keep optional analytics off until the visitor consents. Necessary authentication and work-saving storage may operate without optional consent.
- Re-audit cookies and browser storage whenever a third-party script, analytics product, chat widget or advertising tool is added.
- Maintain a current list of processors, purposes, countries and transfer safeguards.
- Complete deletion and access requests promptly, normally within one month under UK GDPR.
- Check whether CLASSENDO LTD must pay the ICO data-protection fee and renew it when applicable.
- Do not let teachers upload identifiable pupil, safeguarding, health or other sensitive student information.

## Online safety and community content

- Maintain the separate online-safety risk assessment and review it at least annually and whenever community or messaging features change.
- Make Report controls easy to find, preserve evidence, acknowledge reports and record the outcome.
- Prioritise suspected illegal content, threats, child sexual exploitation, grooming, hate, terrorism, scams and doxxing.
- Give users a clear complaint/appeal route for moderation decisions.
- Preserve only the minimum information required for investigations and legal obligations.

## Tax and international sales

- Stripe processing is not the same as tax registration, filing or remittance.
- Before material sales into another country, ask a cross-border digital-services tax adviser whether registration, VAT/GST/sales tax collection or local invoices are required.
- Monitor UK VAT registration obligations and turnover thresholds. If Stripe Tax is enabled later, configure registrations and filing/remittance rather than assuming Stripe completes them automatically.

## Legal review triggers

Arrange a focused legal review before any of these changes:

- selling to schools or permitting school-managed accounts;
- permitting users under 18 to create accounts;
- direct pupil profiles, tracking or communications;
- direct messaging, comments, live chat or larger public community features;
- targeted advertising or sale/sharing of personal information;
- materially different AI processing or training on user content;
- hiring staff or contractors who handle user data;
- a major new market, local entity or tax registration;
- a data breach, regulator contact or serious safety incident.
