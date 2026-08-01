# JoeNote

**Live: https://josephcom.github.io/joenote/**

A note-taking app with no folders. Every note is a plain `.md` file; the only
organising principle is hashtags, arranged into a map you can navigate and edit.

No build step, no frameworks, no dependencies — **XML, HTML, JavaScript and CSS
only**. Open `index.html` and it runs.

## What it does

* **Notes are `.md` files.** Edit mode shows raw markdown, view mode renders it.
  The renderer covers the CommonMark spec plus tables, task lists,
  strikethrough, autolinks and footnotes.
* **Paste images straight in.** With a folder connected they become real files
  under `assets/`; otherwise they are embedded as data URIs.
* **Hashtags are the only structure.** `#like-this`, anywhere in the body.
* **A hashtag can have many parents and many siblings.** That graph lives in
  `tags.xml` and is edited from the map.
* **The home page is just the map and a search box.** Searching supports
  wildcards (`*`, `?`), `AND` / `OR` / `NOT`, and parentheses.
* **Click a bubble and two panes open**: on the left, a scrollable list of every
  note carrying that hashtag (with a toggle for hashtags below it in the map);
  on the right, its parents, children and siblings, ready to edit.

## Where the notes live

| Browser | Storage |
| --- | --- |
| Chrome, Edge, Opera | **Connect folder…** picks a real directory. Notes are `notes/*.md`, images are `assets/*`, the map is `tags.xml`. Point it at your clone of this repo and `git commit` as usual. |
| Firefox, Safari | Falls back to `localStorage`. Everything still works; use **↓ .md** and **Import** to move files in and out. |

The folder handle is remembered between visits, so you only pick it once.

## Using it with this repository

Nothing is built and nothing is served dynamically — the repo *is* the site, and
the same repo is the folder you point JoeNote at locally:

```bash
git clone https://github.com/josephcom/joenote && cd joenote
```

Open https://josephcom.github.io/joenote/, click **Connect folder…** and pick
that clone — **the repository root**, not `notes/`. Write notes, then:

```bash
git add -A && git commit -m "notes" && git push
```

Pages redeploys and your notes travel with the app.

> A public repository makes every committed note public. Keep private notes in a
> folder outside the clone, or use a private repo (Pages then needs a paid plan).

To host your own copy: `gh repo create <name> --public --source=. --push`, then
**Settings → Pages → Deploy from a branch → `main` / `/ (root)`**.

## Search syntax

```
foo bar                      both terms (implicit AND)
foo AND bar    foo && bar    foo & bar
foo OR bar     foo || bar    foo | bar
NOT foo        !foo          -foo
(a OR b) AND !c              parentheses

proj*                        wildcard: any run of characters
te?t                         wildcard: exactly one character
"exact phrase"               literal, wildcards off

#work        tag:work        tagged #work or anything below it in the map
tag:=work                    exactly #work, ignoring the hierarchy
near:work                    #work, its siblings, and their descendants
title:foo  text:foo  file:foo
is:untagged  is:tagged  is:empty
has:image  has:tag  has:link  has:code
```

`tag:work` matching everything *below* `#work` is what makes the parent links
worth declaring: tag notes precisely, search broadly.

## Layout

```
index.html          the whole UI
css/app.css         light + dark theme
js/md.js            markdown parser (CommonMark + GFM + #hashtags)
js/sanitize.js      allow-list sanitiser for rendered HTML
js/store.js         File System Access API / localStorage backends
js/tags.js          the hashtag graph, read and written as XML
js/search.js        query tokeniser, parser and evaluator
js/graph.js         force-directed SVG map
js/app.js           routing and glue
tags.xml            the hashtag map
notes/*.md          your notes
assets/*            pasted images
```

## Keyboard

| Key | Action |
| --- | --- |
| <kbd>n</kbd> | new note |
| <kbd>/</kbd> | jump to the map and focus search |
| <kbd>Ctrl/⌘</kbd>+<kbd>S</kbd> | save now (it also autosaves) |
| <kbd>Ctrl/⌘</kbd>+<kbd>E</kbd> | toggle raw markdown / rendered |
| <kbd>Esc</kbd> | close the tag panel |

## Notes on the format

Notes are pure markdown with no required front matter, so they stay portable.
Optional YAML front matter (`title:`, etc.) is parsed and hidden if present.
Tags are read from the body, never from metadata — which is why a note is
findable from any editor, not just this one.

A hashtag must contain at least one non-digit, so `#5 bolt` stays plain prose
while `#q4` and `#work/2026` are tags. `/` nests inside a single tag name; the
parent/sibling graph in `tags.xml` is what actually builds the map.

The file name follows the note's `# H1` title: change the title and the file is
renamed (a toast tells you), unless the target name is already taken.
