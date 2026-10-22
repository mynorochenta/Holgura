---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

Scope: the whole Holgura page (model entry and step-by-step solution). Visitor mode: Operate. Audience: a student learning Simplex on a laptop, close to the screen. Task: type or load a model, then step through the tableau one row operation at a time. Constraints: Spanish UI, four themes kept (Papel, Blanco, Sepia, Pizarra), KaTeX for math, Fragment Mono only in the text editor, Work Sans for the interface, notebook margin and paper grain removed.

## Direction contract

THESIS: The tableaus are a folio of registered plates at one fixed scale: the table never moves between steps, only the cells an operation touches are inked in that operation's colour. It refuses the category default of a form card beside a results card with a stepper.

OWN-WORLD: Warm near-white ground with one white plate per tableau, 1px warm-grey hairlines only inside tables, ink near-black, grey captions. Operation inks: selection green, pivot-to-1 blue, make-zero scarlet, Z row umber; colour lives in the inked numbers, not in fills or side stripes. Work Sans interface, KaTeX serif numerals and italic variables.

STORY: The student sees the whole run as a strip of plates, picks or steps to one, reads what the operation does in one line, and watches exactly which cells change.

FIRST VIEWPORT: Header bar with Holgura and controls; the model section: editor left (wide), live preview and Resolver under it, examples on the right. After solving, the solution section opens with the plate strip across the full width, then the step title at 40px with its caption "Lámina n de N · Iteración k", the explanation, and the plate (equation line plus tableau at 22px) on the left two thirds; model and preparation on the right.

FORM: Láminas en secuencia (botanical folio, challenger, competitive). seed:91da98467bb8ba08

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
