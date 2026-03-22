# Journey Asset Slots

`tmp/journey-green-move-like-image.html` now reads the PNG files directly from the repo root:

- `character_step1_body_only_keep_black_no_green.png`
- `character_step2_body_only_transparent.png`
- `character_step3_body_only_transparent.png`
- `character_step4_body_only_transparent_clean.png`

If any file is missing, the HTML falls back to the built-in vector placeholder for that step.
