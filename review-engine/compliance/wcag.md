# WCAG 2.2 level A and AA: code review checklist

Source: W3C, Web Content Accessibility Guidelines (WCAG) 2.2, W3C Recommendation (current version dated 12 December 2024), https://www.w3.org/TR/WCAG22/, with the explanations in Understanding WCAG 2.2, https://www.w3.org/WAI/WCAG22/Understanding/. For native mobile and desktop apps, W3C's WCAG2ICT Group Note (11 December 2025), https://www.w3.org/TR/wcag2ict-22/, explains how the same criteria apply outside the web. The checks below are written in our own words. The numbers are the success criterion numbers, so a finding can be traced back to the official text.

This checklist covers the level A and AA success criteria that changed code can show. Others, such as captions and audio description, depend on media content that a code review can't see, so they aren't listed. Cite only the IDs in the headings below. Success criterion 4.1.1 Parsing was removed in WCAG 2.2 and must never be cited. Markup errors such as duplicate IDs matter only when they break something another criterion covers, such as a label that points at the wrong field (SC 1.3.1 or SC 4.1.2).

Contrast, target size, reflow and focus visibility depend on the final rendered page. Flag them only when the values are visible in the code, such as literal colours or sizes in CSS, and the problem is clear. Otherwise give the standard `needs_check` and say what a person should test.

## When this applies

Apply these checks to changed code that renders or styles a user interface. This includes HTML, JSX and TSX components, Vue, Svelte and Angular templates, CSS, Sass and utility classes such as Tailwind, shared UI component libraries, and native UI code (SwiftUI or UIKit on iOS, XML layouts or Jetpack Compose on Android, React Native and Flutter). Also apply them to front-end logic that handles focus, keyboard input, dialogs, form validation or status messages.

If the change has no user interface code, such as a backend, database, infrastructure or test-only change, report this standard as `not_applicable`. A change to UI text alone still needs the link text, label and error message checks.

## Checks

### [WCAG 2.2 SC 1.1.1] Images and icons have a text alternative, and decorative ones are hidden
Look for: `<img>` with no `alt`, or with `alt` that is a file name or just "image". Icon-only buttons and links (SVG, icon fonts, `<i class="icon-...">`) with no accessible name from text, `aria-label` or `aria-labelledby`. Inline `<svg>` that carries meaning with no `<title>` or label. CSS background images that carry information with no text equivalent. On iOS, meaningful images with no `accessibilityLabel`. On Android, a meaningful `ImageView` or Compose `Image` with no content description.
Not a breach: decorative images marked so assistive technology skips them, such as `alt=""`, `aria-hidden="true"`, `contentDescription = null` in Compose, or `importantForAccessibility="no"` on an Android view.
Decided from code: yes. Whether the text describes the image well may need a person.

### [WCAG 2.2 SC 1.3.1] Structure that is shown visually is also in the markup
Look for: headings made with bold or large text instead of `<h1>` to `<h6>` (or `role="heading"` with `aria-level`). Lists built from `<div>`s or line breaks. Data tables with no `<th>` header cells. Form fields with no programmatic label, such as a `<label>` whose `for` doesn't match the field's `id`, or text placed next to a field with nothing linking them. Related radio buttons or checkboxes with no `<fieldset>` and `<legend>` or labelled group. Page regions that lose their landmark elements (`<main>`, `<nav>`, `<header>`). In native apps, headings with no heading trait, such as the header trait on iOS or `heading()` semantics in Compose.
Decided from code: yes.

### [WCAG 2.2 SC 1.3.4] Screens work in both portrait and landscape
Look for: code that locks the orientation, such as `screen.orientation.lock()`, an `orientation` value in a web app manifest, CSS that hides the content or shows a "rotate your device" message in one orientation, `android:screenOrientation="portrait"` in `AndroidManifest.xml`, only one orientation listed in `UISupportedInterfaceOrientations` in `Info.plist`, or `"orientation": "portrait"` in an Expo `app.json`.
Not a breach: an orientation that is essential, such as a piano app, a bank cheque capture screen or VR content.
Decided from code: yes.

### [WCAG 2.2 SC 1.3.5] Fields that ask for the user's own details say what they are for
Look for: inputs for the user's name, email, phone number, address, birthday, username, password or card details with no `autocomplete` attribute, with the wrong token, or with `autocomplete="off"`.
Acceptable: tokens from WCAG's "Input Purposes for User Interface Components" list, such as `name`, `email`, `tel`, `street-address`, `postal-code`, `bday`, `username`, `current-password`, `new-password` and `cc-number`. On Android the equivalent is `autofillHints`, and on iOS it is `textContentType`.
Not a breach: fields about someone else, such as a gift recipient's address, and fields with no matching purpose, such as a search box.
Decided from code: yes.

