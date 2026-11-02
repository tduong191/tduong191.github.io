---
title: 'I built a voice note taker in 30 minutes with iOS Shortcuts and Claude'
description: 'Double-tap the back of my phone, talk, and a clean summary lands in Apple Notes. No new app.'
pubDate: '2026-11-02'
---

I tap the back of my phone twice, talk, and a few seconds later a clean summary lands in Apple Notes: key points, decisions, to-dos, open questions. It took about 30 minutes to build, costs fractions of a cent per note, and uses only things already on my iPhone plus the Claude API.

My ideas show up on walks, in the car, and right before bed. Typing them out kills the thought, and raw voice memos pile up unread. I wanted something that captures the idea in one tap and hands me back something I'll actually reread.

The whole flow: **Dictate Text → Claude Haiku 5.5 → Apple Notes**, all inside one iOS Shortcut.

## Why I built it instead of buying an app

There are plenty of AI voice note apps, but most put summaries behind a monthly subscription. I already pay for Claude, so I didn't want another one. Here's what I weighed:

| Option | Cost | Why I passed (or didn't) |
| --- | --- | --- |
| AI voice note apps | Usually a monthly subscription for full features | Another subscription for something I can build |
| Apple Intelligence "Use Model" in Shortcuts | Free | Needs an iPhone 15 Pro or newer; I have a 14 Pro |
| Run an open model locally | Free | Most setup; overkill for a v1 |
| **Claude Haiku 5.5 API** | **About $0.0002 per note** | **Picked this: cheap, good, no training on my data** |

One gotcha: a Claude subscription doesn't give you an endpoint a Shortcut can call. The API is billed separately, but at these prices it barely registers.

## What you need

- An iPhone with the Shortcuts app (any recent iOS; no Apple Intelligence required)
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com), with a few dollars of credit
- A monthly spend limit set in the Console (I used $5) as a safety net
- An empty note in Apple Notes called **Voice Notes**

## The build: 8 actions

Open Shortcuts, tap **+**, and add these in order. Anything in [brackets] below is a **variable**: insert it from the bar above the keyboard so it shows as a blue bubble. Never type it.

1. **Dictate Text**: set Stop Listening to **On Tap**, so pauses don't cut you off.
2. **Text**: your prompt, with [Dictated Text] inserted at the end:

```text
Summarize this voice note. Use exactly this format:

**Key points**
- ...
**Decisions**
- ...
**To-dos**
- ...
**Open questions**
- ...

Skip any section that's empty. Don't add anything I didn't say.

Voice note:
[Dictated Text]
```

3. **Get Contents of URL**: this is the Claude API call.
   - URL: `https://api.anthropic.com/v1/messages`
   - Method: **POST**
   - Headers: `x-api-key` = your key, `anthropic-version` = `2023-06-01`, `content-type` = `application/json`
   - Request Body: **JSON**, with `model` (Text) = `claude-haiku-5-5`, `max_tokens` (Number) = `1024`, and `messages` (Array) holding **one** Dictionary: `role` = `user`, `content` = [Text from step 2]
4. **Get Dictionary Value**: key `content`, from Contents of URL.
5. **Get Item from List**: **Last Item** (not First; see gotchas).
6. **Get Dictionary Value**: key `text`. This is your summary.
7. **Text**: the note entry:

```text
## [Current Date]
[Dictionary Value from step 6]

Transcript: [Dictated Text]
---
```

8. **Append to Note**: append [Text from step 7] to **Voice Notes**.

Build the request body with Shortcuts' JSON fields rather than typing raw JSON. Shortcuts then escapes quotes and line breaks in your dictation for you, so the request never breaks.

## The gotchas I hit (so you don't)

None of these are hard, but each one cost me a few minutes. To debug, drop a **Show Content** action right after Get Contents of URL and run it: you'll see Claude's raw response.

| Symptom | Cause | Fix |
| --- | --- | --- |
| Claude summarizes the words "[Dictated Text]" | I typed the variable name instead of inserting it | Delete it; insert the variable so it's a blue bubble |
| URL field already says "Text" | Shortcuts auto-fills the previous action's output | Clear it and paste the API URL |
| messages shows "2 items" | role and content added as separate items | One Dictionary item holding both |
| Run seems frozen, ■ stays on | A hidden "Allow to connect to api.anthropic.com?" prompt | Tap **Always Allow** |
| `not_found_error`, `request_id: null` | URL was truncated (`/v1/messag`) | Retype `https://api.anthropic.com/v1/messages` exactly |
| Note gets the model's reasoning, not the summary | Haiku 5.5 can return a thinking block before the text | Use **Last Item** in step 5 |
| Note gets raw JSON | Two actions both output "Dictionary Value"; the wrong one got picked | In step 7, Select Variable → tap step 6 |
| Nothing appended | Append's "Text" was a faded placeholder | Tap it and pick the step 7 Text variable |

The faded-versus-solid-blue distinction catches most of these: faded or typed means placeholder, solid blue bubble means a real variable.

## Make it one tap

A voice note tool only works if starting it is faster than forgetting the idea.

- **Back Tap (my favorite):** Settings → Accessibility → Touch → Back Tap → Double Tap → your shortcut. Double-tap the back of the phone and start talking.
- **Home Screen:** in the shortcut editor, tap ⌄ next to the name → Add to Home Screen.
- **Mac:** Shortcuts syncs over iCloud. In the Mac Shortcuts app, open the shortcut's details and add a keyboard shortcut or pin it to the menu bar. Both devices append to the same note.

## Cost, and what's next

A two-minute note is roughly 700 tokens in and 300 out. At Haiku 5.5's $0.10 / $0.50 per million tokens, that's about $0.0002 per note, so even 10 notes a day comes to well under $0.10 a month. (Requests over 100K input tokens are billed at higher rates, but a voice note is nowhere near that.) The prompt matters far more than the model: if summaries feel off, edit step 2 before switching models.

**Part 2:** turning the To-dos section into real Reminders automatically, so "call mom tomorrow" becomes a dated reminder instead of a line in a note.

Two cautions if you build this:

- Your API key sits in plain text inside the shortcut. Don't share the shortcut file, and keep the spend limit low.
- Prices are as of November 2026; check [Anthropic's pricing page](https://platform.claude.com/docs/en/about-claude/pricing) for current rates.
