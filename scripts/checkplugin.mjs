let mod;
try {
  mod = await import('@vitejs/plugin-react');
} catch (e) {
  console.error('import error:', e.message);
  process.exit(1);
}
console.log('module keys:', Object.keys(mod));
console.log('typeof default:', typeof mod.default);
const plugin = mod.default;
if (typeof plugin === 'function') {
  const inst = plugin();
  console.log('plugin() typeof:', typeof inst);
  console.log('plugin() isArray:', Array.isArray(inst));
  if (inst && !Array.isArray(inst)) {
    console.log('plugin name:', inst.name);
    console.log('plugin keys:', Object.keys(inst));
  }
} else {
  console.log('default is not a function; value:', plugin);
}
