const files = [
  'src/main.tsx', 'src/App.tsx', 'src/pages/Builder.tsx', 'src/pages/Home.tsx',
  'src/pages/Login.tsx', 'src/pages/Apps.tsx', 'src/pages/Workflows.tsx',
  'src/pages/Runs.tsx', 'src/components/FieldInput.tsx', 'src/components/ui.tsx',
  'src/api.ts', 'src/types.ts',
];
const base = 'http://localhost:5173/';
for (const f of files) {
  const r = await fetch(base + f);
  const t = await r.text();
  if (!r.ok) {
    console.log('FAIL', f, r.status);
    console.log(t.slice(0, 800));
  } else {
    console.log('OK', f, t.length);
  }
}
