// 운영 지시문·스키마·후처리를 메모리에서만 읽는다. SDK·외부 의존성은 실행하지 않는다.
// 사용: const prod = require('./load-prod.cjs').loadProd({ repoRoot });
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');

function loadProd({ repoRoot }) {
  const ts = require(path.join(repoRoot, 'node_modules/typescript'));
  const modules = new Map();
  class OpenAIStub {}
  OpenAIStub.default = OpenAIStub;

  function compile(name, suffix = '') {
    if (modules.has(name)) return modules.get(name).exports;
    const filename = path.join(repoRoot, 'functions/src', `${name}.ts`);
    const src = fs.readFileSync(filename, 'utf8') + suffix;
    const { outputText } = ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    });
    const mod = new Module(filename);
    mod.filename = filename;
    mod.require = (id) => {
      if (id === './method-catalog') return compile('method-catalog');
      if (id === './types') return {};
      if (id === 'openai') return OpenAIStub;
      throw new Error(`운영 소스의 허용하지 않은 require: ${id}`);
    };
    modules.set(name, mod);
    mod._compile(outputText, filename);
    return mod.exports;
  }

  const client = compile('openai-client', '\nexport const __PROMPT = PHOTO_ANALYSIS_SYSTEM_PROMPT;\n');
  const core = compile('analyze-photo-core');
  const git = (...args) => execFileSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8' }).trim();
  return {
    prompt: client.__PROMPT,
    schema: client.PHOTO_ANALYSIS_SCHEMA,
    methodContext: core.buildMethodContextText(),
    buildPhotoRouterResult: core.buildPhotoRouterResult,
    promptSha256: createHash('sha256').update(client.__PROMPT).digest('hex'),
    gitHead: git('rev-parse', 'HEAD'),
    functionsSrcDirty: git('status', '--porcelain', '--', 'functions/src') !== '',
  };
}

module.exports = { loadProd };
