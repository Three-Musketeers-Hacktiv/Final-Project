import ts from 'typescript';
export default {
  esbuild: false,
  plugins: [{ name: 'in-process-typescript', enforce: 'pre', transform(code, id) {
    if (!/\.tsx?(\?|$)/.test(id)) return;
    return { code: ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, sourceMap: false } }).outputText, map: null };
  }}],
  test: { include: ['src/**/*.test.ts', 'tests/game-engine/**/*.test.ts'], pool: 'threads', maxWorkers: 1, minWorkers: 1 }
};
