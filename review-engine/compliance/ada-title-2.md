# ADA Title II: code review checklist

Source: U.S. Department of Justice, Nondiscrimination on the Basis of Disability; Accessibility of Web Information and Services of State and Local Government Entities, 28 CFR Part 35 Subpart H (sections 35.200 to 35.205), final rule of 24 April 2024 (89 FR 31320), https://www.ecfr.gov/current/title-28/chapter-I/part-35/subpart-H, with the technical standard W3C Web Content Accessibility Guidelines (WCAG) 2.1, Level A and AA, https://www.w3.org/TR/WCAG21/. An interim final rule of 20 April 2026 moved the compliance dates to 26 April 2027 for entities serving 50,000 or more people and to 26 April 2028 for smaller entities and special districts. The Department said it expects to keep those dates. The checks below are written in our own words. The numbers are the regulation's section and paragraph numbers, so a finding can be traced back to the official text.

The rule applies to state and local government entities and to the web content and mobile apps they provide or make available, directly or through contractors. That includes public schools, universities, cities, counties, courts, libraries, transit agencies and public hospitals, and vendors that build or host their sites and apps. The technical standard is WCAG 2.1 level A and AA. Success criteria from WCAG 2.2 aren't required by the rule, and WCAG 2.2 also dropped success criterion 4.1.1, so never cite it. The rule treats WCAG conformance as the test. A check here names the WCAG criteria it relates to inside the Look for text.

This checklist covers what changed code can show. Content such as captions, the quality of text alternatives, contrast over images and reflow depend on the rendered page. Flag them only when the code makes the problem clear. Otherwise give the standard `needs_check` and say what a person should test. Sections 35.204 (undue burden) and 35.205 (minimal impact) are decisions for the entity, so they're used here only to explain why a barrier matters.

## When this applies

Apply these checks to changed code that renders or styles a user interface, or generates documents, for a state or local government entity's website, web application or mobile app. This includes HTML, JSX and template markup, CSS, shared UI libraries, native UI code, PDF and document generation, embedded third-party widgets, and front-end logic that handles focus, keyboard input, dialogs, forms or status messages.

If the change has no user interface or content code, such as a backend, database, infrastructure or test-only change, or the project isn't for a public entity, report this standard as `not_applicable`.

## Checks

### [ADA Title II 35.200(a)(1)] Web pages and web applications meet WCAG 2.1 level A and AA
Look for: new or changed pages with the common failures. Examples are `<img>` with no `alt` (1.1.1), headings, lists and tables made without semantic markup (1.3.1), form inputs with no autocomplete token for the user's own details (1.3.5), colour as the only cue (1.4.1), text contrast below 4.5:1 when both colours are set in the code (1.4.3), viewport settings that block zoom (1.4.4), mouse-only controls (2.1.1), removed focus outlines (2.4.7), missing page titles (2.4.2), missing page language (3.1.1), and custom controls with no name, role or state (4.1.2).
Decided from code: partly. The code shows many failures, but contrast, focus visibility and text alternatives also need the rendered page.

### [ADA Title II 35.200(a)(2)] Mobile apps meet WCAG 2.1 level A and AA
Look for: native and cross-platform screens with controls and images that have no accessibility label (SwiftUI, UIKit, Android XML, Jetpack Compose, React Native, Flutter), custom controls that expose no role or state, fixed font sizes that ignore Dynamic Type or the Android font scale, orientation locked in the manifest or `Info.plist` (1.3.4), small touch targets, and status changes that aren't announced.
Not a breach: an orientation that is essential, such as a bank cheque capture screen.
Decided from code: partly. Touch target size and scaling need a test on a device.

### [ADA Title II 35.200(b)] The project's own tests and tooling keep WCAG 2.1 A and AA in view
Look for: removal or weakening of accessibility linting, axe or similar automated checks, accessibility tests in CI, or design-system rules that enforce the standard. New UI code that ships with those checks turned off or with broad ignore rules. Tools or libraries that target only a lower level.
Decided from code: yes, for what the repository configures. Automated tools find only part of the failures.

