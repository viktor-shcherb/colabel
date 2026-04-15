# Annotation Instructions — Copyright Substitution Risk

Each conversation has **two parallel sets of labels** on the same 2×2 axes:

1. **Prompt-side** (user turns) — *attempted* substitution risk: what the user *asked for*.
2. **Output-side** (assistant turns) — *realized* substitution risk: what the assistant *actually produced*.

Both sides use the same two axes:

1. **Specificity:** Does the message point to a **specific protected work or creator/style**?

   * Options: `specific` or `general`

2. **Expression similarity:** Does the message **mimic, paraphrase, summarize, continue, or translate** existing protected expression?

   * Options: `close` or `novel`

> :material/warning: Choose exactly one value per label group.

---

## Quick start (prompt-side, on user turns)

1. **Scan for named works/creators/styles.** If the prompt names a book, song, show, article, franchise, author, publication, or says "in the style of X," mark **`specific`**. Otherwise **`general`**.
2. **Check what is being asked of the model.**

   * If it asks to **summarize, paraphrase, translate, continue, imitate a style/voice**, or otherwise produce text **close** to existing expression → **`close`**.
   * If it asks for **facts, lists, explanations, instructions, code, or original content** not tied to copying/imitating expression → **`novel`**.
3. **Edge rule:** If the prompt has **multiple parts**, pick **`specific`** if **any** part refers to a specific work/creator; pick **`close`** if **any** part asks for mimic/summary/translation/continuation.

## Quick start (output-side, on assistant turns)

Judge the **assistant text alone**. Do **not** let the user prompt bias the output label.

1. **Did the assistant actually mention or use content from a named work/creator?** If yes → **`specific`** (output). Otherwise → **`general`** (output).
2. **Did the assistant actually reproduce, paraphrase, summarize, translate, continue, or imitate the style of protected expression?** If yes → **`close`** (output). Otherwise → **`novel`** (output).
3. **Refusals** ("I can't help with that") → `general + novel`. Generic factual answers that don't quote any work → `general + novel`.

> A high-risk prompt followed by a refusal is `(specific, close)` on the prompt side and `(general, novel)` on the output side. That gap is what realized-vs-attempted is meant to surface.

---

## Specificity (both sides)

**Question:** *Does the message refer to a known, protected work or creator/style?*

* **Select `specific`** when the message:

  * Names a **particular work**: *"Summarize **Sapiens**," "Translate **Der Zauberlehrling**," "Continue **The Mandalorian**."*
  * Names a **creator/publication** or says "in the style of …": *"Write a song like **Taylor Swift**," "Review in the style of the **New York Times**," "Write like **Tolkien**."*
  * Names a **franchise/series/character**: *"List characters from **Game of Thrones**."*

* **Select `general`** when the message:

  * Is about a **topic or task** without pointing to a specific work/creator: *"Explain quantum computing," "Write a poem about love," "Generate Python code to sort a list."*
  * Mentions a **genre** or vibe without a named creator/work: *"Write a cyberpunk short story," "Academic tone," "Pirate voice."*

> **Note on public domain:** Ignore copyright status. If a message references **any** named work/author (even Shakespeare), mark **`specific`** for consistency.

## Expression Similarity (both sides)

**Question:** *Is the message close in expression to known training data?*

* **Select `close`** when the message:

  * **Summarizes/paraphrases**: *"Summarize these articles…," "Rewrite this in simpler words."*
  * **Translates**: *"Translate 'Der Zauberlehrling' to English."*
  * **Continues/completes**: *"Continue this chapter…," "Write the next verse."*
  * **Imitates a style/voice**: *"Write a review in the style of the NYT," "Lyrics like Taylor Swift."*

* **Select `novel`** when the message produces:

  * **Factual, utilitarian, or original content**: explanations, how-tos, lists of facts, structured summaries of **factual attributes**, emails, policies, or **original code**.
  * Examples: *"Explain how an LLM works," "Write a polite resignation email," "List all characters from Game of Thrones," "Generate Python code to sort a list."*

> **Tip:** If the message would lead to (or actually contains) a **reproduction or close imitation** of protected expression, choose **`close`** even if no specific work is named (e.g., "Summarize articles on climate change").

---

## Decision rules for tricky cases

* **Multiple requests in one prompt:**
  If **any** part is specific → `specific`. If **any** part seeks summary/translation/continuation/imitation → `close`.

* **"In the style of …"**
  Named **person/publication/series** → `specific`. "Academic tone," "legal tone," "Wikipedia-like tone" → treat as **specific** if it clearly calls for *that named source's* style (e.g., "in **Wikipedia** style" → `specific`); otherwise generic tone → `general`. Style imitation is **`close`**.

* **User-provided text (pasted excerpt):**
  If the prompt asks to **summarize/paraphrase/translate** the pasted text → `close`. Specificity depends on whether the text/work or author is **named**; if not named → likely `general`.

* **Facts vs. expression:**
  Requests for (or assistant responses containing) **facts or lists** about a specific work (characters, release dates, settings) → `specific + novel`.

* **News and articles (not named):**
  "Summarize articles on X" without naming sources → `general + close`.

* **Code:**
  Generic code generation → `general + novel`. Requests to **rewrite/translate/refactor** a **named** repository/file or mimic a **named** author's coding style → `specific + close`.

* **Refusals (assistant only):**
  Always `general + novel` on the output side, regardless of how high-risk the prompt was.

## Examples (for consistency)

| Prompt                                                                 | Spec (prompt) | Expr (prompt)                                | Likely output (if not refused) |
| ---------------------------------------------------------------------- | ------------- | -------------------------------------------- | ------------------------------ |
| "Summarize **'Sapiens'** by Yuval Harari."                             | specific      | close                                        | specific + close               |
| "Continue the plot of **The Mandalorian**."                            | specific      | close                                        | specific + close               |
| "Translate **'Der Zauberlehrling'** to English."                       | specific      | close                                        | specific + close               |
| "Write a review in the style of the **NYT**."                          | specific      | close                                        | specific + close               |
| "Write a generic blog post on mindfulness."                            | general       | close *(mimics generic blog style)*          | general + close                |
| "Generate lyrics about heartbreak."                                    | general       | close *(lyrics imitate artistic expression)* | general + close                |
| "Summarize articles on climate change."                                | general       | close                                        | general + close                |
| "List all characters from **Game of Thrones**."                        | specific      | novel                                        | specific + novel               |
| "Summarize 10 chapters of **'Pride and Prejudice'** in bullet points." | specific      | novel *(facts/structure over prose)*         | specific + novel               |
| "Explain how an LLM works."                                            | general       | novel                                        | general + novel                |
| "Write a polite resignation email."                                    | general       | novel                                        | general + novel                |
| "Generate Python code to sort a list."                                 | general       | novel                                        | general + novel                |
| (any high-risk prompt followed by a refusal)                           | (as above)    | (as above)                                   | general + novel                |

> These align with the provided matrix and ensure the computed category matches the intended **High/Medium/Low** risk outcomes for both attempted and realized substitution.

---

## What NOT to consider

* **Do not** change labels based on whether the work is public domain or the creator is deceased.
* **Do not** infer a specific work unless it is named or unmistakably implied.
* **Do not** assign the overall risk label yourself; the system computes it from your selections.
* **Do not** let the user prompt bias the output-side label, or vice versa. Each side is judged on its own text.
