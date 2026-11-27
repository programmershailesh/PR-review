# EU AI Act (Regulation (EU) 2024/1689): code review checklist

Source: Regulation (EU) 2024/1689 of the European Parliament and of the Council of 13 June 2024 laying down harmonised rules on artificial intelligence (Artificial Intelligence Act), https://eur-lex.europa.eu/eli/reg/2024/1689/oj. The checks below are written in our own words. The IDs are article numbers (with paragraph where useful), so a finding can be traced back to the official text.

The Act applies different duties to different roles and risk levels. Articles 9 to 15 are the requirements for high-risk AI systems, and Article 50 covers transparency for certain AI systems whatever their risk level. Code review cannot decide whether a system is high-risk or what the project's role is. Where that is unclear from the project's own documents, treat the checks for Articles 9 to 15 as applying only if the project says its system is high-risk. Only the articles with code-level evidence are listed.

## When this applies

Apply these checks only to changed code of an AI system: model calls, prompts, training and evaluation code, data pipelines, logging and monitoring of AI behaviour, and user-facing AI features. Articles 9 to 15 apply to systems the project describes as high-risk. Article 50 and Article 5 apply to any AI feature.

If the change doesn't touch AI behaviour, or is documentation, styling or copy only, report this standard as `not_applicable`.

## Checks

### [EU AI Act Art. 5(1)(f)] The system doesn't infer emotions in workplaces or schools
Look for: code that detects or infers the emotions of employees or students from faces, voice, keystrokes or other biometric signals, such as emotion classifiers in meeting, proctoring or call-centre tools.
Not a breach: systems for medical or safety reasons, such as detecting driver fatigue for safety.
Decided from code: partly. Whether a use is allowed depends on its purpose and setting.

### [EU AI Act Art. 5(1)(c)] The system doesn't score people on social behaviour with harmful results
Look for: code that combines data from unrelated settings into a general score or rank of people's trustworthiness or behaviour, and then uses it to treat them worse in other settings.
Decided from code: partly. The harm and context are not always visible in code.

### [EU AI Act Art. 9] High-risk systems have a risk management process that is run through the life cycle
Look for: changes to a high-risk system with no update to its risk records (risk register, hazard log, model card), no testing of risk controls, and removal of safeguards, limits or fallbacks that were the response to a listed risk.
Decided from code: partly. The process itself is documented outside the code.

### [EU AI Act Art. 10] Training, validation and test data are governed
Look for: data pipelines for a high-risk system with no checks of quality, completeness, duplicates, labelling or representativeness. Datasets with no recorded source or preparation steps. Test data that overlaps with training data. Bias checks removed or skipped.
Decided from code: yes, for pipeline code.

### [EU AI Act Art. 10(5)] Special categories of personal data are used for bias detection only under strict safeguards
Look for: sensitive attributes (health, ethnicity, religion, sexual orientation and similar) loaded into datasets or features, with no access limits, no deletion step after use, and no sign that the data is used only to detect and fix bias.
Decided from code: partly. The legal basis and safeguards may be recorded elsewhere.

### [EU AI Act Art. 11] Technical documentation of a high-risk system is kept current
Look for: changes to the model, its data, inputs, limits or evaluation that leave the technical documentation in the repository (model card, architecture description, evaluation report) out of date.
Decided from code: partly. Only documentation kept in the repository can be seen.

### [EU AI Act Art. 12] A high-risk system automatically records events over its life
Look for: removal or reduction of logging for a high-risk system. Logs that don't record the time of use, the model and version, inputs or their reference, checks made, and who verified results. Logs that can be edited or deleted by the same users the system affects, or that are not kept.
Decided from code: yes.

### [EU AI Act Art. 13] A high-risk system comes with clear information for its deployers
Look for: changes in the system's accuracy, limits, intended purpose, known risks or oversight needs with no update to the instructions or documentation that go with it. Removal of confidence values, warnings or notes on limits from output.
Decided from code: partly. The instructions may be outside the repository.

### [EU AI Act Art. 14] A high-risk system can be overseen by people
Look for: automated decisions about people that run with no person able to review, override or stop them. Removal of review queues, approval steps, stop controls or explanations of output. Interfaces that make output look final, with no sign of confidence or uncertainty.
Decided from code: yes.

### [EU AI Act Art. 14(4)(e)] People can stop the system safely
Look for: AI processes, agents and jobs with no stop control, no pause or cancel, no maximum run time, and no safe state when interrupted.
Decided from code: yes.

### [EU AI Act Art. 15(1)] The system reaches a suitable level of accuracy and robustness
Look for: model or prompt changes with no evaluation of accuracy against a baseline, evaluation thresholds lowered or removed, tests that skip hard or unusual inputs, and no fallback when the model fails or is unsure.
Decided from code: yes.

### [EU AI Act Art. 15(4)] The system copes with errors and with feedback loops
Look for: output from the system fed back into its own training or input data with no filter, so errors reinforce themselves. Missing handling of model failures, timeouts and invalid output. Retraining pipelines that accept unreviewed production output.
Decided from code: yes.

### [EU AI Act Art. 15(5)] The system is protected against attacks specific to AI
Look for: no defence against data poisoning (unvetted training data sources), model or prompt tampering, adversarial inputs, prompt injection and model extraction (unlimited queries). Models loaded from untrusted sources or in unsafe formats. Security and adversarial tests removed.
Decided from code: yes.

### [EU AI Act Art. 50(1)] People are told when they are talking to an AI
Look for: chat, voice or messaging features that present an AI as a person, or that remove the notice that the user is dealing with an AI, where it isn't obvious from the context.
Not a breach: settings where it is already obvious to a reasonable user that they are dealing with an AI.
Decided from code: yes, for text and UI in the repository.

### [EU AI Act Art. 50(2)] Generated synthetic content is marked so machines can detect it
Look for: code that generates images, audio, video or text and outputs it with no machine-readable mark, such as metadata, a watermark or a provenance manifest (C2PA), where the project marks output elsewhere. Marking removed or stripped on export.
Not a breach: assistive features that only lightly edit the user's own content, or generation for a specific allowed purpose.
Decided from code: partly. The technique used and whether it is reliable are hard to judge from a diff.

### [EU AI Act Art. 50(4)] Deepfakes and AI-generated text on public matters are disclosed
Look for: features that produce realistic fake images, audio or video of real people or events, or that publish AI text on matters of public interest, with no visible disclosure that the content was generated or altered.
Not a breach: obviously creative, satirical or artistic work, where the disclosure may be limited to a form that doesn't spoil the work.
Decided from code: partly. Exceptions depend on context.

### [EU AI Act Art. 26(6)] Logs a deployer holds are kept for a suitable period
Look for: log retention settings for a high-risk system set below six months, or log deletion jobs that remove AI event logs sooner, unless other law requires earlier deletion.
Decided from code: partly. Retention may be set in infrastructure outside the repository.

### [EU AI Act Art. 53(1)(c)] A model for general purposes respects copyright rules in its training data
Look for: scraping or training pipelines for a general-purpose model that ignore robots.txt and other machine-readable opt-outs from rights holders, with no policy file or filter for them.
Decided from code: partly. The policy and legal position are outside the code.