### [ADA Title II 35.201(a)] Pages marked as archived are really archived
Look for: content moved into an "archive" section or tagged as archived while it is still linked from current navigation, used to get a service, or changed after archiving. The exception covers only old content kept for reference, with a clear label, and not changed since it was archived.
Decided from code: partly. Whether content qualifies is a judgement, but live links and edits are visible.

### [ADA Title II 35.201(b)] Documents used to apply for, use or take part in services are accessible
Look for: PDFs, Word and spreadsheet files, and scans, that the changed code serves or generates for forms, applications, notices or meeting materials, with no tags, headings, form field labels, alternative text or reading order, or as images only. Document generators that produce untagged files. The exception covers only conventional documents posted before the compliance date and not used to get a service.
Decided from code: partly. The generation code shows whether the output is tagged, but a document check needs a validator.

### [ADA Title II 35.201(c)] Embedded third-party content that the entity chose is checked
Look for: new embedded widgets, payment forms, scheduling tools, chat, maps, video players, document viewers and iframes that the project adds under a contract or arrangement. Name each one so a person can confirm it meets WCAG 2.1 AA, because the exception for third-party content doesn't cover content posted under an arrangement with the entity.
Decided from code: partly. The code shows the embed, but its accessibility needs testing.

### [ADA Title II 35.202(a)] A separate "accessible version" is used only when the main one can't be made accessible
Look for: text-only or "accessible" duplicate pages, overlay or toolbar plug-ins sold as a fix, or code that sends assistive technology users to another site. Alternate versions that are less complete, out of date or missing features. The rule allows these only when the main content can't be made directly accessible for technical or legal reasons.
Decided from code: yes, for what the code shows. Whether a technical limit is real is a judgement.

### [ADA Title II 35.203] A design that departs from WCAG 2.1 is flagged for review
Look for: a deliberate departure from the WCAG success criteria, justified in a comment or ticket as giving equal or better access. Name the criterion and the alternative, so a person can judge whether it gives users substantially equivalent or greater access and usability.
Decided from code: partly. The judgement is made by a person.

### [ADA Title II 35.205(a)] People with disabilities can get the same information
Look for: information that is shown only visually or only by sound. Images and charts with no text alternative or data table, text in images, video with sound but no caption or transcript path, content that appears only on hover or in a canvas, and headings, lists and tables that lack semantic markup. Relates to WCAG 1.1.1, 1.3.1, 1.4.5 and 1.4.13.
Decided from code: partly. The quality of text alternatives and captions needs a person.

### [ADA Title II 35.205(b)] People with disabilities can take part in the same interactions
Look for: click handlers on `<div>`s or `<span>`s with no keyboard route, hover-only menus, drag-only or gesture-only actions, focus traps in dialogs, positive `tabindex` values, removed focus outlines, and custom controls with no accessible name, role or state. Relates to WCAG 2.1.1, 2.1.2, 2.4.3, 2.4.7 and 4.1.2.
Decided from code: yes.

### [ADA Title II 35.205(c)] People with disabilities can complete the same transactions
Look for: forms and flows, such as payment, permit, benefits, sign-in and booking, with unlabelled fields, errors shown only by colour or not tied to the field, timeouts with no warning or way to extend, visual-only CAPTCHAs with no alternative, status messages that aren't announced, and steps that depend on a gesture. Relates to WCAG 3.3.1, 3.3.2, 3.3.3, 2.2.1, 4.1.3 and 1.3.5.
Decided from code: yes.

### [ADA Title II 35.205(d)] People with disabilities can take part in the same services, programs and activities
Look for: online registration, meetings, public comment, live streams or learning tools whose changed code doesn't offer captions, a text route in, keyboard use or a readable structure. Features that are only on the web or only on the app, with no equivalent route for assistive technology. Relates to WCAG 1.2.4, 2.1.1 and 4.1.3.
Decided from code: partly. Captions and live-event content are outside the code.
