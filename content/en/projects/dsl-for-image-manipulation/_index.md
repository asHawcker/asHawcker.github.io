---
title: "Image Manipulation Language in C"
description: "A DSL for Image manipulation in C"
bookcase_cover_src: "cover/c.png"
bookcase_cover_src_dark: "cover/c-dark.png"
type: "postcard"
weight: 10000
date: 2026-01-16
---

# IML - Image Manipulation Language

{{< icon-group gap="14px" >}}
{{< icon vendor="feather" name="github" link="https://github.com/asHawcker/dsl-for-image-manipulation-in-c" >}}
{{< /icon-group >}}

---

## Abstract

This project implements a Domain-Specific Language (DSL) in C for image manipulation tasks.
The DSL allows users to perform operations such as loading, saving, cropping, blurring,
rotating, and applying filters to images using a simple, expressive syntax with features like
piping for chaining operations. The system includes a lexer for tokenization, a parser for
generating an Abstract Syntax Tree (AST), semantic analysis for type checking, and an
evaluator for runtime execution.

## Why do we need this?

Image manipulation is a common task in fields like computer vision, graphic design, and media
processing. Existing tools are powerful but often
complex for simple workflows. A DSL for image manipulation simplifies this by providing concise
syntax for operations like filtering, transformations, and compositions. It enables non-experts to
chain operations efficiently (e.g., via piping), promotes reusability, and integrates seamlessly
with C-based systems. This DSL supports basic to advanced manipulations, making it suitable
for educational, prototyping, or lightweight production use.

## Features

- **Load/Save Images**: Read and write PNG/JPG images using `load` and `save`.
- **Crop**: Extract rectangular regions with `crop(x, y, width, height)`.
- **Blur**: Apply a box blur with `blur(radius)`.
- **Pipeline Syntax**: Chain operations (e.g., `load("input.png") |> crop(50,50,300,300)`).
- **Error Handling**: Logs invalid crop bounds or memory issues to prevent crashes or incorrect outputs (e.g., gray images).
- **AST Debugging**: Use `--dump-ast` to inspect the Abstract Syntax Tree.

_For installation and Usage instructions, visit the github._

**Documentation can be found [here](/docs/iml-docs.pdf)**

{{< color-block style="warning" >}}

Disclaimer :

This was a team project and my part involved the following:<br>

- Image manipulation algorithms implementations in C.<br>
- Efficient Image Memory Management to avoid segmentation Faults.
  {{< /color-block >}}