### [WCAG 2.2 SC 1.4.1] Colour is never the only way information is shown
Look for: errors or required fields shown only by a red border or red text. Links inside paragraphs told apart from the body text only by colour, after `text-decoration: none`. Status shown only by a coloured dot or badge. Charts that rely on colour alone, with no labels, patterns or text. Selected tabs or items marked only by a colour change.
Not a breach: colour used together with text, an icon, an underline, a change of shape or border, or a pattern.
Decided from code: yes, for what the markup and styles show.

### [WCAG 2.2 SC 1.4.3] Text has enough contrast with its background
Look for: a text colour and its background colour both set in the changed code, as literal values or as design tokens defined in this repository, with a contrast ratio below 4.5:1. For large text the minimum is 3:1. Large text means at least 18 point (24 CSS px), or at least 14 point (about 18.7 CSS px) and bold. Light grey placeholder text, "secondary" text and lowered opacity on text are the usual problems.
Not a breach: text in disabled controls, pure decoration, and logos.
Decided from code: partly. Flag only when both colours are visible in the code and the ratio is clearly too low. Text over images or gradients, themes chosen at run time and user-set colours need the rendered page.

### [WCAG 2.2 SC 1.4.4] Text can be zoomed to 200% without losing content
Look for: a viewport meta tag with `user-scalable=no`, or with `maximum-scale` below 2. Font sizes set only in viewport units (`vw`, `vh`), which don't grow when the user zooms. Containers with a fixed height and `overflow: hidden` that cut off text when it gets bigger. On Android, text sized in `dp` instead of `sp`. On iOS, fixed font sizes that ignore Dynamic Type.
Decided from code: partly. The code shows these blockers, but whether nothing is lost at 200% needs a test in the rendered page.

### [WCAG 2.2 SC 1.4.10] Content fits a narrow screen without scrolling sideways
Look for: page containers with fixed widths wider than 320 CSS px, such as `width: 1200px` or a large `min-width` on `body` or a main wrapper. New layouts with no responsive rules. `white-space: nowrap` on long text. Content placed with fixed pixel offsets that push it out of view on a narrow screen.
Not a breach: parts that need two dimensions to make sense, such as data tables, maps, diagrams, video, games and toolbars that must stay in view. Sideways scrolling inside those parts is fine.
Decided from code: partly. Flag clear fixed-width layouts. Everything else needs a test at 320 CSS px wide, which is 1280 px at 400% zoom.

### [WCAG 2.2 SC 1.4.11] Controls, focus indicators and key graphics have enough contrast
Look for: input borders, checkbox and radio outlines, switch tracks, icon-only buttons, focus indicators, and chart lines or segments with a contrast ratio below 3:1 against the colours next to them, when those colours are set in the changed code. A control whose only visible edge is removed, such as `border: none` on an input whose background is almost the same as the page.
Not a breach: disabled controls, and controls left in the browser's default style.
Decided from code: partly. The same limits apply as for SC 1.4.3. Flag only when the colours are visible in the code.

### [WCAG 2.2 SC 1.4.13] Pop-ups shown on hover or focus can be dismissed, hovered over, and stay open
Look for: custom tooltips, hover cards or menus that close when the pointer moves from the trigger onto the pop-up, for example by closing on the trigger's `mouseleave`. Pop-ups that can't be closed without moving the pointer or focus. Pressing Escape is the usual way to close them. Pop-ups that hide on a timer while still hovered or focused.
Not a breach: the browser's own `title` tooltips. Controls that only appear on focus, such as a skip link. The closing rule doesn't apply to a pop-up that reports an input error, or that doesn't cover other content.
Decided from code: yes.

### [WCAG 2.2 SC 2.1.1] Everything can be done with a keyboard
Look for: click handlers on `<div>`, `<span>` or other non-focusable elements with no `tabindex="0"` and no Enter or Space key handling. An `<a>` with no `href` used as a button. Actions that only fire on mouse events, such as hover-only menus, `onMouseOver`, double-click or right-click, with no keyboard path. Controls that are meant to be used but have `tabindex="-1"`. Custom widgets such as menus, tabs, sliders and date pickers whose parts can't be reached or changed with the keyboard.
Acceptable: native `<button>`, `<a href>`, form controls and `<details>`/`<summary>`, which already work with a keyboard.
Decided from code: yes. Complex custom widgets may need a quick keyboard test.

### [WCAG 2.2 SC 2.1.2] Keyboard focus never gets stuck
Look for: focus traps in dialogs, drawers or menus with no way out by Escape or a close button. `keydown` handlers that call `preventDefault()` on Tab across the whole page. Embedded editors, iframes, maps or players that take Tab and never give it back, with no message telling the user which keys get out.
Not a breach: a modal dialog that keeps focus inside while it is open, as long as Escape or a close button ends it.
Decided from code: yes, for code in this repository. Third-party embeds may need a test.

