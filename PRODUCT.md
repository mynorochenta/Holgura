# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: a student learning the Simplex method, working alone on a laptop, close to the screen. They type a linear programming model (or load an example) and step through the solution one row operation at a time to understand why each variable enters or leaves and how every cell is computed. Secondary: an evaluator who opens the link to confirm the program solves any problem of the topic, and a portfolio reader who opens it for a couple of minutes.

## Product Purpose

Holgura solves linear programming problems with the Simplex method (maximize or minimize, ≤ ≥ =, Big M for ≥ and =) and shows the whole tableau sequence step by step, explained in Spanish. Success: the student can follow and reproduce every operation by hand, and every result is confirmed by an independent solver.

## Positioning

One operation per step: entering variable, leaving variable, pivot to 1, each "make zero" and the Z row are separate steps, each with the rule written as an equation and the arithmetic of any changed cell on demand. Exact arithmetic with fractions underneath (decimals by default, fractions on request), and an independent check with javascript-lp-solver on every run.

## Operating Context

Used on a laptop, light indoor conditions, single focused study session. The tableau format follows the standard classroom layout: columns Base | x₁ … xₙ | slack/surplus/artificial | Solution, plus a ratio column; the Z row last, written as Z − c₁x₁ − c₂x₂ = 0; the most negative Z coefficient enters; minimum ratio leaves. Slack Sᵢ (≤), surplus eᵢ (≥), artificial Aᵢ (≥ and =).

## Capabilities and Constraints

- Input as text (`max z = 3x1 + 5x2`, one constraint per line, inline errors per line) or as a table, kept in sync. Four preloaded examples with Guatemalan context (furniture shop in Mixco, coffee blend in Antigua, textile cooperative in Sololá, infeasible bakery order in Quetzaltenango).
- Detects infeasible, unbounded, multiple optima and degeneracy.
- Scope is closed: no graphical method, dual, sensitivity analysis or transportation models.
- Stack: React + Vite + TypeScript, Tailwind CSS 4, KaTeX, fraction.js, motion, javascript-lp-solver, Vitest. Deployed on Vercel. Logic in `src/core/` has no React dependency.
- Interface text in Spanish; never mentions a class, course, professor, university or final project.

## Brand Commitments

- Name: Holgura ("slack variable").
- Voice: explains the method plainly, like a good textbook; row operations written as "R2 ← R2 − 3 · R1".

## Evidence on Hand

- 99 Vitest tests with known solutions (including the reference problems Z = 1040 and Z = 2400).
- Every run is compared live against javascript-lp-solver.
- No users, testimonials or usage numbers exist; none may be invented.

## Product Principles

1. Every number on screen can be traced to the operation that produced it.
2. One operation at a time; the student never has to guess what changed.
3. Exact before pretty: arithmetic is exact, display format is a choice.
4. The result is verified, not asserted.

## Accessibility & Inclusion

WCAG AA contrast in every theme, full keyboard navigation of the steps, and a reduced-motion mode that keeps every state change visible.
