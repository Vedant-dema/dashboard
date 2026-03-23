# Diagram technology logos (reference)

All architecture and ERD diagrams in this repo use **technology logo strips** directly under each Mermaid block. Icons are served from the **Simple Icons CDN** ([`cdn.simpleicons.org`](https://github.com/simple-icons/simple-icons)) — same approach as [Blueprint-Azure-Complete.md](./Blueprint-Azure-Complete.md).

**Why not inside Mermaid?** Mermaid node labels do not reliably render embedded images across GitHub, VS Code, and PDF export pipelines. Inline HTML `<img>` after the code fence is the most portable pattern.

**Accessibility:** Each icon has `alt` and `title` set to the product name.