### [WCAG 2.2 SC 2.1.4] Single-key shortcuts can be turned off or changed
Look for: global `keydown` or `keypress` handlers, or hotkey libraries, that act on a single letter, number, punctuation or symbol key with no Ctrl or Alt, such as `j` and `k` to move between items or `?` to open help.
Acceptable: a setting that turns the shortcut off, or remaps it to use a key such as Ctrl or Alt. A shortcut that only works while its own component has focus, such as typing a letter to jump within a focused list.
Decided from code: yes.

### [WCAG 2.2 SC 2.4.2] Every page has a title that says what it is
Look for: an HTML template with a missing or empty `<title>`, or a placeholder left from a starter kit such as "React App" or "Vite App". Single-page app routes that never set the title, through `document.title` or the framework's own way (Next.js `metadata`, Angular's `Title` service, a Vue Router hook, `<svelte:head>`, or a `<Helmet>` title). Every page sharing one identical title.
Decided from code: yes.

### [WCAG 2.2 SC 2.4.3] Focus moves in an order that makes sense
Look for: positive `tabindex` values (`tabindex="1"` or higher). Dialogs and drawers that open without moving focus into them, or close without returning focus to the control that opened them. CSS that reorders interactive elements on screen (`order`, `flex-direction: row-reverse`, grid placement) so the Tab order no longer matches what users see. New interactive content, such as a portal or a toast with buttons, placed where focus can't reach it in a sensible order.
Decided from code: yes, for `tabindex` and focus handling. Visual order may need the rendered page.

### [WCAG 2.2 SC 2.4.4] The purpose of each link is clear from its text or its context
Look for: link text such as "click here", "read more" or "learn more" with nothing in the same sentence, paragraph, list item or table cell that explains it, and no `aria-label` or `aria-describedby`. Icon-only links, or links that wrap an image, with no accessible name. Cards in a list whose links all have the same text but go to different places.
Decided from code: yes.

### [WCAG 2.2 SC 2.4.7] Keyboard focus is always visible
Look for: `outline: none` or `outline: 0` on `:focus`, or on everything in a CSS reset, with no other focus style. Tailwind `outline-none` or `focus:outline-none` with no `focus-visible:` ring or other style in its place. A focus style from a shared component that a later rule removes.
Acceptable: hiding the outline for mouse clicks only, while a clear `:focus-visible` style stays for keyboard users.
Decided from code: yes.

### [WCAG 2.2 SC 2.4.11] Sticky bars and banners don't hide the focused element
Look for: new `position: fixed` or `position: sticky` headers, footers, cookie banners, chat buttons or toolbars that could fully cover an element when it gets keyboard focus, with no matching `scroll-padding-top` or `scroll-padding-bottom`.
Acceptable: `scroll-padding` that matches the height of the sticky bar. A banner that is modal, so the user deals with it before using the page. A panel the user opened that they can close without moving focus, such as with Escape. At this level only a fully hidden element fails; partly covered is enough.
Decided from code: partly. The code shows the sticky element, but whether it covers focus depends on sizes in the rendered page.

### [WCAG 2.2 SC 2.5.2] Pointer actions happen on release, not on press
Look for: actions that commit something, such as submit, delete, buy, navigate or toggle, wired to `mousedown`, `pointerdown` or `touchstart` (`onMouseDown`, `onPointerDown`, `onTouchStart`), or to `ACTION_DOWN` in an Android touch listener.
Not a breach: a drag or press-and-hold that starts on press and can be cancelled by moving away before release, or that is undone on release. On-screen keyboards and piano keys, where acting on press is essential.
Decided from code: yes.

### [WCAG 2.2 SC 2.5.3] A control's accessible name includes its visible label
Look for: `aria-label` or `aria-labelledby` that replaces visible text with different words, such as a button that shows "Send" with `aria-label="Submit message"`. The same mismatch in an iOS `accessibilityLabel` or an Android `contentDescription` on a control that shows text.
Acceptable: a name that contains the visible words, ideally at the start, such as "Send message" for a button that shows "Send".
Decided from code: yes.

### [WCAG 2.2 SC 2.5.7] Anything done by dragging can also be done with a single click or tap
Look for: new drag-and-drop features, such as sortable lists, kanban boards, file drop zones, resizable panels, custom sliders and map panning, often built with libraries such as dnd-kit or SortableJS or the HTML `draggable` attribute, with no single-pointer alternative.
Acceptable: "Move up" and "Move down" buttons, a "Move to" menu, clicking on a slider's track to set its value, a text field next to a slider, or a file picker button next to a drop zone. A keyboard alternative alone is not enough, because touch-screen users may have no keyboard.
Not a breach: dragging that is essential, or behaviour the browser provides that the code doesn't change, such as a native range input.
Decided from code: yes.

