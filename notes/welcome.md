# Welcome to JoeNote

This note is an ordinary `.md` file. Open it in any editor and it reads exactly
the same. #joenote #reference #inbox

## How it is organised

There are no folders and no notebooks. **Hashtags are the only structure.**
Type `#something` anywhere in a note and it joins the map on the home page.

Relationships between hashtags live in `tags.xml` — a hashtag can have several
parents and several siblings. Click any bubble on the map to edit them.

## Searching

The home page search box takes wildcards, boolean operators and parentheses:

| Query | Finds |
| --- | --- |
| `#project` | notes under `#project` *or* any tag below it |
| `tag:=project` | only notes literally tagged `#project` |
| `(#work OR #personal) AND NOT draft*` | grouping, OR, NOT and a wildcard |
| `te?t "exact phrase"` | single-character wildcard and a literal phrase |
| `is:untagged` | notes that never made it onto the map |

## Markdown

Everything in the CommonMark spec works, plus the usual GitHub extras.

- **bold**, *italic*, ***both***, ~~struck out~~, `inline code`
- [links](https://commonmark.org/), <https://autolinks.example.com>, footnotes[^1]
- [ ] task lists
- [x] that actually tick

> Block quotes, nested lists, tables, setext headings —
> if the spec has it, it renders.

```js
// fenced code keeps its language tag
const notes = tags.flatMap(t => t.notes);
```

Term
: definition-style paragraphs are just paragraphs, and that is fine.

## Images

Copy an image anywhere and paste it straight into the editor. When a folder is
connected the image is written to `assets/` and linked relatively; otherwise it
is embedded inline as a data URI so the note stays self-contained.

## Keyboard

<kbd>n</kbd> new note · <kbd>/</kbd> search · <kbd>Ctrl</kbd>+<kbd>S</kbd> save ·
<kbd>Ctrl</kbd>+<kbd>E</kbd> switch between raw and rendered.

[^1]: Footnotes land at the bottom, numbered in the order they appear.
