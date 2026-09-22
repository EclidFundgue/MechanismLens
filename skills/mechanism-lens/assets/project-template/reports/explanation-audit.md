# Explanation audit

Generated projects should record:

- mechanism-step coverage for the user's question;
- numeric claim and code-path source coverage;
- mechanism-to-source and visual-to-mechanism mappings;
- template selections and generic fallbacks;
- fixed-frame readability, necessary camera requests, detail-slot stability and narrow-screen checks;
- number of frame changes that did not improve readability;
- time that asked viewers to read new content while camera motion was active (target: zero);
- unsupported or low-confidence interpretations;
- analysis scope, excluded files, assumptions and unresolved behavior;
- confirmation that a retained URL repository stayed under `sources/code/` and was not published into `site/`.