### [WCAG 2.2 SC 2.5.8] Click and tap targets are at least 24 by 24 CSS pixels, or have space around them
Look for: icon buttons, close buttons, checkboxes, pagination links and similar controls given explicit sizes under 24 by 24 CSS px, such as `width: 16px; height: 16px` with no padding, placed close to other targets. In native apps, measure in points on iOS and dp on Android, as W3C's WCAG2ICT note advises.
Not a breach: a smaller target with enough space that a 24 px circle centred on it doesn't overlap another target or that target's circle. Links inside a sentence. Controls whose size the browser sets and the code doesn't change. A control whose function is also offered by another control on the page that meets the size.
Decided from code: partly. Flag only when a size is set in the code and is clearly too small. The rendered size can differ.

### [WCAG 2.2 SC 3.1.1] The page states its main language
Look for: the root `<html>` element with no `lang` attribute, or an empty or wrong value, in `index.html`, server-rendered layouts, Next.js `layout.tsx` or `_document`. A `lang` value fixed to one language in an app that serves several languages.
Decided from code: yes.

### [WCAG 2.2 SC 3.2.2] Changing a field doesn't unexpectedly take the user somewhere else
Look for: a `<select>`, radio button or checkbox whose `change` handler navigates, submits the form, opens a new window or moves focus somewhere unexpected, with no warning beforehand. Forms that submit themselves when the last field is filled in.
Not a breach: changes that update content in place, such as filtering the list below the field. Behaviour explained in text before the control.
Decided from code: yes.

### [WCAG 2.2 SC 3.3.1] Errors are pointed out and described in text
Look for: validation that only turns a field red or shows an icon, with no message. Error messages not tied to their field, with no `aria-describedby` and no `aria-invalid="true"`. Generic messages such as "Invalid input" that don't say which field is wrong or why. Errors returned by the server that are never shown to the user.
Decided from code: yes.

### [WCAG 2.2 SC 3.3.2] Fields have labels or instructions
Look for: placeholder text used as the only label, which disappears as soon as the user types. Required fields with no sign of it in text, or no `required` or `aria-required`. Fields with format rules, such as a date format or password rules, with no instructions before the user types. Groups of fields, such as a date or phone number split into boxes, with no label for the group.
Decided from code: yes.

### [WCAG 2.2 SC 3.3.7] Users aren't asked for the same information twice in one process
Look for: multi-step flows such as checkout, sign-up or applications that ask again for details given in an earlier step, such as a billing address after a shipping address, with no "same as" option and no pre-filled value. Steps that clear earlier answers when the user goes back. The browser's autocomplete doesn't count, because the site itself must offer the earlier answer.
Not a breach: re-entry that is essential, such as a memory game. Re-entry needed for security, such as confirming a new password that isn't shown on screen. Earlier information that is no longer valid.
Decided from code: yes, within the changed flow.

### [WCAG 2.2 SC 3.3.8] Signing in doesn't depend on memory or puzzles alone
Look for: password or one-time code fields that block paste (`onPaste` with `preventDefault()`, `onpaste="return false"`), or scripts that stop password managers filling them in. One-time codes split into one box per digit, where pasting the whole code doesn't work. CAPTCHAs or puzzles in a sign-in flow, such as typing distorted text, solving a sum or remembering a word, with no other way to sign in.
Acceptable: paste and password managers that work, passkeys or WebAuthn, email sign-in links, or a CAPTCHA that asks the user to recognise objects (such as "select every picture with a car") or content they provided themselves.
Decided from code: yes, for what the sign-in code does. Settings of a third-party CAPTCHA service may be outside the repository.

### [WCAG 2.2 SC 4.1.2] Custom controls expose their name, role and state
Look for: custom buttons, checkboxes, switches, tabs, accordions, menus, comboboxes or dialogs built from `<div>` or `<span>` with no `role`, no accessible name, or no state attribute such as `aria-expanded`, `aria-checked`, `aria-selected` or `aria-pressed`. A state that changes on screen but not in the attribute. `aria-hidden="true"` on an element that contains focusable controls. An `<iframe>` with no `title`. In native apps, custom controls with no role, such as missing `accessibilityTraits` on iOS, `semantics { role = ... }` in Compose, or `accessibilityRole` in React Native.
Acceptable: native HTML elements used for their intended purpose, which already meet this.
Decided from code: yes.

### [WCAG 2.2 SC 4.1.3] Status messages are announced without moving focus
Look for: toasts, snackbars, "Saved" confirmations, search result counts, loading or progress text, and form error summaries added to the page with no `role="status"`, `role="alert"`, `aria-live` or `<output>` element. A live region created in the same update as its message, which screen readers often miss. The region should already be on the page before the message is added.
Not a breach: messages that move focus on purpose, such as opening a dialog.
Decided from code: yes.
