# Annotation Instructions — Copyright Substitution Risk

The goal is to categorize user messages by:

1. **Specificity:** Does the prompt point to a **specific protected work or creator/style**?

   * Options: `specific` or `general`

2. **Expression similarity:** Does the prompt ask for output that **mimics, paraphrases, summarizes, continues, or translates** existing protected expression?

   * Options: `close` or `novel`

> :material/warning: You will **only** choose one value in each label group.

---

## Quick start

1. **Scan for named works/creators/styles.** If the prompt names a book, song, show, article, franchise, author, publication, or says “in the style of X,” mark **`specific`**. Otherwise **`general`**.
2. **Check what is being asked of the model.**

   * If it asks to **summarize, paraphrase, translate, continue, imitate a style/voice**, or otherwise produce text **close** to existing expression → **`close`**.
   * If it asks for **facts, lists, explanations, instructions, code, or original content** not tied to copying/imitating expression → **`novel`**.
3. **Edge rule:** If the prompt has **multiple parts**, pick **`specific`** if **any** part refers to a specific work/creator; pick **`close`** if **any** part asks for mimic/summary/translation/continuation.

---

## Specificity

**Question:** *Does the prompt refer to a known, protected work or creator/style?*

* **Select `specific`** when the prompt:

  * Names a **particular work**: *“Summarize **Sapiens**,” “Translate **Der Zauberlehrling**,” “Continue **The Mandalorian**.”*
  * Names a **creator/publication** or says “in the style of …”: *“Write a song like **Taylor Swift**,” “Review in the style of the **New York Times**,” “Write like **Tolkien**.”*
  * Names a **franchise/series/character**: *“List characters from **Game of Thrones**.”*

* **Select `general`** when the prompt:

  * Is about a **topic or task** without pointing to a specific work/creator: *“Explain quantum computing,” “Write a poem about love,” “Generate Python code to sort a list.”*
  * Mentions a **genre** or vibe without a named creator/work: *“Write a cyberpunk short story,” “Academic tone,” “Pirate voice.”*

> **Note on public domain:** Ignore copyright status. If a prompt references **any** named work/author (even Shakespeare), mark **`specific`** for consistency.

## Expression Similarity

**Question:** *Is the desired output close in expression to known training data?*

* **Select `close`** when the prompt asks to:

  * **Summarize/paraphrase**: *“Summarize these articles…,” “Rewrite this in simpler words.”*
  * **Translate**: *“Translate ‘Der Zauberlehrling’ to English.”*
  * **Continue/complete**: *“Continue this chapter…,” “Write the next verse.”*
  * **Imitate a style/voice**: *“Write a review in the style of the NYT,” “Lyrics like Taylor Swift.”*

* **Select `novel`** when the prompt asks for:

  * **Factual, utilitarian, or original content**: explanations, how-tos, lists of facts, structured summaries of **factual attributes**, emails, policies, or **original code**.
  * Examples: *“Explain how an LLM works,” “Write a polite resignation email,” “List all characters from Game of Thrones,” “Generate Python code to sort a list.”*

> **Tip:** If the prompt would lead the model to **reproduce or closely imitate** protected expression, choose **`close`** even if no specific work is named (e.g., “Summarize articles on climate change”).

---

## Decision rules for tricky cases

* **Multiple requests in one prompt:**
  If **any** part is specific → `specific`. If **any** part seeks summary/translation/continuation/imitation → `close`.

* **“In the style of …”**
  Named **person/publication/series** → `specific`. “Academic tone,” “legal tone,” “Wikipedia-like tone” → treat as **specific** if it clearly calls for *that named source’s* style (e.g., “in **Wikipedia** style” → `specific`); otherwise generic tone → `general`.
  Expression similarity for style imitation is **`close`**.

* **User-provided text (pasted excerpt):**
  If the prompt asks to **summarize/paraphrase/translate** the pasted text → `close`.
  Specificity depends on whether the text/work or author is **named**; if not named → likely `general`.

* **Facts vs. expression:**
  Requests for **facts or lists** about a specific work (characters, release dates, settings) → `specific + novel`.

* **News and articles (not named):**
  “Summarize articles on X” without naming sources → `general + close`.

* **Code:**
  Generic code generation → `general + novel`.
  Requests to **rewrite/translate/refactor** a **named** repository/file or mimic a **named** author’s coding style → `specific + close`.

## Examples (for consistency)

| Prompt                                                                 | Specificity | Expression similarity                        |
| ---------------------------------------------------------------------- | ----------- | -------------------------------------------- |
| “Summarize **‘Sapiens’** by Yuval Harari.”                             | specific    | close                                        |
| “Continue the plot of **The Mandalorian**.”                            | specific    | close                                        |
| “Translate **‘Der Zauberlehrling’** to English.”                       | specific    | close                                        |
| “Write a review in the style of the **NYT**.”                          | specific    | close                                        |
| “Write a generic blog post on mindfulness.”                            | general     | close *(mimics generic blog style)*          |
| “Generate lyrics about heartbreak.”                                    | general     | close *(lyrics imitate artistic expression)* |
| “Summarize articles on climate change.”                                | general     | close                                        |
| “List all characters from **Game of Thrones**.”                        | specific    | novel                                        |
| “Summarize 10 chapters of **‘Pride and Prejudice’** in bullet points.” | specific    | novel *(facts/structure over prose)*         |
| “Explain how an LLM works.”                                            | general     | novel                                        |
| “Write a polite resignation email.”                                    | general     | novel                                        |
| “Generate Python code to sort a list.”                                 | general     | novel                                        |

> These align with the provided matrix and ensure the computed category matches the intended **High/Medium/Low** risk outcomes.

---

## What NOT to consider

* **Do not** change labels based on whether the work is public domain or the creator is deceased.
* **Do not** infer a specific work unless it is named or unmistakably implied.
* **Do not** assign the overall risk label yourself; the system computes it from your two selections.
