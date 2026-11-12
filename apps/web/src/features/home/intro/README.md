# intro

The opening runs once per browser session, only at the home page and if motion is allowed.
Any key, click or touch skips it. The heading remains readable to assistive technology;
the typed line and decorative mark are hidden from it.

```text
use-opening.ts  the one-shot beats and skip handling; skipping cancels all later beats
timeline.ts     the beats in milliseconds, pure and tested
once.ts         pure claimOpening, decided once at start-up; without storage it does not play
```

`../Cover.tsx` owns the photograph, mark and heading for the entire visit. After the reveal,
the line, mark and heading fade away together. The photograph retains its size, crop and opacity;
the heading remains available to assistive technology. The header appears without moving the scene. When needed, the region dialog fades
in over this same photograph and fades out before showing the home controls.
