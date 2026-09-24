# Notes on the content folders

These four files used to sit inside `src/content/<collection>/` as
`README.md`. They were moved here on 23 September 2026.

## Why they moved

The CMS lists every `.md` file in a collection's folder. It has no way to
exclude one: Sveltia builds a single regex per folder collection and matches
on the path, with no ignore mechanism. So each `README.md` appeared in the
editor as an entry with no title and no content, sitting among the real ones.

Two collections made it worse. `people` and `sermons` contain no entries yet,
so a volunteer opening **Leaders** or **Sermons** saw exactly one item — a
blank, broken-looking row — rather than an empty list. Having fought their way
past a sign-in screen, the first thing they would meet is something that looks
like a bug.

The Astro loaders had always excluded these files (`'!**/README.md'`), so
nothing about the built site changes. Those exclusions are deliberately kept
in `src/content.config.ts`: they cost nothing and they mean a future
`README.md` dropped into a content folder breaks neither the build nor the
editor — though it would come back as a ghost entry in the CMS, which is why
notes belong here instead.

## What is in each file

One per collection, describing what belongs in it and the conventions its
entries follow. They are for whoever maintains the code, not for volunteers —
volunteers get the same guidance as `hint:` and `description:` text inside
the CMS itself, where they will actually read it.
