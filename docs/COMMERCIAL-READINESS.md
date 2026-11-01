# Commercial readiness review

Reviewed 1 November 2026; updated for main 58172565ac9f24c53fd61d293082367016d0a3b7. This is a product proposal, not approval to launch or implement new layouts.

## Recommendation

Sell finished, purpose-specific Vahini planner packs and optional personalisation first. Keep bujo.js as the generator. A paid hosting platform, accounts and subscriptions are not needed to test whether people will buy the output.

The source already has seven editions, A4/A5 publishing, colour/monochrome palettes, cover names, illustrations, publisher footers and deterministic PDFs. These are existing capabilities, not proposed new features.

The 66-page bullet journal has twelve daily-plan pages and twelve weekly-overview pages, one of each per monthly section. It is an undated collection of templates, not a complete year of daily or weekly planning. Describe it accurately until a new edition is approved.

## Features in priority order

| Priority | Proposed feature | Buyer value | Acceptance evidence |
| --- | --- | --- | --- |
| 1 | Complete one-month pack: 31 daily pages, five weekly spreads, monthly plan, review and notes | A usable standalone product with enough pages for the stated duration | Approved sample pages; exact page inventory; binding proof |
| 1 | Print production profiles: duplex inner/outer margins, binding allowance, low-ink version, trim size and separate cover | Output suitable for a chosen print supplier | Printer specification matched; physical proof approved; font and clipping checks |
| 1 | Branded editions: approved logo, cover styles, configurable accent colours and a print instruction page | Vahini branding and school/company orders | Asset rights and logo integrity checked; approved sample |
| 2 | Clickable PDF contents, month tabs and return-to-index links | Convenient tablet use | All links resolve; check in target PDF apps |
| 2 | Reusable pack recipes with validated page order and count | Produce student, parent-child and professional editions without hand-editing code | Bounded input schema; deterministic generation; correct index |
| 2 | Embedded licensed fonts and tested Telugu/Hindi text shaping | Regional-language editions and names | Native reader review; glyph, shaping, wrapping and embedded-font checks |
| 3 | Order-specific generation with secure download delivery | Automated personalisation after payment | Server-side payment verification; private storage; retention and retry rules |

Start with one audience and one month. A student study pack is the closest fit to the existing pages. A software-professional pack can support Beyond the Screen later. Medical or pregnancy guidance needs a separate qualified content review; this generator does not supply that expertise.

For the first pilot, offer a digital pack and a personalised version. Choose prices only after sample feedback and, for print, a supplier quote. No revenue or demand forecast was verified in this review.

## Bugs covered by the fix

- [#8](https://github.com/vahinitech/bujo.js/issues/8): non-finite or tiny dot spacing and invalid dimensions can corrupt coordinates or cause excessive work. Validate before changing the document and cap grids at 100,000 dots.
- [#9](https://github.com/vahinitech/bujo.js/issues/9): titles containing path separators control the Node save path. Convert the save name to a basename while preserving the displayed title.
- [#11](https://github.com/vahinitech/bujo.js/issues/11): another CLI option was accepted as a missing argument value. Reject option tokens before building.
- [#10](https://github.com/vahinitech/bujo.js/issues/10): inherited object properties pass paper-size validation. Check own keys at all three public entry points.

Normal edition IDs, page counts, filenames and manifest fields must remain unchanged. The downstream vahini-web pin is not updated by this review.

## Remaining work before selling

- Review dependency, font, artwork and written-content rights for the exact product. The repository has an MIT LICENSE; that file is not an audit of every input asset or a product licence.
- Print a physical sample. Current fixed symmetric margins and built-in fonts are not evidence of compliance with a chosen printer's requirements.
- Confirm that handwriting instructions and product descriptions make only supported claims.
- Add customer-facing previews and clear descriptions of included pages, paper sizes, printing instructions and support.
- For any hosted generator, add request-size limits, timeouts and concurrency limits. The dot limit in one method is not complete service protection.
- Consider staged publication for the build script: it writes PDFs directly to the output folder. Interrupted builds can leave partial output; deployment should publish a completed build as a unit.
- This was a focused source/test review, not a complete security or licensing audit.

## Primary references

- [Lulu PDF creation settings](https://help.lulu.com/en/support/solutions/articles/64000255519-pdf-creation-settings): printer-specific gutter, safety and bleed requirements.
- [Lulu formatting guidance](https://help.lulu.com/en/support/solutions/articles/64000255583): embedded fonts and binding allowance.
- [Goodnotes PDF hyperlinks](https://support.goodnotes.com/hc/en-us/articles/13623343439631-Open-hyperlinks-in-imported-PDFs): navigation between PDF pages.

Shop conversion and SEO guides do not apply to this patch: it changes a separate PDF library, not shop pages, routes, catalogue data or analytics. Any shop listing or storefront work requires its own approved scope and mockups.
