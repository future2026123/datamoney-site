# Investor result cards

`tools/investor-type/result-cards/20261101-names/0.png` through `7.png` are the
canonical share images, in the same order as the result type codes. The result
preview, image download, device share and result-email attachment all use the
same corresponding PNG. The images contain the character and its general type,
not the user's current mood answers.

The type names, in code order, are 존버형, 짠테크형, 촉형, 포모형, 알빠롱형,
뇌지컬형, 줍줍형, and 야수형. Use these names consistently in the result,
comparison, saved report, email, and card; the animal illustrations do not
replace the type names. Keep type codes stable so previously saved results retain
the same type.

When the card design or character artwork changes, regenerate all eight cards,
place them under a new versioned directory, and update the card paths in both
`tools/investor-type/app.js` and `workers/article-engagement.js`. Deploy the new
files before the worker starts using them. The email worker accepts only a
validated type code and fetches the fixed image from the public Pages project;
it does not accept attachment files or URLs supplied by the browser.

Run `node tests/investor-ui.mjs` and `node tests/investor-email.mjs` to verify
that the preview, share file and email attachment select the same result card.
