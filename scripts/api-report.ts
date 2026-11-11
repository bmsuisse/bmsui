/**
 * Public API report: one deterministic Markdown file per published package
 * (`packages/<pkg>/api-report.md`) listing every export of the built
 * `dist/index.d.ts` with its kind and signature. Props/options interfaces and
 * object types are expanded member by member, so a removed, renamed or retyped
 * prop is a one-line change in the report's diff. Reviewers read that diff;
 * CI fails when the committed report is stale.
 *
 * Usage (after `bun run build`):
 *   bun run api-report           # rewrite the reports
 *   bun run api-report --check   # exit 1 if a report would change
 *
 * Idea from Astryx's scripts/api-report (MIT): rows are single lines inside
 * `text` fences, sorted by name, comments stripped, whitespace collapsed.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES = ["ui", "datagrid"] as const;

// typescript is a devDependency of the packages, not of the workspace root.
const require = createRequire(join(ROOT, "packages/ui/package.json"));
const ts = require("typescript") as typeof import("typescript");

type Kind = "component" | "hook" | "function" | "constant" | "interface" | "type" | "class" | "enum" | "namespace" | "re-export";

const SECTIONS: { kind: Kind; title: string }[] = [
  { kind: "component", title: "Components" },
  { kind: "hook", title: "Hooks" },
  { kind: "function", title: "Functions" },
  { kind: "constant", title: "Constants" },
  { kind: "class", title: "Classes" },
  { kind: "enum", title: "Enums" },
  { kind: "namespace", title: "Namespaces" },
  { kind: "interface", title: "Interfaces" },
  { kind: "type", title: "Types" },
  { kind: "re-export", title: "Re-exported from dependencies" },
];

interface Entry {
  name: string;
  kind: Kind;
  lines: string[];
}

const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });

function oneLine(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/import\("[^"]+"\)\./g, "")
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]/g, "]")
    .replace(/;\s*}/g, " }")
    .replace(/;$/, "")
    .trim();
}

function print(node: ts.Node, sf: ts.SourceFile): string {
  return oneLine(printer.printNode(ts.EmitHint.Unspecified, node, sf));
}

const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function packageOf(file: string): string {
  // The last node_modules segment: bun's store nests packages under node_modules/.bun/<id>/node_modules/.
  const matches = [...file.split("\\").join("/").matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)/g)];
  return matches[matches.length - 1]?.[1] ?? file;
}

function memberLines(members: readonly ts.TypeElement[], sf: ts.SourceFile): string[] {
  return members
    .map((m) => {
      const key = m.name ? print(m.name, sf) : "";
      return { key, text: `  ${print(m, sf)}` };
    })
    .sort((a, b) => byName(a.key, b.key) || byName(a.text, b.text))
    .map((m) => m.text);
}

/** A parameter without its destructuring pattern: `{ a, b }: Props` → `props: Props` (the pattern is implementation detail). */
function param(p: ts.ParameterDeclaration, sf: ts.SourceFile): string {
  if (ts.isIdentifier(p.name)) return print(p, sf);
  const rest = p.dotDotDotToken ? "..." : "";
  const optional = p.questionToken || p.initializer ? "?" : "";
  return `${rest}props${optional}${p.type ? `: ${print(p.type, sf)}` : ""}`;
}

/** Strips destructuring patterns from the parameters of function types inside `node`. */
function printSignatureType(node: ts.TypeNode, sf: ts.SourceFile): string {
  if (ts.isFunctionTypeNode(node)) {
    return oneLine(`${typeParams(node.typeParameters, sf)}(${node.parameters.map((p) => param(p, sf)).join(", ")}) => ${print(node.type, sf)}`);
  }
  return print(node, sf);
}

/**
 * Members inherited from interfaces that live in the bundle but aren't exported
 * themselves (e.g. a shared `ComboboxBaseProps`): without them a prop removed
 * from the base would not show in any row. Exported bases have their own entry.
 */
