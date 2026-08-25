---
name: add-quote
description: Append a quote to seed-quotes.json. Use when the user asks to add a quote to the seed file.
argument-hint: "<quote text> <tag>"
arguments: [text, tag]
allowed-tools: Read Edit
---

# Add a quote to the seed file

Append one quote object to `seed-quotes.json` in the project root:

- `text`: $text
- `tag`: $tag
- `favorite`: false
- `id`: a short unique id

Read `seed-quotes.json`, add the object to the array, write it back as valid JSON.