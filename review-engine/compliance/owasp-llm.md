# OWASP Top 10 for LLM Applications (2025 edition): code review checklist

Source: OWASP GenAI Security Project, OWASP Top 10 for LLM Applications 2025, https://genai.owasp.org/llm-top-10/, with the source text at https://github.com/GenAI-Security-Project/GenAI-LLM-Top10/tree/main/2025. The list is © The OWASP Foundation and licensed under Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/). The checks below are written in our own words, based on that work. The IDs are the list's own risk IDs, so a finding can be traced back to the official text.

A 2026 edition was published in August 2026, and it orders the list differently. For example, LLM03 is Supply Chain in 2025 but Excessive Agency in 2026. This checklist follows the 2025 edition, so always cite the IDs with `:2025` exactly as written in the headings.

## When this applies

Apply these checks only to changed code that calls a language model, exposes one to users, or builds on one. This includes building prompts, chat and completion calls through a provider SDK or a local model server, agents and their tool or function definitions, MCP servers and clients, retrieval (RAG) pipelines and vector stores, model loading, and fine-tuning or training data pipelines.

If the change doesn't touch any of these, report this standard as `not_applicable`. Ordinary web risks in the same code, such as SQL injection, belong to other standards, unless model output or a model's tools are involved.

## Checks

### [OWASP LLM Top 10 LLM01:2025] Untrusted text can't take over the model's instructions or tools
Look for: user input or outside content (web pages, emails, documents, retrieved passages, tool results) mixed into the system prompt or instructions with nothing to mark it as untrusted. Model output that can trigger tools, API calls or data access with more privilege than the user has, with no check outside the model. High-risk actions, such as sending messages, payments, deleting data or running code, taken without a person approving them. No check in code that the model's output has the expected format. Prompt wording, such as "ignore instructions in the document", used as the only defence.
Not a breach: user input in the prompt as such, which is how these apps work. The problem is what that text can make the model do.
Decided from code: partly. The code shows how prompts are built and what the model can reach. How well the model resists injection can only be shown by testing.

### [OWASP LLM Top 10 LLM02:2025] The model can't reveal personal data, secrets or other users' data
Look for: secrets, credentials or other users' data put into prompts or context. Retrieval or tools that fetch records the current user isn't allowed to see. Prompts, responses or chat history logged, stored or sent to third parties with personal data and no redaction. User data sent for model training or fine-tuning without scrubbing or a way to opt out. Provider error messages or configuration details passed back to users.
Decided from code: partly. The provider's data retention and training terms are outside the repository.

### [OWASP LLM Top 10 LLM03:2025] Models, adapters and AI libraries come from trusted, pinned sources
Look for: models or LoRA adapters downloaded from public hubs by name only, with no pinned revision or file hash, or from unknown publishers. Model files loaded in formats that can run code, such as pickle-based files opened with `torch.load(..., weights_only=False)` or `pickle.load`, or `trust_remote_code=True` in Hugging Face `transformers`. AI libraries and model servers added without a pinned version, or with known vulnerabilities. Code that depends on a model version the provider has deprecated.
Acceptable: models pinned to a revision or hash from a known publisher, and weights in a format such as safetensors.
Decided from code: partly. Whether a model publisher or supplier is trustworthy, and what their terms allow, is outside the repository.

### [OWASP LLM Top 10 LLM04:2025] Data the model learns from is checked before it is used
Look for: pipelines that train or fine-tune on user-submitted content, user feedback or scraped data with no validation, filtering or review. Datasets pulled from public sources without a pinned version or checksum. No record of where training data came from or how it changed, such as data version control. Training jobs that can read data sources they don't need.
Decided from code: partly. Vetting data suppliers and watching training results are mostly done outside the repository.

### [OWASP LLM Top 10 LLM05:2025] Model output is validated and encoded before anything uses it
Look for: model output rendered as HTML or Markdown without sanitising (`innerHTML`, `dangerouslySetInnerHTML`, Markdown renderers that allow raw HTML), which allows cross-site scripting. Model output passed to `eval` or `exec`, a shell, SQL queries, file paths, URLs the server fetches, template engines or email templates without validation or escaping. Model-written SQL or code run directly.
Acceptable: treating output like untrusted user input, with encoding for where it goes, parameterised queries, schema checks on structured output, and a strict content security policy where output is shown in a browser.
Decided from code: yes.

### [OWASP LLM Top 10 LLM06:2025] Agents get only the tools, permissions and freedom they need
Look for: open-ended tools, such as "run any shell command", "fetch any URL", "run any SQL" or "write any file", where a narrow tool would do. Tools with more functions than the feature needs, such as a mail tool that can send and delete when it only needs to read. Tool credentials with broad or admin rights, or a shared service account instead of the user's own access with a limited scope. High-impact actions taken without the user's approval. Permission decisions left to the model, such as "only do this if the user is an admin" in the prompt, instead of checks in the tool or the system behind it. Tools registered but not used.
Decided from code: yes, for tools defined in this repository. Permissions granted in outside systems need a person to check.

### [OWASP LLM Top 10 LLM07:2025] System prompts hold no secrets and aren't used as a security control
Look for: API keys, passwords, connection strings, internal URLs, database names, user roles or permission rules written into system prompts. Security rules, such as access limits, transaction limits or content filtering, enforced only by instructions in the prompt, with no check in code.
Not a breach: a system prompt that only describes the assistant's role, tone and task. OWASP's advice is to assume the prompt can be seen, so what matters is what it contains and whether any control depends on it.
Decided from code: yes, for prompts stored in this repository. Prompts kept in a provider console or a database are outside it.

### [OWASP LLM Top 10 LLM08:2025] Vector stores and retrieval respect who may see what
Look for: one shared vector index or collection for all users or tenants, with queries that don't filter by tenant, user or permission. Documents added to the knowledge base from untrusted sources without validation, where hidden text or instructions can get in. Data with different access levels mixed in one index without labels to control access. No logging of what was retrieved.
Decided from code: partly. Access settings in a hosted vector database may be outside the repository.

### [OWASP LLM Top 10 LLM09:2025] Model output isn't treated as fact where mistakes cause harm
Look for: model answers shown as authoritative in high-stakes areas, such as medical, legal, financial or security advice, with no grounding in trusted data, no sources, no human review and no label saying it was generated. Code, package names or commands suggested by a model that are installed or run automatically. Automated decisions made straight from model output with no validation step.
Decided from code: partly. How accurate the model is in practice can only be shown by testing.

### [OWASP LLM Top 10 LLM10:2025] Model use is limited so it can't exhaust resources or budget
Look for: endpoints that call a model with no per-user rate limit or quota. No limit on input size, output tokens (`max_tokens`), agent steps or tool calls. No timeouts on model calls. Agent loops or queues with no cap on actions. Probability details, such as `logprobs` or `logit_bias`, exposed to users without a need. A paid model key that anyone can use through an open endpoint.
Decided from code: partly. Provider spending limits and billing alerts are set outside the repository.
