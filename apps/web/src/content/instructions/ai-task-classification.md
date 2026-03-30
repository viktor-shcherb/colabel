# Annotation Instructions — AI Task Mode

The goal is to categorize each user message by which AI-assisted writing mode it requests:

1. **Human-Primary**: AI acts only as an editor or polisher of text the user has already written.  
   * Indicators:  
     - The user provides existing text and explicitly asks for edits, polishing, grammar/style improvements.  
     - Prompts include phrases like “polish this,” “edit the following,” “fix grammar,” “improve wording,” “only edit, don’t add new content.”  

2. **AI-Primary**: AI generates new text from scratch based on the user’s prompt.  
   * Indicators:  
     - The user asks the AI to “write,” “generate,” “draft,” “compose,” “create” new content.  
     - No user-provided text to be edited; the AI is the primary author of the draft.  
     - Iterative feedback (“make it more formal,” “expand this paragraph,” “add examples”) applies to AI-generated drafts rather than user text.

> :material/warning: You **must** choose exactly one label for **Task Mode**.

---

## Quick Start

1. **Look for user-provided text to edit.**  
   - If the message includes text snippets and instructions to correct or polish them → **human-primary**.  
   - Otherwise, go to step 2.

2. **Check for content generation requests.**  
   - Keywords: “Write an essay on…,” “Generate a story about…,” “Draft a summary of…,” “Compose a poem.”  
   - If AI is asked to produce new content → **AI-primary**.

3. **Edge rule:**  
   - If the prompt contains multiple parts and **any** part requires full generative drafting → **AI-primary**.  
   - Only if **all** parts strictly ask for editing or polishing existing text → **human-primary**.

---

## Definitions

### Human-Primary
**What it means:**  
The user remains the primary author. AI may only refine, correct, or enhance existing user text, without adding substantive new content.  
**When to apply:**  
- “Please edit the paragraph below for grammar and style.”  
- “Polish this email draft.”  
- “Only improve wording; do not add information.”

### AI-Primary
**What it means:**  
AI is the primary author, generating new text from scratch in response to the user’s prompt.  
**When to apply:**  
- “Write a 500-word article about climate change.”  
- “Generate a creative short story with a twist ending.”  
- “Draft an argumentative essay on school uniforms.”

---

## Examples

| Prompt                                                           | Task Mode      |
| ---------------------------------------------------------------- | -------------- |
| “Polish the following paragraph for clarity and conciseness.”    | human-primary  |
| “Edit my cover letter to make it more professional.”             | human-primary  |
| “Write a blog post on the benefits of meditation.”               | AI-primary     |
| “Generate Python code to sort a list of names.”                  | AI-primary     |
| “Improve grammar in this sentence: ‘She go to the store.’”       | human-primary  |
| “Compose a poem about autumn leaves.”                            | AI-primary     |

---

## What NOT to Consider

* **Length of the request**: Don’t base the choice on word count.  
* **Tone or style requests**: These only matter if they apply to editing existing text (human-primary) versus generating new text (AI-primary).  
* **User feedback loops**: Iterative “make it longer/shorter” only indicates AI-primary if referring to AI-generated output.
