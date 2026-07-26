# Product

## Register

product

## Users
Three fixed roles, each locked to their own dashboard route: Marketing Manager, Sales Director, Business Owner at a PC merchandise business. They use this to make Facebook ad/page-performance decisions — reading correlations, regressions, forecasts, and simulations rather than authoring content. Sessions are workday, desk-based, data-dense: uploading CSVs, reading charts, running what-if simulations, generating reports. Not a casual or marketing-facing surface.

## Product Purpose
A decision support system that turns raw Facebook Ads/Page CSV exports into statistical analysis (Spearman correlation, multi-variable regression, Holt-Winters forecasting, what-if simulation) so each role can make merchandise/marketing decisions without doing the math themselves. Success looks like: a manager uploads data and walks away with a specific, actionable read on what's driving performance, not just a chart to stare at.

## Brand Personality
Follow the existing Sure-derived design system as the committed direction, not a new aesthetic. Dark-only, flat, precise, no-nonsense — a tool for someone reading numbers all day, not a marketing surface. Consistency with the already-ported Sure neutral/semantic color scale (`app/globals.css`) takes priority over introducing new visual ideas.

## Anti-references
Generic SaaS/AI-slop dashboard patterns: purple/indigo gradients, default Tailwind blue/indigo as primary, cliché hero-metric stat-card grids, flat `shadow-md`, identical card grids, side-stripe accent borders, gradient text. (Also codified as hard rules in this repo's CLAUDE.md.)

## Design Principles
- Match Sure's existing dark neutral/semantic scale and component conventions rather than introducing new tokens.
- Every interactive element needs explicit hover, focus-visible, and active states — this is a workday tool used via mouse and keyboard both.
- Motion should clarify state changes (sidebar collapse, dropdown open, panel expand), never decorate for its own sake.
- Density and precision over friendliness — this is read by people who already understand the numbers, not a first-touch marketing impression.
- No section, feature, or visual flourish beyond what a specific screen's workflow needs.

## Accessibility & Inclusion
Standard WCAG 2.2 AA: ≥4.5:1 contrast for body text, ≥3:1 for large text, visible focus-visible states on every interactive element, full keyboard operability (including the sidebar's hover-driven expand, which needs a keyboard-accessible equivalent), and `prefers-reduced-motion` alternatives for all animated transitions.
