#!/usr/bin/env python3
"""Read a local or public repository and emit MechanismLens Code IR.

The intake is static and read-only. URL inputs are shallow-cloned into the
generated project's sources/code/repository directory and retained there.
"""

from __future__ import annotations

import argparse
import ast
import json
import os
import re
import subprocess
import sys
from pathlib import Path


EXCLUDED_DIRS = {".git", "node_modules", "dist", "build", ".venv", "venv", "__pycache__", ".next", "coverage"}
EXCLUDED_NAMES = {".env", ".env.local", ".env.production", "id_rsa", "id_ed25519"}
TEXT_SUFFIXES = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}
MAX_FILE_BYTES = 512_000


def slug(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-.")
    return cleaned or "item"


def is_url(value: str) -> bool:
    return bool(re.match(r"^(https?://|file://|git@)", value))


def clone_repository(url: str, project_root: Path) -> Path:
    destination = project_root / "sources" / "code" / "repository"
    if destination.exists() and any(destination.iterdir()):
        raise RuntimeError(f"clone target must not already contain files: {destination}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    environment = os.environ.copy()
    environment["GIT_LFS_SKIP_SMUDGE"] = "1"
    command = ["git", "clone", "--depth", "1", "--single-branch", "--no-tags", url, str(destination)]
    completed = subprocess.run(command, env=environment, text=True, capture_output=True)
    if completed.returncode != 0:
        raise RuntimeError(f"git clone failed:\n{completed.stderr.strip() or completed.stdout.strip()}")
    return destination


def readable_files(root: Path):
    for path in sorted(root.rglob("*")):
        try:
            relative = path.relative_to(root)
        except ValueError:
            continue
        if any(part in EXCLUDED_DIRS for part in relative.parts[:-1]):
            continue
        if path.name in EXCLUDED_NAMES or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        try:
            if path.is_symlink() or not path.is_file() or path.stat().st_size > MAX_FILE_BYTES:
                continue
            resolved = path.resolve()
            if root.resolve() not in resolved.parents and resolved != root.resolve():
                continue
        except OSError:
            continue
        yield path, relative.as_posix()


class PythonCollector(ast.NodeVisitor):
    def __init__(self, file_entity: str, relative: str, lines: list[str]):
        self.file_entity = file_entity
        self.relative = relative
        self.lines = lines
        self.entities: list[dict] = []
        self.evidence: list[dict] = []
        self.relations: list[dict] = []
        self.unresolved: list[dict] = []
        self.stack: list[str] = []
        self.by_name: dict[str, str] = {}
        self.pending_calls: list[tuple[str, str, ast.Call]] = []

    def excerpt(self, start: int, end: int) -> str:
        return "\n".join(self.lines[start - 1:end])

    def add_definition(self, node: ast.AST, kind: str, name: str):
        start = getattr(node, "lineno", 1)
        end = getattr(node, "end_lineno", start) or start
        qualified = ".".join([*self.stack, name])
        entity_id = slug(f"entity.{self.relative}.{qualified}")
        evidence_id = slug(f"evidence.{self.relative}.{qualified}")
        self.entities.append({"id": entity_id, "kind": kind, "name": name, "path": self.relative, "symbol": qualified, "lineStart": start, "lineEnd": end, "evidenceIds": [evidence_id]})
        self.evidence.append({"id": evidence_id, "label": qualified, "kind": "code", "path": self.relative, "symbol": qualified, "lineStart": start, "lineEnd": end, "excerpt": self.excerpt(start, end), "basis": "source_fact"})
        relation_id = slug(f"relation.contains.{self.file_entity}.{entity_id}")
        self.relations.append({"id": relation_id, "kind": "contains", "from": self.file_entity, "to": entity_id, "evidenceIds": [evidence_id]})
        self.by_name.setdefault(name, entity_id)
        return entity_id

    def visit_ClassDef(self, node: ast.ClassDef):
        entity_id = self.add_definition(node, "class", node.name)
        self.stack.append(node.name)
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                item._mechanism_parent = entity_id
            self.visit(item)
        self.stack.pop()

    def _visit_function(self, node: ast.FunctionDef | ast.AsyncFunctionDef):
        kind = "method" if self.stack else "function"
        entity_id = self.add_definition(node, kind, node.name)
        previous = getattr(self, "current_function", None)
        self.current_function = entity_id
        self.stack.append(node.name)
        for item in node.body:
            self.visit(item)
        self.stack.pop()
        self.current_function = previous

    visit_FunctionDef = _visit_function
    visit_AsyncFunctionDef = _visit_function

    def visit_Call(self, node: ast.Call):
        caller = getattr(self, "current_function", self.file_entity)
        if isinstance(node.func, ast.Name):
            callee = node.func.id
        elif isinstance(node.func, ast.Attribute):
            callee = node.func.attr
        else:
            callee = "dynamic"
        self.pending_calls.append((caller, callee, node))
        self.generic_visit(node)

    def finish(self):
        for caller, callee, node in self.pending_calls:
            target = self.by_name.get(callee)
            start = getattr(node, "lineno", 1)
            end = getattr(node, "end_lineno", start) or start
            if not target:
                if callee == "dynamic":
                    self.unresolved.append({"id": slug(f"unresolved.{self.relative}.{start}"), "description": "Dynamic call target could not be resolved statically.", "path": self.relative, "reason": "dynamic_call"})
                continue
            evidence_id = slug(f"evidence.call.{self.relative}.{start}.{callee}")
            self.evidence.append({"id": evidence_id, "label": f"Call {callee}", "kind": "code", "path": self.relative, "symbol": callee, "lineStart": start, "lineEnd": end, "excerpt": self.excerpt(start, end), "basis": "source_fact"})
            self.relations.append({"id": slug(f"relation.call.{caller}.{target}.{start}"), "kind": "direct_call", "from": caller, "to": target, "evidenceIds": [evidence_id]})


def collect_python(path: Path, relative: str, text: str, file_entity: str):
    lines = text.splitlines()
    try:
        tree = ast.parse(text, filename=relative)
    except SyntaxError as error:
        unresolved = [{"id": slug(f"unresolved.syntax.{relative}"), "description": f"Python syntax could not be parsed: {error.msg}", "path": relative, "reason": "syntax_error"}]
        return [], [], [], unresolved
    collector = PythonCollector(file_entity, relative, lines)
    collector.visit(tree)
    collector.finish()
    return collector.entities, collector.relations, collector.evidence, collector.unresolved


def collect_javascript(relative: str, text: str, file_entity: str):
    entities, relations, evidence = [], [], []
    lines = text.splitlines()
    pattern = re.compile(r"^\s*(?:export\s+)?(?:async\s+)?(?:function|class)\s+([A-Za-z_$][\w$]*)|^\s*(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(")
    for index, line in enumerate(lines, 1):
        match = pattern.search(line)
        if not match:
            continue
        name = match.group(1) or match.group(2)
        kind = "class" if "class" in line[:match.end()] else "function"
        entity_id = slug(f"entity.{relative}.{name}")
        evidence_id = slug(f"evidence.{relative}.{name}")
        entities.append({"id": entity_id, "kind": kind, "name": name, "path": relative, "symbol": name, "lineStart": index, "lineEnd": index, "evidenceIds": [evidence_id]})
        evidence.append({"id": evidence_id, "label": name, "kind": "code", "path": relative, "symbol": name, "lineStart": index, "lineEnd": index, "excerpt": line, "basis": "source_fact"})
        relations.append({"id": slug(f"relation.contains.{file_entity}.{entity_id}"), "kind": "contains", "from": file_entity, "to": entity_id, "evidenceIds": [evidence_id]})
    return entities, relations, evidence, []


def analyze(root: Path, location: str, source_type: str, title: str, question: str):
    repository_id = slug(f"code.{title}")
    entities, relations, evidence, unresolved = [], [], [], []
    language_focus = set()
    for path, relative in readable_files(root):
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError) as error:
            unresolved.append({"id": slug(f"unresolved.read.{relative}"), "description": f"File could not be read: {error}", "path": relative, "reason": "read_error"})
            continue
        file_entity = slug(f"entity.file.{relative}")
        file_evidence = slug(f"evidence.file.{relative}")
        first_lines = "\n".join(text.splitlines()[: min(20, len(text.splitlines()))])
        entities.append({"id": file_entity, "kind": "file", "name": Path(relative).name, "path": relative, "lineStart": 1, "lineEnd": max(1, min(20, len(text.splitlines()))), "evidenceIds": [file_evidence]})
        evidence.append({"id": file_evidence, "label": relative, "kind": "code", "path": relative, "lineStart": 1, "lineEnd": max(1, min(20, len(text.splitlines()))), "excerpt": first_lines, "basis": "source_fact"})
        if path.suffix.lower() == ".py":
            language_focus.add("Python AST")
            result = collect_python(path, relative, text, file_entity)
        else:
            language_focus.add("TypeScript/JavaScript anchors")
            result = collect_javascript(relative, text, file_entity)
        child_entities, child_relations, child_evidence, child_unresolved = result
        entities.extend(child_entities); relations.extend(child_relations); evidence.extend(child_evidence); unresolved.extend(child_unresolved)
    entrypoints = []
    candidates = [item for item in entities if item["kind"] in {"function", "method"} and item["name"] in {"main", "run", "start", "handle", "forward"}]
    if not candidates:
        candidates = [item for item in entities if item["kind"] in {"function", "method"}][:3]
    for index, entity in enumerate(candidates):
        entrypoints.append({"id": slug(f"entrypoint.{entity['id']}"), "entityId": entity["id"], "reason": "Named or selected as a likely functional entrypoint.", "evidenceIds": entity["evidenceIds"]})
    return {
        "repository": {"id": repository_id, "title": title, "location": location, "sourceType": source_type},
        "question": question,
        "scope": {"focus": sorted(language_focus), "excluded": ["Git metadata", "dependencies", "build outputs", "binary and sensitive files"], "limitations": ["The intake is static and does not execute the target project.", "TypeScript and JavaScript support records declarations and source anchors, not a complete call graph."]},
        "entities": entities,
        "relations": relations,
        "entrypoints": entrypoints,
        "evidence": evidence,
        "unresolved": unresolved,
    }


def main():
    parser = argparse.ArgumentParser(description="Create MechanismLens Code IR from a repository")
    parser.add_argument("source", help="Local repository path or public Git URL")
    parser.add_argument("project_root", help="Initialized MechanismLens project")
    parser.add_argument("--question", required=True, help="Mechanism question to investigate")
    parser.add_argument("--title", help="Repository display name")
    args = parser.parse_args()
    project_root = Path(args.project_root).resolve()
    content = project_root / "content"
    if not content.is_dir():
        raise RuntimeError(f"project is not initialized: {project_root}")
    if is_url(args.source):
        root = clone_repository(args.source, project_root)
        source_type = "git"
        location = args.source
    else:
        root = Path(args.source).resolve()
        if not root.is_dir():
            raise RuntimeError(f"repository directory does not exist: {root}")
        source_type = "local"
        location = str(root)
    title = args.title or root.name
    code_ir = analyze(root, location, source_type, title, args.question)
    output = content / "code-ir.json"
    output.write_text(json.dumps(code_ir, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output}")
    print(f"  entities: {len(code_ir['entities'])}")
    print(f"  relations: {len(code_ir['relations'])}")
    print(f"  evidence: {len(code_ir['evidence'])}")
    print(f"  unresolved: {len(code_ir['unresolved'])}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Code intake failed: {error}", file=sys.stderr)
        raise SystemExit(1)