function inheritedFromInternal(
  decl: ts.InterfaceDeclaration,
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
  seen: Set<ts.Declaration>,
): string[] {
  const lines: string[] = [];
  for (const clause of decl.heritageClauses ?? []) {
    for (const base of clause.types) {
      const symbol = checker.getSymbolAtLocation(base.expression);
      const target = symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      for (const baseDecl of target?.getDeclarations() ?? []) {
        if (!ts.isInterfaceDeclaration(baseDecl) || baseDecl.getSourceFile() !== sf || seen.has(baseDecl)) continue;
        if (exportedDeclarations.has(baseDecl)) continue;
        seen.add(baseDecl);
        const from = baseDecl.name.text;
        lines.push(...memberLines(baseDecl.members, sf).map((l) => `${l}  (from ${from})`));
        lines.push(...inheritedFromInternal(baseDecl, sf, checker, seen));
      }
    }
  }
  return lines;
}

/** Declarations reachable as exports of the bundle being reported (set per package). */
let exportedDeclarations = new Set<ts.Declaration>();

function typeParams(params: ts.NodeArray<ts.TypeParameterDeclaration> | undefined, sf: ts.SourceFile): string {
  return params?.length ? `<${params.map((p) => print(p, sf)).join(", ")}>` : "";
}

function describeDeclaration(name: string, decl: ts.Declaration, sf: ts.SourceFile, checker: ts.TypeChecker): Entry {
  const as = ts.getNameOfDeclaration(decl)?.getText(sf);
  const alias = as && as !== name ? ` (declared as ${as})` : "";

  if (ts.isInterfaceDeclaration(decl)) {
    const heritage = decl.heritageClauses?.map((h) => print(h, sf)).join(" ") ?? "";
    const header = oneLine(`interface ${name}${typeParams(decl.typeParameters, sf)} ${heritage}`) + alias;
    return {
      name,
      kind: "interface",
      lines: [header, ...memberLines(decl.members, sf), ...inheritedFromInternal(decl, sf, checker, new Set())],
    };
  }

  if (ts.isTypeAliasDeclaration(decl)) {
    const head = `type ${name}${typeParams(decl.typeParameters, sf)}`;
    const t = decl.type;
    if (ts.isTypeLiteralNode(t)) {
      return { name, kind: "type", lines: [`${head} = {…}${alias}`, ...memberLines(t.members, sf)] };
    }
    if (ts.isIntersectionTypeNode(t) && t.types.some(ts.isTypeLiteralNode)) {
      const others = t.types.filter((p) => !ts.isTypeLiteralNode(p)).map((p) => print(p, sf));
      const literals = t.types.filter(ts.isTypeLiteralNode).flatMap((p) => memberLines(p.members, sf));
      return { name, kind: "type", lines: [`${head} = ${[...others, "{…}"].join(" & ")}${alias}`, ...literals] };
    }
    return { name, kind: "type", lines: [`${head} = ${print(t, sf)}${alias}`] };
  }

  if (ts.isFunctionDeclaration(decl)) {
    const sig = `${typeParams(decl.typeParameters, sf)}(${decl.parameters.map((p) => param(p, sf)).join(", ")})${
      decl.type ? `: ${print(decl.type, sf)}` : ""
    }`;
    return { name, kind: valueKind(name, true), lines: [`function ${name}${sig}${alias}`] };
  }

  if (ts.isVariableDeclaration(decl)) {
    const type = decl.type
      ? printSignatureType(decl.type, sf)
      : oneLine(checker.typeToString(checker.getTypeAtLocation(decl), undefined, ts.TypeFormatFlags.NoTruncation));
    const callable = checker.getTypeAtLocation(decl).getCallSignatures().length > 0;
    return { name, kind: valueKind(name, callable), lines: [`const ${name}: ${type}${alias}`] };
  }

  if (ts.isClassDeclaration(decl)) {
    const members = decl.members
      .filter((m) => !(ts.getCombinedModifierFlags(m as ts.Declaration) & ts.ModifierFlags.Private))
      .map((m) => `  ${print(m, sf)}`)
      .sort(byName);
    return { name, kind: "class", lines: [`class ${name}${typeParams(decl.typeParameters, sf)}${alias}`, ...members] };
  }

  if (ts.isEnumDeclaration(decl)) {
    return { name, kind: "enum", lines: [`enum ${name}${alias}`, ...decl.members.map((m) => `  ${print(m, sf)}`)] };
  }

  if (ts.isModuleDeclaration(decl)) {
    return { name, kind: "namespace", lines: [`namespace ${name}: ${print(decl, sf)}`] };
  }

  return { name, kind: "type", lines: [`${name}: ${print(decl, sf)}`] };
}

