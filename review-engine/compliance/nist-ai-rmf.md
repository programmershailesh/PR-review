# NIST AI RMF 1.0: code review checklist

Source: NIST AI 100-1, Artificial Intelligence Risk Management Framework (AI RMF 1.0), January 2023, https://www.nist.gov/itl/ai-risk-management-framework, with the Playbook at https://airc.nist.gov/AI_RMF_Knowledge_Base/Playbook. The checks below are written in our own words. The IDs are the AI RMF subcategory IDs (function, category and number), so a finding can be traced back to the official text.

The framework has four functions: Govern, Map, Measure and Manage. It is voluntary and describes outcomes, not exact methods. Many subcategories are about people and organisation. The checks below are the ones whose evidence shows up in code, evaluation, monitoring and pipelines.

## When this applies

Apply these checks only to changed code that builds, trains, evaluates, deploys, runs or monitors an AI system. This includes model calls, prompts, training and evaluation code, data pipelines, model loading, guardrails, logging and monitoring of AI behaviour, and user-facing AI features.

If the change doesn't touch any of these, report this standard as `not_applicable`.

## Checks

### [NIST AI RMF MEASURE 1.1] Metrics for the AI system's risks are chosen and kept
Look for: evaluation or monitoring code that drops metrics for the main risks of the system (accuracy, harmful output, bias, security), or is replaced by a measure that is easier to pass. New AI features with no measure of how well they work, where similar features have them.
Decided from code: partly. Choice of metrics is partly a decision outside the code.

### [NIST AI RMF MEASURE 2.1] Test data, metrics and tools used for evaluation are recorded
Look for: evaluation runs with test sets, metrics or tool versions that are not written down or pinned. Test sets changed with no note. Evaluation scripts that depend on unversioned data.
Decided from code: yes, for evaluation code in the repository.

### [NIST AI RMF MEASURE 2.3] Performance is measured in conditions like real use
Look for: evaluation only on clean, synthetic or training-like data when the system is used on messy real input. Tests that skip realistic cases such as long inputs, other languages, noise or unusual formats. Evaluation removed or limited to easy cases.
Decided from code: yes.

### [NIST AI RMF MEASURE 2.4] Behaviour in production is monitored
Look for: removal of runtime monitoring of quality, drift, error rates, refusals or unusual output. New AI features with no logging of requests, outputs and model version that monitoring could use.
Decided from code: partly. Dashboards and alerts may live outside the repository.

### [NIST AI RMF MEASURE 2.5] The system's validity and reliability are shown, and its limits are stated
Look for: model or prompt changes with no regression test or evaluation against a baseline. Tests that only check the output has the right shape. Limits of the model (known failure cases, unsupported inputs) that are no longer documented or enforced.
Decided from code: yes.

### [NIST AI RMF MEASURE 2.6] Safety risks are evaluated and the system fails safely
Look for: AI output that drives actions (code run, messages sent, money moved, device controls) with no check, limit or confirmation. Missing fallbacks and timeouts when the model fails or returns something unusable. Safety tests removed or weakened.
Decided from code: yes.

### [NIST AI RMF MEASURE 2.7] Security and resilience of the AI system are evaluated
Look for: no defence against prompt injection where untrusted text reaches the model, model output used unchecked in SQL, shell or HTML, secrets in prompts, and model files loaded from untrusted sources in unsafe formats (such as pickle). Security and adversarial tests removed. Missing rate limits on model endpoints.
Decided from code: yes.

### [NIST AI RMF MEASURE 2.8] Transparency and accountability risks are examined
Look for: AI output shown to users or passed to other systems with no label, no source, and no record of which model and prompt produced it. Removal of audit logging of AI decisions and overrides.
Decided from code: yes.

### [NIST AI RMF MEASURE 2.9] The model's behaviour can be explained and its output interpreted in context
Look for: automated decisions about people with no reasons, scores or inputs recorded or shown, where the project provides them. Removal of explanation, confidence or citation fields from output.
Decided from code: partly. Whether an explanation is good enough is a judgement outside the diff.

### [NIST AI RMF MEASURE 2.10] Privacy risks of the AI system are examined
Look for: personal data in prompts, training sets, embeddings, logs or evaluation files with no minimisation or masking. Personal data sent to an external model provider. Model outputs that can reveal training data.
Decided from code: yes.

### [NIST AI RMF MEASURE 2.11] Fairness and bias are evaluated
Look for: AI features that rate, rank, filter or decide about people, with no evaluation across groups where the project does this. Features using sensitive attributes or close substitutes (postcode, name) with no check. Fairness tests removed.
Decided from code: partly. Choosing the right groups and thresholds is a judgement call.

### [NIST AI RMF MEASURE 3.3] Users can give feedback on the system's output
Look for: removal of feedback, correction or "report a problem" paths for AI output, where the product has them, and feedback that is collected but never stored or used.
Decided from code: yes, for product code in the repository.

### [NIST AI RMF MANAGE 1.3] High-priority risks have a coded response
Look for: known risks of the AI feature (listed in the repository's risk notes, issues or model card) with no matching guardrail, filter, limit or fallback in the code. Guardrails removed with no replacement.
Decided from code: partly. The risk register may be kept outside the repository.

### [NIST AI RMF MANAGE 2.3] The system can respond to unexpected risks
Look for: no kill switch, feature flag or config to turn the AI feature off, roll back a model or prompt, or switch to a fallback. Hard-wired model versions that can't be changed without a full release.
Decided from code: yes.

### [NIST AI RMF MANAGE 2.4] The system can be superseded, disengaged or deactivated
Look for: AI components that run with no way to stop them, such as agents or batch jobs with no stop control, no maximum steps or runtime, and no way for a person to interrupt and take over.
Decided from code: yes.

### [NIST AI RMF MANAGE 3.1] Risks from third-party AI resources are monitored
Look for: third-party model APIs, models or datasets used with a floating version (`latest`), no check for output changes after a provider update, no timeouts or fallbacks for provider failures, and no limit on what data is sent.
Decided from code: partly. Provider review is mostly outside the code.

### [NIST AI RMF MANAGE 3.2] Pretrained models used in development are checked and monitored
Look for: pretrained models or adapters downloaded with no pinned revision, no hash or signature check, and no evaluation after an update. Models loaded with code execution enabled (`trust_remote_code=True`) or in unsafe serialisation formats.
Decided from code: yes.

### [NIST AI RMF MANAGE 4.1] Post-deployment monitoring is in place
Look for: removal of logging, metrics, drift detection, alerting or user-report hooks for deployed AI features. New AI features released with none of them, where similar features have them.
Decided from code: partly. Monitoring set up outside the repository is not visible.

### [NIST AI RMF MANAGE 4.3] Incidents and errors can be communicated
Look for: removal of error reporting, alert routing or incident hooks for the AI component. Failures that are swallowed, so nobody learns about them. Missing records that would let an incident be traced to a model version, prompt and input.
Decided from code: partly. The communication process is outside the code.
