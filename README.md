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
  wildcards (`*`, `?`), `AND` / `OR` / `NOT`, parentheses, and dates — either
  typed (`updated:01-08-2026..31-08-2026`) or picked from the **Dates** panel.
* **Every note records when it was made and last changed.** The two dates live
  in the note's own front matter, so they travel with the `.md` file between
  the three destinations, through a download and back through an import.
* **Click a bubble and two panes open**: on the left, a scrollable list of every
  note carrying that hashtag (with a toggle for hashtags below it in the map);
  on the right, its parents, children and siblings, ready to edit.

## Where the notes go

**The button in the top bar always names the destination.** There are three, and
nothing is ever copied between them behind your back.

| Destination | What it means |
| --- | --- |
| **GitHub · owner/repo/notes** | Every save, delete and pasted image is a commit through the GitHub API. What you see in JoeNote *is* what is in the repo, from any browser on any machine. Needs a token — see below. |
| **Folder · name/notes** | Real `.md` files on this computer via the File System Access API (Chrome/Edge). Nothing reaches GitHub until you `git push`. |
| **This browser only** | `localStorage`. Nothing leaves the browser. Shown with a warning banner, because it is nobody's idea of a backup. |

### Connecting GitHub

Click **GitHub…**, fill in owner / repo / branch, and paste a token:

1. [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. **Repository access** → Only select repositories → this one repo
3. **Permissions** → Repository permissions → **Contents: Read and write**. Nothing else.

JoeNote checks the token can actually write before switching over. The token is
kept in this browser's `localStorage` and sent only to `api.github.com` — there
is no server to send it anywhere else. Scope it to the single repo so it can do
nothing else, and revoke it on GitHub whenever you like.

Saves are debounced to 4 seconds in GitHub mode, so a paragraph of typing is one
commit rather than forty. The status next to the note title reads
`committing… → committed`.

> A public repository makes every committed note public. Use a private repo for
> anything you would not post — the app works the same, only Pages hosting needs
> a paid plan then.

## Hosting your own copy

```bash
gh repo create <name> --public --source=. --push
```

Then **Settings → Pages → Deploy from a branch → `main` / `/ (root)`**. Nothing
is built and nothing is served dynamically — the repo *is* the site.

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

updated:02-08-2026             modified that day (dd-mm-yyyy or dd/mm/yyyy)
created:08-2026   created:2026 that month, that year
updated:01-08-2026..31-08-2026 a range; either end may be left off
created:>01-08-2026            >  >=  <  <=
updated:2026-08-02             ISO is read as well, day first or year first
before:X  after:X              either date, outside X
since:X   until:X              either date, from / up to X
updated:today | yesterday | thisweek | thismonth | thisyear | 7d | 3w | 6m
date:X                         matches whichever of the two dates fits
is:undated  has:date
```

`tag:work` matching everything *below* `#work` is what makes the parent links
worth declaring: tag notes precisely, search broadly.

Dates are written the way they are written here — day first, `02-08-2026` or
`02/08/2026` — and a four-digit year at the end is what tells that shape from
ISO, so the two can never be mistaken for each other.

Dates are read in local time, and a value is a *span*, not an instant — which
is why `created:08-2026` means the whole of August and `before:08-2026` means
everything finished before it started. The **Dates** button beside the search
box is a front end for exactly these terms: it writes one into the box and
reads it back out, so the query string stays the only thing that decides what
matches.

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
