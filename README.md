# FreeShow Multi-Language Lyrics Converter

A free, standalone web tool that converts lyrics pasted into separate
per-language boxes into [FreeShow](https://freeshow.app)'s native
multi-language import syntax — ready to paste straight into FreeShow's
**Quick Lyrics** / **Text edit** box.

## Why this exists

FreeShow (open-source church presentation software,
[ChurchApps/FreeShow](https://github.com/ChurchApps/FreeShow)) supports
multi-language song lyrics, but only via a hand-typed syntax where you
interleave markers line by line, e.g.:

```
[#1] content in lang 1
[#2] content in lang 2
```

For a real song with several stanzas, typing this out by hand is slow and
error-prone. A [feature request](https://github.com/ChurchApps/FreeShow/issues/3617)
for a side-by-side, per-language paste UI was closed as "not planned" by the
FreeShow maintainers, so this tool exists as a standalone companion instead:
paste each language into its own box, and get FreeShow-ready text out.

## How it works

1. Paste your first language's lyrics into box 1, separating stanzas
   (verses, chorus, bridge, etc.) with a **blank line** — the same way you'd
   naturally copy lyrics from a lyrics site or hymnal.
2. Paste the matching language into box 2 (and add more boxes if you have
   more languages).
3. Optionally give each box a language code (e.g. `en`, `ta`, `hi`) — this
   becomes `[#1:en]` in the output. Leave it blank for a plain `[#1]`.
4. Reorder boxes with the up/down arrows — box order determines `[#1]`,
   `[#2]`, `[#3]`... numbering, which affects which text style each language
   gets in FreeShow.
5. The output box updates as you type. Copy it (or download it as `.txt`)
   and paste it into FreeShow's Text Edit / Quick Lyrics box.

If your language boxes don't have the same number of stanzas, the tool
shows a warning naming each box's stanza count and still generates the best
output it can — missing stanzas become empty (but present) `[#N]` markers
rather than silently shifting the rest of the song out of alignment.

### Output format

Slides are separated by a blank line. Each slide contains one `[#N]` (or
`[#N:code]`) marker per language box, followed by that language's lines for
that stanza:

```
[#1:ta]
தந்தானைத் துதிப்போமே – திருச்
சபையாரே கவி – பாடிப்பாடி
[#2:en]
Thanthanai Thuthipome – thiru
Sabaiyaarae kavi – paadippaadi

[#1:ta]
ஒய்யாரத்துச் சீயோனே – நீயும்
மெய்யாகக் களிகூர்ந்து நேர்ந்து
[#2:en]
Oyyaarathu seeyoanae – neeyum
meiyaaga kalikoorndhu naerndhu
```

Optional song details (Title, Author, CCLI, Copyright) are emitted as
`Key=Value` lines above the slides, matching FreeShow's own metadata import
syntax. See [freeshow.app/docs/editing](https://freeshow.app/docs/editing)
and [freeshow.app/docs/show-type](https://freeshow.app/docs/show-type) for
FreeShow's full syntax reference.

## Privacy

This is a fully client-side, static web app. There is no backend, no
analytics, and no persistence — nothing you paste in is stored, logged, or
sent anywhere. This matters because lyrics are frequently copyrighted.

## Development

```
npm install
npm run dev       # start the dev server
npm run test      # run the unit test suite (vitest)
npm run lint      # lint
npm run build     # type-check + production build
```

The conversion logic (parsing, stanza alignment, FreeShow syntax generation)
lives in [`src/lib/convert.ts`](src/lib/convert.ts) as a small, pure,
dependency-free module, deliberately kept separate from the UI — both so it
is easy to unit test and so it could eventually be lifted into
ChurchApps/FreeShow itself as a native import mode (see issue #3617 above).

### Branching & CI

- `main` is protected: changes land via pull request only.
- Every PR runs lint, build, and the test suite in CI; all checks must pass
  before merging.

## License

No license has been set yet for this repository.
