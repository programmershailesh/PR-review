# Section 508: code review checklist

Source: U.S. Access Board, Information and Communication Technology (ICT) Standards and Guidelines, the Revised 508 Standards (36 CFR Part 1194, Appendices A, C and D), final rule of 18 January 2017 with a correction on 22 January 2018, https://www.access-board.gov/ict/. These implement Section 508 of the Rehabilitation Act (29 U.S.C. 794d). The checks below are written in our own words. The numbers are the Standards' provision numbers, so a finding can be traced back to the official text. "E" numbers are in Chapter 2 (scoping), and the others are in Chapters 3 to 6 (technical requirements).

Section 508 applies to ICT that U.S. federal agencies develop, buy, maintain or use. Vendors meet it through accessibility conformance reports (VPATs) and contract terms. The Revised 508 Standards require WCAG 2.0 level A and AA, not WCAG 2.1 or 2.2. Provisions E205.4 and 501.1 apply WCAG 2.0 to web content, other electronic content and software. Other provisions, mainly in Chapter 5, set separate requirements for software such as platform services, user preferences and authoring tools. Where a check maps to a WCAG 2.0 success criterion, the criterion is named in the Look for text. Code that also meets WCAG 2.1 or 2.2 criteria is fine, but they aren't required by this Standard.

This checklist covers what changed code can show. Content such as captions, and the rendered result for contrast, reflow and focus, needs a person or a test. Flag only what the code makes clear.

## When this applies

Apply these checks to changed code in a product sold or provided to a U.S. federal agency, or one that has a VPAT or a 508 commitment. That includes web pages, web and desktop applications, mobile apps, platform and operating system software, authoring tools, documents the product generates, and help content. Signs include HTML, JSX and template markup, CSS, native UI code, accessibility API use, export and conversion features, and media players.

If the change has no user interface or content code, such as a backend, database, infrastructure or test-only change, report this standard as `not_applicable`.

## Checks

### [Section 508 E205.4] Web content and electronic content meet WCAG 2.0 level A and AA
Look for: markup that breaks WCAG 2.0 criteria. Examples are `<img>` with no `alt` (1.1.1), headings and tables built without semantic markup (1.3.1), colour as the only cue (1.4.1), text contrast below 4.5:1 when both colours are set in the code (1.4.3), mouse-only controls (2.1.1), removed focus outlines (2.4.7), form fields with no label (3.3.2) and custom controls with no name, role or state (4.1.2).
Not a breach: criteria added only in WCAG 2.1 or 2.2, such as 1.3.4 orientation or 2.5.8 target size.
Decided from code: partly. The code shows many failures, but contrast, focus visibility and text alternatives also need the rendered page.

### [Section 508 501.1] Non-web software meets the same WCAG 2.0 level A and AA criteria
Look for: desktop and mobile apps, and embedded UIs, with the same failures as above: unlabelled controls, controls that can't be used with the keyboard, colour-only status, low-contrast text set in code, focus that isn't visible or gets stuck. Read "web page" as "screen" or "window".
Not a breach: assistive technology software that supports the platform's accessibility services, which is exempt (E207.2).
Decided from code: partly. The same limits apply as for E205.4.

### [Section 508 502.2.1] Users can switch on and control the platform's accessibility features
Look for: platform or operating system software that adds a documented accessibility feature (screen magnifier, high contrast, sticky keys) with no way to turn it on and off with the keyboard or another accessible method. Settings screens that hide these controls from assistive technology.
Decided from code: partly. It applies mainly to platform software, so say so if the project isn't one.

### [Section 508 502.2.2] Applications don't disrupt the platform's accessibility features
Look for: code that overrides or disables the platform's documented accessibility settings, such as keyboard accessibility, sticky keys or high contrast. Apps that swallow the keys that screen readers use. Custom focus handling that fights the platform's.
Not a breach: a feature that is itself an accessibility feature and is documented as taking over a setting.
Decided from code: yes.

### [Section 508 502.3.1] Each user interface element exposes its role, state, name and description
Look for: custom controls, canvas-drawn elements and owner-drawn widgets with no accessibility object, or with no role, state, name or description exposed through the platform accessibility API (MSAA, UI Automation, AT-SPI, NSAccessibility, UIAccessibility, Android accessibility). Custom views that never subclass or implement the accessibility interface.
Decided from code: yes.

### [Section 508 502.3.3] Table rows, columns and headers are exposed
Look for: grid or table controls drawn by hand, or built from generic containers, with no row, column and header information available to assistive technology. Web data tables made from `<div>`s.
Decided from code: yes.

### [Section 508 502.3.6] Labels are linked to the controls they describe
Look for: a text label placed beside a field or control with no programmatic link, such as a missing `for` and `id` pair, no `aria-labelledby` and no platform label relationship. This maps to WCAG 2.0 success criteria 1.3.1 and 3.3.2.
Decided from code: yes.

### [Section 508 502.3.12] The keyboard focus, text insertion point and selection can be tracked by assistive technology
Look for: custom focus drawn with graphics instead of the platform's focus, or a caret that is painted by hand, so the platform never reports where focus or the insertion point is. Custom text editors that don't report selection changes.
Decided from code: yes.

### [Section 508 502.3.14] Changes of state, value and content are reported to assistive technology
Look for: toasts, progress, validation messages, live data and dynamic updates that appear with no accessibility event, `role="status"`, `role="alert"` or `aria-live` region. Components that change state without notifying the accessibility layer. This maps to WCAG 2.0 success criteria 4.1.2.
Decided from code: yes.

### [Section 508 503.2] Applications follow the user's platform display preferences
Look for: hard-coded font sizes, colours and focus styles that ignore the platform's settings for colour, contrast, font type, font size and focus cursor. Apps that don't update when the setting changes. Forced light or dark themes that override a high-contrast mode.
Decided from code: partly. Whether the layout copes needs a test with the setting on.

### [Section 508 503.4] Media players give controls for captions and audio description
Look for: a custom player for video with sound that has no caption or audio description control, or hides them deeper in a menu than the volume control (503.4.1 and 503.4.2). Players that drop caption or description tracks that the source supplies.
Decided from code: partly. Whether captions and description exist depends on content outside the code.

### [Section 508 504.2] Authoring tools can create accessible content
Look for: editors, form builders, page builders and report designers, whose output has no way to add alternative text, headings, table headers, labels and other accessibility information, or that strip it out. Plain-text source editing is exempt.
Decided from code: partly. It applies to tools that create content for others, so say so if the project doesn't have one.

### [Section 508 504.2.1] Accessibility information is kept when content is converted or saved in another format
Look for: export, save-as, print-to-PDF or conversion code that drops headings, alternative text, table structure or language, where the target format can hold them. Image-only PDF exports. PDF export code that produces untagged files.
Decided from code: yes, for the conversion code in the repository.

### [Section 508 504.2.2] PDF export can produce a PDF/UA-1 file
Look for: tools that export PDF 1.7 and offer no PDF/UA-1 option, or an option that doesn't produce tagged PDFs with structure, reading order and alternative text.
Decided from code: partly. Whether the output conforms needs a check with a PDF validator.

### [Section 508 504.3] Authoring tools prompt authors to make accessible content
Look for: missing prompts or warnings when an author leaves out alternative text, table headers, labels or a document language. Accessibility checkers that are removed or turned off by default.
Decided from code: yes.

### [Section 508 602.3] Help and support documentation meets WCAG 2.0 level A and AA
Look for: documentation, help pages, tutorials and self-service support the changed code ships as images, scans, untagged PDFs, or pages with the failures listed under E205.4.
Decided from code: partly. The code shows the format and markup, not the full content.