function valueKind(name: string, callable: boolean): Kind {
  if (/^use[A-Z0-9]/.test(name) && callable) return "hook";
  if (/^[A-Z]/.test(name) && callable) return "component";
  return callable ? "function" : "constant";
}

function report(pkg: (typeof PACKAGES)[number]): string {
  const pkgDir = join(ROOT, "packages", pkg);
  const dts = join(pkgDir, "dist/index.d.ts");
  if (!existsSync(dts)) {
    throw new Error(`${relative(ROOT, dts)} is missing — run \`bun run build\` first.`);
  }
  const { name: pkgName } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")) as { name: string };

  const program = ts.createProgram([dts], {
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    types: [],
  });
  const checker = program.getTypeChecker();
  const sf = program.getSourceFile(dts)!;
  const moduleSymbol = checker.getSymbolAtLocation(sf);
  if (!moduleSymbol) throw new Error(`${dts} has no exports`);

  const exportsOfModule = checker.getExportsOfModule(moduleSymbol);
  exportedDeclarations = new Set(
    exportsOfModule.flatMap((e) => (e.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(e) : e).getDeclarations() ?? []),
  );
  const entries: Entry[] = [];
  for (const exported of exportsOfModule) {
    const name = exported.getName();
    const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
    const decls = target.getDeclarations() ?? [];
    const local = decls.filter((d) => d.getSourceFile() === sf);
    const external = decls.filter((d) => d.getSourceFile() !== sf);
    for (const decl of local) entries.push(describeDeclaration(name, decl, sf, checker));
    if (external.length > 0) {
      const from = [...new Set(external.map((d) => packageOf(d.getSourceFile().fileName)))].sort().join(", ");
      entries.push({ name, kind: "re-export", lines: [`${name} from ${from}`] });
    }
  }

  const out: string[] = [
    `# ${pkgName} API report`,
    "",
    "<!-- Generated by scripts/api-report.ts from dist/index.d.ts. Do not edit by hand:",
    "     run `bun run build && bun run api-report` and commit the result. -->",
    "",
    "Every public export with its kind and signature. Interfaces and object types",
    "list their own members one per line (inherited members come from the `extends`",
    "clause), so the diff of this file shows exactly what changed in the public API.",
  ];
  for (const { kind, title } of SECTIONS) {
    const items = entries
      .filter((e) => e.kind === kind)
      .sort((a, b) => byName(a.name, b.name) || byName(a.lines.join("\n"), b.lines.join("\n")));
    if (items.length === 0) continue;
    out.push("", `## ${title} (${items.length})`, "", "```text");
    for (const item of items) out.push(...item.lines);
    out.push("```");
  }
  return `${out.join("\n")}\n`;
}

const check = process.argv.includes("--check");
let stale = false;
for (const pkg of PACKAGES) {
  const file = join(ROOT, "packages", pkg, "api-report.md");
  const next = report(pkg);
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (current === next) {
    console.log(`api-report: ${relative(ROOT, file)} up to date`);
    continue;
  }
  if (check) {
    stale = true;
    console.error(`api-report: ${relative(ROOT, file)} is out of date`);
  } else {
    writeFileSync(file, next);
    console.log(`api-report: wrote ${relative(ROOT, file)}`);
  }
}
if (stale) {
  console.error("The public API changed: run `bun run build && bun run api-report` and commit packages/*/api-report.md.");
  process.exit(1);
}
