// The React entry is client code. tsup drops a top-level 'use client', so put
// it back on the built files for Next.js.
import { readFileSync, writeFileSync } from 'node:fs'
for (const f of ['dist/react/index.js', 'dist/react/index.cjs']) {
  const src = readFileSync(f, 'utf8')
  if (!src.startsWith("'use client'")) writeFileSync(f, `'use client';\n${src}`)
}
