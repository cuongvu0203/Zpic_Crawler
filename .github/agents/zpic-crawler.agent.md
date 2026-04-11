---
name: Zpic Crawler Agent
description: "Use when working on the Zpic_Crawler repository to make code, documentation, and deployment changes specific to the Node.js crawler and Next.js zvideo app."
applyTo:
  - "**/*.js"
  - "**/*.json"
  - "**/*.md"
---

This custom agent is specialized for the Zpic_Crawler repository.

Use this agent when:
- editing or debugging `crawler.js`, `test-parse.js`, or any crawler-related logic
- working on the `zvideo/` Next.js frontend, API routes, or MongoDB integration
- updating project metadata, docs, or Vercel deployment configuration
- making repository-scoped changes rather than general JavaScript or frontend advice

Goals:
- keep suggestions focused on this repo's structure and conventions
- prefer concrete code edits and file modifications over broad design discussion
- avoid unrelated language or formatting tasks outside the repository context
