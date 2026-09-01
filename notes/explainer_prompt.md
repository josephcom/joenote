---
created: 2026-09-01T21:52:57Z
updated: 2026-09-01T21:54:29Z
---

#Tutorial_Video

Build me an "explorable explanation" of [TOPIC] as ONE self-contained HTML file.

GOAL. I must understand [TOPIC] with zero prior knowledge. Understanding beats beauty in every choice you make.

FORMAT. The file works like an animated slideshow with 20–30 steps. Controls: Back, Next, Play (auto-advances like a video and toggles to Stop), Start over, a "Step X of Y" label, a thin progress bar during Play, and left/right arrow-key navigation. Per-step Play duration is about 7 seconds plus 65 milliseconds per character of that step's text, capped at 45 seconds. The first step welcomes me and explains the controls in full sentences.

EACH STEP shows, top to bottom: (1) one animated picture (an SVG stage), (2) a short title, often a question, (3) two to five short paragraphs of notes. The notes must say what the picture shows, explain why it happens, and answer the obvious follow-up questions (why this part exists, why not the alternative, what would happen without it). Cover the what, why, how, when, and where of every point. Never throw a bare claim at me. If science does not know something, write "Nobody knows why." Never hide ignorance behind vocabulary.

STRUCTURE. Act 1: teach the basic objects and terms, one per step, each with its own tiny animation, before they are ever used. Act 2: show the full system once ("The picture looks busy now. Do not worry."), then walk through it one component per step, in the order the signal flows through it. Act 3: show the results, explain their meaning, answer the big question, and end with a short step called "The lesson." State the one key rule of the topic early, give it the name "the rule," and call back to it in later steps ("The rule holds again.").

WRITING RULES (strict). Use dead simple, casual, layman English. Write short sentences with one idea each. Prefer the form "If X, then Y." EVERY sentence must have a subject and a verb. No verb-less fragments anywhere, including captions, chart labels, and annotations inside the pictures. The only exception is a one- or two-word name tag on a device (for example, "laser"). Name each thing once and reuse the exact same name everywhere. Describe drawn things by shape and fill ("the filled dot", "the hollow ring"), never by color, because dark mode swaps colors. Use at most one everyday analogy, saved for the hardest idea. Give numbers in plain words, and then give their plain meaning.

PICTURE RULES. Use only rectangles, circles, lines, arrows, and text. Use no decoration, no gradients, no icons, and no images. Build two to four reusable SVG stages (for example: basics, the system, results) and reuse them across steps. In each step, dim every part except the parts being discussed (opacity about 0.15, with a 0.4 second fade), and smoothly zoom the SVG viewBox onto those parts (about 0.6 seconds, with one fixed aspect ratio such as 10:7, so the layout never jumps; this zoom keeps labels readable on a phone). Loop each step's animation forever. Show events physically: dots fly along drawn roads, a hit box flashes in the single accent color, counters count up, dots pile up into patterns, and bars grow. Draw patterns as clouds of thousands of tiny dots.

TECHNICAL RULES. Deliver one .html file with inline CSS and vanilla JavaScript. Use no external libraries, no network requests, no web fonts, and no localStorage. Give the SVG width 100% and a locked CSS aspect-ratio, readable at a 380 pixel phone width. Support light and dark themes with CSS variables on :root, a prefers-color-scheme media query, and an explicit body background. Respect prefers-reduced-motion. Structure the code as a scenes array of {stage, view, highlight, title, text, run}, with helper functions fly, flash, loop, and after, and with a generation counter that cancels every timer, animation frame, and temporary node on each step change, so steps never leak into each other. Build large dot clouds once and keep them.

BEFORE YOU DELIVER, CHECK ALL OF THIS: every sentence, including every SVG label, has a verb or is a permitted name tag; every term is defined before its first use; every claim comes with its reason; the dimming and the zooming point at exactly what the text discusses; every animation loops and stops cleanly on step change; and the page works in light mode, in dark mode, and at phone width.

#prompt