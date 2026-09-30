# Remove decorative icon boxes and audit cloud usage

## What will change
- Remove decorative square and rounded-square backgrounds, borders, rings, gradients, and shadows wrapped around icons across public pages, student areas, instructor pages, and admin screens.
- Keep icons visible as clean standalone symbols, using existing semantic colours and spacing.
- Preserve genuinely functional shapes: icon-only buttons, navigation controls, avatars, status dots, progress indicators, logos, and image frames.
- Check representative desktop and mobile pages to ensure removing wrappers does not disturb alignment or readability.

## Cloud usage review
- Report the current cost breakdown and database health in plain language.
- Identify scheduled jobs, repeated writes, polling, and live updates that can be reduced safely.
- Do not disable sign-ins, payments, learning access, confirmation emails, or the weekly backup without explicit approval.

## Technical details
- Apply focused class changes at each decorative icon wrapper rather than a broad CSS override, preventing accidental changes to buttons and controls.
- Verify the preview build and scan changed files for remaining decorative icon-box patterns.
