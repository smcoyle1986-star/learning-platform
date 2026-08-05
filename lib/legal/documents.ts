import { COMPANY, LEGAL_EFFECTIVE_DATE } from "@/lib/legal/constants";

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  summary: string;
  sections: LegalSection[];
};

const companyIdentity = `${COMPANY.legalName} (company number ${COMPANY.companyNumber}), registered in ${COMPANY.jurisdiction}, with its registered office at ${COMPANY.registeredOffice}`;

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: "terms",
    title: "Terms of Service",
    summary: "The contract governing Classendo accounts, subscriptions, content and use of the service.",
    sections: [
      {
        title: "1. Who we are and these Terms",
        paragraphs: [
          `Classendo is operated by ${companyIdentity} ("Classendo", "we", "us" or "our"). These Terms form a contract between Classendo and the person creating or using an account.`,
          "By creating an account or using a paid feature, you confirm that you have read and agree to these Terms. Our Privacy Notice explains how we use personal information and does not form part of the contract.",
        ],
      },
      {
        title: "2. Eligibility and classroom use",
        bullets: [
          "You must be at least 18 years old to create or hold a Classendo account.",
          "Accounts are currently offered to individual teachers and other adult education professionals, not directly to schools or pupils.",
          "Children may take part in teacher-led classroom activities, but must not create accounts, make purchases, publish content or independently use community features.",
          "You must not enter or upload identifiable pupil information, safeguarding information, health information, student photographs or other sensitive personal information unless you have a lawful basis and all necessary permissions. We recommend never uploading this information.",
        ],
      },
      {
        title: "3. Accounts",
        bullets: [
          "Provide accurate information and keep it current.",
          "Keep your password and account secure and tell us promptly if you suspect unauthorised use.",
          "One person may not impersonate another person, share an account to avoid plan limits or create accounts to abuse trials, refunds or community features.",
          "You are responsible for activity carried out through your account unless caused by our failure to use reasonable care and skill.",
        ],
      },
      {
        title: "4. Basic, welcome trial and Premium",
        paragraphs: [
          "New eligible accounts may receive a 14-day welcome trial of Premium without providing payment details. At the end of that trial, the account automatically moves to Basic unless the user separately purchases Premium. The welcome trial does not automatically become a paid subscription.",
          "Premium subscriptions are offered on monthly or yearly billing periods. The price, currency, applicable taxes, billing interval and renewal information shown at checkout form part of the contract. Paid subscriptions renew automatically until cancelled.",
          "You may cancel through the Stripe-hosted billing portal available from your Classendo profile. Unless a refund or immediate cancellation applies, cancellation takes effect at the end of the current paid billing period and Premium remains available until then.",
        ],
      },
      {
        title: "5. Payments, cancellations and refunds",
        paragraphs: [
          "Stripe processes payments for Classendo. Classendo does not receive or store your complete card number. You authorise recurring charges at the interval and price disclosed at checkout until cancellation.",
          "Our Cancellation and Refund Policy forms part of these Terms. Nothing in these Terms limits a consumer right that cannot legally be excluded in your country.",
        ],
      },
      {
        title: "6. Classendo content and licence",
        paragraphs: [
          "The service, software, branding, designs, educational images and Classendo-created resources are owned by Classendo or its licensors and are protected by intellectual-property laws.",
          "We grant you a personal, limited, non-exclusive, non-transferable and revocable licence to use Classendo resources for your own teaching and classroom preparation while your account has access. You may print or display resources for your own classes, but may not resell, sublicense, scrape, systematically download, republish or use them to build a competing content library or service.",
        ],
      },
      {
        title: "7. Your content and public sharing",
        paragraphs: [
          "You keep ownership of lesson sets, text and images you upload or create. You confirm that you have the rights and permissions needed to use and share that content.",
          "You give Classendo a worldwide, non-exclusive, royalty-free licence to host, reproduce, process, adapt for technical display, and make your content available as necessary to operate, secure and improve the service. If you deliberately make content public, this licence also allows us to display and distribute it to Classendo users and to let them copy it into their own teaching resources.",
          "A copy another teacher has already added to their account may remain after you delete or privatise the original. We may preserve content when required for security, legal compliance, dispute resolution, backups or enforcement.",
        ],
      },
      {
        title: "8. AI-assisted and generated material",
        bullets: [
          "AI features may produce inaccurate, incomplete, unsuitable or non-unique results.",
          "You must review generated material before using it with learners and remain responsible for instructional decisions.",
          "Do not submit personal or confidential pupil information to AI features.",
          "We do not guarantee that generated output is exclusive to you or that similar output will not be produced for others.",
        ],
      },
      {
        title: "9. Acceptable use, moderation and safety",
        paragraphs: [
          "You must follow our Community Guidelines and Online Safety Policy. We may investigate reports and remove, restrict or reduce the visibility of content that is illegal, unsafe, infringing or contrary to those policies.",
          "We may warn, suspend or terminate an account where reasonably necessary to protect users, comply with law, prevent fraud or enforce these Terms. Where appropriate, we will explain the decision and provide a route to appeal.",
        ],
      },
      {
        title: "10. Availability and changes",
        paragraphs: [
          "We aim to provide a reliable service but do not promise uninterrupted availability. Maintenance, security incidents, provider outages and events outside our reasonable control may affect access.",
          "We may improve, replace or discontinue features. If a material change significantly reduces a paid service during a current billing period, we will provide reasonable notice where practical and any remedy required by law.",
        ],
      },
      {
        title: "11. Consumer rights and liability",
        paragraphs: [
          "Services must be supplied with reasonable care and skill, and digital content must be as described, fit for purpose and of satisfactory quality where applicable law requires. Nothing in these Terms excludes those statutory rights.",
          "We do not exclude liability where it would be unlawful, including liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation. If you are a consumer, we are responsible for foreseeable loss caused by our breach, but not loss that was not foreseeable, avoidable loss, or business loss arising from use outside your personal consumer capacity.",
        ],
      },
      {
        title: "12. Governing law, complaints and changes",
        paragraphs: [
          "These Terms are governed by the laws of England and Wales. The courts of England and Wales have jurisdiction, but consumers living elsewhere retain any mandatory protections and rights to bring proceedings available under local law.",
          `Contact ${COMPANY.supportEmail} with a complaint. We may update these Terms for legal, security or service reasons. Material changes will be brought to account holders' attention and will apply prospectively from the stated effective date.`,
        ],
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Notice",
    summary: "How Classendo collects, uses, shares, retains and protects personal information.",
    sections: [
      {
        title: "1. Controller and contact",
        paragraphs: [
          `${COMPANY.legalName} is the controller of personal information described in this Notice. Our company number is ${COMPANY.companyNumber}, our registered office is ${COMPANY.registeredOffice}, and privacy enquiries can be sent to ${COMPANY.supportEmail}.`,
        ],
      },
      {
        title: "2. Information we collect",
        bullets: [
          "Account information: email address, username, country or region, encrypted authentication credentials, profile details and account identifiers.",
          "Teaching content: lesson sets, cards, worksheets, prompts, uploaded images, filenames and choices about whether content is public or private.",
          "Billing information: Stripe customer and subscription identifiers, plan, billing interval, payment status, country, transaction and refund records. Stripe, not Classendo, handles complete payment-card details.",
          "Usage information: features used, searches, resource interactions, session identifiers and timestamps when analytics consent is given or where collection is strictly necessary.",
          "Technical and security information: IP address, browser and device information, authentication logs, error logs and information used to prevent abuse and secure the service.",
          "Communications: support, feedback, refund, safety, copyright and complaint correspondence.",
        ],
      },
      {
        title: "3. Purposes and lawful bases",
        bullets: [
          "Contract: to create and administer accounts, provide features, save resources, process subscriptions, supply Premium and respond to service requests.",
          "Legal obligation: to keep accounting records, respond to lawful requests, protect consumer rights and comply with tax, company, data-protection and online-safety duties.",
          "Legitimate interests: to secure Classendo, prevent fraud, moderate public content, diagnose faults, understand service performance and improve teaching tools, where those interests are not overridden by your rights.",
          "Consent: for non-essential analytics/storage technologies and any optional marketing. Consent can be withdrawn at any time without affecting prior lawful processing.",
        ],
      },
      {
        title: "4. Children and pupil information",
        paragraphs: [
          "Classendo accounts are for adults aged 18 or over. We do not knowingly offer accounts directly to children. Teachers must not upload identifiable pupil information or sensitive student material. If you believe a child has created an account or pupil data has been uploaded, contact us so we can investigate and remove it where appropriate.",
        ],
      },
      {
        title: "5. Providers and recipients",
        paragraphs: [
          "We share information only where necessary with service providers acting for us or as independent controllers. These currently include Supabase for authentication, databases and file storage; Stripe for checkout, subscriptions, fraud prevention and refunds; our website hosting and infrastructure providers; and, when an AI feature is used, relevant AI-processing providers such as OpenAI or Replicate. We may also share information with professional advisers, regulators, courts, law enforcement or a purchaser of the business where legally permitted.",
          "Public usernames and deliberately public lesson content can be viewed by other Classendo users. Do not make information public if you do not want other users to access or copy it.",
        ],
      },
      {
        title: "6. International transfers",
        paragraphs: [
          "Some providers process information outside the United Kingdom. Where required, we use recognised safeguards such as UK adequacy regulations, the UK International Data Transfer Agreement or Addendum, and contractual and technical protections. Contact us to request further information about applicable safeguards.",
        ],
      },
      {
        title: "7. Retention",
        bullets: [
          "Account and saved teaching content: while the account is active, then normally deleted or anonymised within 30 days of a valid deletion request, subject to backups and legal exceptions.",
          "Backups: normally overwritten within 90 days.",
          "Billing, tax and transaction records: generally six years after the relevant financial period or longer if legally required.",
          "Security and access logs: normally up to 12 months, longer where needed to investigate an incident or prevent abuse.",
          "Content reports, complaints and enforcement records: normally up to three years after closure, longer where litigation, safeguarding or legal obligations require.",
          "Cookie-consent records: for as long as needed to demonstrate and respect the latest preference.",
        ],
      },
      {
        title: "8. Your rights",
        paragraphs: [
          "Depending on your location and the lawful basis, you may have rights to access, correct, erase, restrict, object to or receive a portable copy of personal information, and to withdraw consent. You may also complain to the UK Information Commissioner's Office or your local data-protection authority.",
          `Send requests to ${COMPANY.supportEmail}. We may need to verify your identity. We will not discriminate against you for exercising a privacy right.`,
        ],
      },
      {
        title: "9. Security and automated decisions",
        paragraphs: [
          "We use access controls, authentication, encryption in transit, restricted administrative access and other proportionate safeguards. No online service can guarantee absolute security.",
          "Classendo does not currently make solely automated decisions that produce legal or similarly significant effects for users. Automated security signals may assist human review of fraud, abuse or content reports.",
        ],
      },
      {
        title: "10. Updates",
        paragraphs: [
          `This Notice is effective from ${LEGAL_EFFECTIVE_DATE}. We will update it when our processing or legal obligations materially change and will bring significant changes to users' attention where appropriate.`,
        ],
      },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie and Storage Policy",
    summary: "The cookies, local storage and similar technologies Classendo uses and your choices.",
    sections: [
      {
        title: "1. What this policy covers",
        paragraphs: [
          "Cookies and similar storage technologies include browser cookies, local storage and session storage. They can remember authentication, teaching work, preferences and analytics identifiers. This Policy should be read with our Privacy Notice.",
        ],
      },
      {
        title: "2. Strictly necessary technologies",
        bullets: [
          "Supabase authentication cookies or storage used to keep you signed in and protect sessions.",
          "Security and load-balancing technologies required to deliver the site safely.",
          "Local or session storage used to preserve lesson trays, editing state, print jobs and other features you request.",
          "The `classendo-cookie-consent` preference used to remember whether you accepted or rejected optional analytics.",
        ],
      },
      {
        title: "3. Optional analytics",
        paragraphs: [
          "With permission, Classendo records limited product events such as vocabulary searches, flashcard interactions and worksheet selections. A random session identifier may be stored in session storage as `classendo-analytics-session` to reduce duplicate events. We use this information to understand and improve the service, not for behavioural advertising.",
          "Optional analytics does not run until you select Accept analytics. Rejecting it does not affect core Classendo features.",
        ],
      },
      {
        title: "4. Your choices",
        paragraphs: [
          "Use the cookie banner or the Cookie preferences control in the footer to accept or reject optional analytics. You can change your decision later. Rejecting analytics removes the Classendo analytics session identifier where technically possible.",
          "Browser controls can delete or block storage, but blocking strictly necessary authentication or feature storage may prevent parts of Classendo from working.",
        ],
      },
      {
        title: "5. Changes and contact",
        paragraphs: [
          `We review this Policy when technologies change. Contact ${COMPANY.supportEmail} with questions about cookies or storage.`,
        ],
      },
    ],
  },
  {
    slug: "refunds",
    title: "Cancellation and Refund Policy",
    summary: "How to cancel Premium, request a refund and exercise applicable consumer rights.",
    sections: [
      {
        title: "1. Cancelling renewal",
        paragraphs: [
          "You can cancel a paid subscription at any time through Manage Billing in your profile. Normal cancellation stops the next automatic charge. Premium remains available until the end of the current paid monthly or yearly billing period, after which the account moves to Basic.",
        ],
      },
      {
        title: "2. First paid subscription",
        paragraphs: [
          "If you are an individual consumer, you may request a full refund within 14 days after your first paid Classendo subscription begins. This policy is intended to provide a clear minimum and does not reduce any stronger mandatory right under local law.",
          "An approved full refund ends the paid subscription and Premium access immediately. A free welcome trial requires no payment details and automatically moves to Basic, so no cancellation or refund is needed for that trial.",
        ],
      },
      {
        title: "3. Renewals",
        bullets: [
          "Monthly renewal payments are normally non-refundable once charged, except where required by law, the service is materially faulty or unavailable, or we approve a goodwill refund.",
          "A full refund may be requested within 14 days after an annual subscription renewal.",
          "Cancel before the renewal date to avoid the next charge. We will implement any additional mandatory renewal reminders or cooling-off rights that apply to you.",
        ],
      },
      {
        title: "4. Faults and statutory rights",
        paragraphs: [
          "Digital services and content must meet applicable statutory standards. Where Classendo is materially not as described, not provided with reasonable care and skill, or unavailable for an unreasonable period, contact us. Depending on the circumstances and applicable law, the remedy may include correction, restored access, a price reduction, partial refund or full refund.",
          "Nothing in this Policy excludes consumer rights that cannot legally be excluded.",
        ],
      },
      {
        title: "5. Requesting a refund",
        paragraphs: [
          `Email ${COMPANY.supportEmail} from the address associated with your Classendo account. Use the subject “Refund request” and include the account email, transaction date, plan and brief reason. Do not include complete card or bank details.`,
          "We review requests before approval to prevent mistakes, duplicate refunds, abuse and conflict with payment disputes. We may ask for information reasonably necessary to locate the transaction or verify the account.",
        ],
      },
      {
        title: "6. How approved refunds are paid",
        paragraphs: [
          "Approved refunds are initiated through Stripe and can only be returned to the original payment method. We do not deduct Stripe processing fees from a customer refund that this Policy describes as full.",
          "Banks and payment providers normally display a refund within approximately 5–10 business days after Stripe initiates it, although timing can vary. If a refund fails, we will contact you to arrange a lawful alternative.",
        ],
      },
      {
        title: "7. Currency and taxes",
        paragraphs: [
          "Refunds are issued in the original transaction currency. Exchange-rate changes or fees imposed independently by a bank or card provider are outside Classendo's control. Taxes are refunded where and to the extent required by the applicable tax rules.",
        ],
      },
    ],
  },
  {
    slug: "community-guidelines",
    title: "Community Guidelines",
    summary: "Rules for public lesson sets, uploads, teacher interaction and moderation.",
    sections: [
      {
        title: "1. Purpose and adult users",
        paragraphs: [
          "The Classendo community lets adult teachers share and reuse educational resources. Account holders and contributors must be at least 18. The community is not a pupil social network and must not be used to communicate with or profile children.",
        ],
      },
      {
        title: "2. Share responsibly",
        bullets: [
          "Only publish material you created or have permission to share.",
          "Remove names, photographs, voices, contact information and other identifiers relating to pupils or colleagues.",
          "Check educational accuracy, age suitability and cultural context before publishing.",
          "Use accurate titles, tags and descriptions; do not manipulate downloads, reports or engagement.",
        ],
      },
      {
        title: "3. Prohibited content and conduct",
        bullets: [
          "Illegal content or activity, including terrorism, fraud, threats, child sexual exploitation or abuse material, and unlawful hate content.",
          "Bullying, harassment, stalking, doxxing, intimidation or content encouraging suicide, self-harm or dangerous acts.",
          "Sexual or pornographic content, sexualised content involving minors, graphic violence or material unsuitable for a teacher resource community.",
          "Discrimination or hateful attacks based on protected or personal characteristics.",
          "Copyright, trademark, privacy or other rights infringement.",
          "Malware, credential theft, spam, scams, deceptive links, unauthorised advertising or attempts to evade security and access limits.",
          "Uploading sensitive personal data, confidential school information or content that creates a safeguarding risk.",
        ],
      },
      {
        title: "4. Moderation",
        paragraphs: [
          "We may review reports and available context; reduce visibility; remove content; preserve relevant evidence; warn users; restrict features; or suspend or terminate accounts. Decisions are based on these Guidelines, our Terms, applicable law and the seriousness, frequency and context of conduct.",
          "We may use automated signals to prioritise material, but significant enforcement decisions may be reviewed by a person where appropriate.",
        ],
      },
      {
        title: "5. Reports and appeals",
        paragraphs: [
          `Use the Report control on a community set or email ${COMPANY.supportEmail}. Identify the content, explain the concern and state whether anyone appears to be in immediate danger. Do not send illegal files by email.`,
          `To appeal a content or account decision, email ${COMPANY.supportEmail} with the subject “Moderation appeal” and explain why you believe the decision should change. We will review appeals fairly and may uphold, vary or reverse the decision.`,
        ],
      },
    ],
  },
  {
    slug: "copyright",
    title: "Copyright and Takedown Policy",
    summary: "Ownership rules and the process for reporting allegedly infringing material.",
    sections: [
      {
        title: "1. Respecting rights",
        paragraphs: [
          "Classendo respects copyright, trademark, privacy and other rights. Users must only upload or publish content they own, that is licensed for the intended use, or that they are otherwise legally permitted to use. Giving credit does not by itself create permission.",
        ],
      },
      {
        title: "2. Reporting infringement",
        paragraphs: [
          `Send a notice to ${COMPANY.supportEmail} with the subject “Copyright notice”. Include your name and contact details; identification of the protected work; the exact Classendo URL or sufficient information to locate the material; the basis of your rights; why the use is not authorised; and a statement that the information is accurate and submitted in good faith.`,
          "Do not knowingly submit false or misleading notices. We may request identity, authority or ownership evidence before acting.",
        ],
      },
      {
        title: "3. Our response",
        paragraphs: [
          "We may temporarily restrict material while reviewing a notice, contact the uploader, request further information, remove or restore content, and act against repeat or serious infringement. We may preserve information or disclose it where lawfully required.",
        ],
      },
      {
        title: "4. Challenging a removal",
        paragraphs: [
          `If your content was removed and you believe you had permission or another lawful basis, email ${COMPANY.supportEmail} with the subject “Takedown appeal”, identify the material and provide supporting evidence. We will reconsider the decision and may contact the original reporter.`,
        ],
      },
    ],
  },
  {
    slug: "online-safety",
    title: "Online Safety and Reporting Policy",
    summary: "How Classendo assesses risks, receives reports and responds to illegal or harmful content.",
    sections: [
      {
        title: "1. Scope",
        paragraphs: [
          "Classendo provides user-to-user features because adult teachers can publish lesson sets and uploaded material that other users encounter. We operate proportionate systems intended to reduce illegal-content risk while supporting legitimate educational sharing.",
        ],
      },
      {
        title: "2. Children",
        paragraphs: [
          "Accounts and community publishing are restricted to people aged 18 or over. Children may see teacher-selected content during supervised classroom activities, but Classendo is not offered to them as an independent account-based service. We assess whether children are likely to access relevant parts of the service and review that assessment when features materially change.",
        ],
      },
      {
        title: "3. Risk management",
        bullets: [
          "Maintain written illegal-content and children-access assessments and review them at least annually and before significant relevant changes.",
          "Provide content reporting and complaints routes that are accessible to users.",
          "Use proportionate moderation, access controls, records and escalation processes.",
          "Remove illegal content swiftly when we become aware of it and preserve or report material where law requires.",
          "Name an accountable individual within Classendo for online-safety compliance.",
        ],
      },
      {
        title: "4. Reporting content",
        paragraphs: [
          `Use the in-product Report control or email ${COMPANY.supportEmail} with the subject “Urgent safety report”. Include the URL or set name, the type of concern, relevant context and whether there is an immediate threat. Do not download, copy or email suspected child sexual abuse material or other illegal files.`,
          "If someone is in immediate danger, contact the relevant emergency service. Classendo support is not an emergency service.",
        ],
      },
      {
        title: "5. Complaints",
        paragraphs: [
          "You may complain if you believe we failed to act on illegal content, wrongly restricted lawful content, or did not apply our Terms consistently. We will acknowledge, assess and determine complaints within a reasonable period based on urgency and complexity, and explain the outcome where legally and operationally appropriate.",
        ],
      },
      {
        title: "6. Law-enforcement and regulatory cooperation",
        paragraphs: [
          "We respond to valid legal requests and make mandatory reports to the appropriate authorities where required. We do not promise confidentiality where disclosure is necessary to protect a person, investigate illegal activity or comply with law.",
        ],
      },
    ],
  },
  {
    slug: "accessibility",
    title: "Accessibility Statement",
    summary: "Our approach to making Classendo usable by teachers with different access needs.",
    sections: [
      {
        title: "1. Our commitment",
        paragraphs: [
          "Classendo aims to provide an inclusive experience and to work toward WCAG 2.2 Level AA where reasonably practicable. Accessibility is considered across navigation, forms, keyboard use, colour contrast, focus visibility and meaningful labels.",
        ],
      },
      {
        title: "2. Current limitations",
        bullets: [
          "Some legacy game interfaces and interactive canvas experiences may not yet be fully operable with a keyboard or screen reader.",
          "Some older educational images may have limited alternative text.",
          "Generated PDFs and highly visual classroom materials may not preserve all semantic structure expected by assistive technology.",
          "Third-party interfaces, including Stripe checkout and billing, have their own accessibility implementation.",
        ],
      },
      {
        title: "3. Getting help",
        paragraphs: [
          `If a feature or resource is inaccessible, email ${COMPANY.supportEmail}. Tell us the page, task, browser or assistive technology involved and the format or adjustment you need. We will make reasonable efforts to provide an alternative or fix.`,
        ],
      },
      {
        title: "4. Review",
        paragraphs: [
          `This statement was prepared on ${LEGAL_EFFECTIVE_DATE}. We review accessibility as Classendo changes and use reports to prioritise improvements.`,
        ],
      },
    ],
  },
];

export const LEGAL_DOCUMENT_BY_SLUG = new Map(
  LEGAL_DOCUMENTS.map((document) => [document.slug, document]),
);
