---
title: lildocs Example
---

# lildocs Example

This example shows the main Markdown features used by the fixture documentation site.

![Small example image](images/example.svg)

## Quickstart

Run the CLI against this folder:

```bash
lildocs ./docs
```

Read the [authoring guide](guides/authoring.md) or browse the [CLI reference](reference/cli.md).

## Mermaid

```mermaid
flowchart LR
  Markdown --> Build
  Build --> StaticHTML[Static HTML]
```
