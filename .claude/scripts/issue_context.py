#!/usr/bin/env python3
"""Resolve Zenly Phase 1 atomic issues and verify dependency readiness."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MASTER = ROOT / "Zenly_Ecosystem_Phase_1_Plan.md"
ISSUES = ROOT / "Phase 1" / "Issues"
VALID_STATUSES = {"TODO", "IN_PROGRESS", "BLOCKED", "DONE"}


def issue_id(value: str) -> str:
    match = re.search(r"(?:P1-I)?(\d{1,3})$", value.strip(), re.IGNORECASE)
    if not match:
        raise ValueError(f"Invalid issue ID: {value!r}")
    return match.group(1).zfill(3)


def parse_issue(path: Path) -> dict[str, object]:
    text = path.read_text(encoding="utf-8")
    heading = re.search(r"^#\s+P1-I(\d{3})\s+—\s+(.+)$", text, re.MULTILINE)
    if not heading:
        raise ValueError(f"Missing issue heading: {path}")

    def field(label: str) -> str:
        match = re.search(rf"^\*\*{re.escape(label)}:\*\*\s*(.+?)\s*$", text, re.MULTILINE)
        return match.group(1).strip() if match else ""

    dependency_text = field("Depends on")
    dependencies = [] if dependency_text in {"", "—"} else re.findall(r"\d{3}", dependency_text)
    modules_text = field("Canonical modules — read fully")
    modules = re.findall(r"P1-[A-Z]+", modules_text)
    status = field("Status")
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status {status!r}: {path}")

    objective_match = re.search(r"^## Objective\s+(.+?)(?=^## |\Z)", text, re.MULTILINE | re.DOTALL)
    surface_match = re.search(r"^## Allowed change surface\s+(.+?)(?=^## |\Z)", text, re.MULTILINE | re.DOTALL)
    return {
        "id": heading.group(1),
        "title": heading.group(2).strip(),
        "status": status,
        "dependencies": dependencies,
        "canonical_modules": modules,
        "objective": objective_match.group(1).strip() if objective_match else "",
        "allowed_change_surface": surface_match.group(1).strip() if surface_match else "",
        "path": str(path.relative_to(ROOT)),
    }


def all_issues() -> dict[str, dict[str, object]]:
    parsed: dict[str, dict[str, object]] = {}
    for path in sorted(ISSUES.glob("[0-9][0-9][0-9]_*.md")):
        item = parse_issue(path)
        key = str(item["id"])
        if key in parsed:
            raise ValueError(f"Duplicate issue P1-I{key}")
        parsed[key] = item
    return parsed


def module_paths() -> dict[str, str]:
    text = MASTER.read_text(encoding="utf-8")
    result: dict[str, str] = {}
    pattern = re.compile(r"\|\s*`(P1-[A-Z]+)`\s*\|\s*\[([^]]+)\]\(([^)]+)\)")
    for module_id, _label, raw_path in pattern.findall(text):
        result[module_id] = raw_path.replace("%20", " ")
    return result


def enrich(item: dict[str, object], issues: dict[str, dict[str, object]]) -> dict[str, object]:
    dependencies = []
    ready = True
    for dependency_id in item["dependencies"]:
        dependency = issues.get(str(dependency_id))
        if dependency is None:
            dependencies.append({"id": dependency_id, "status": "MISSING"})
            ready = False
        else:
            dependencies.append({"id": dependency_id, "status": dependency["status"], "path": dependency["path"]})
            ready = ready and dependency["status"] == "DONE"

    registry = module_paths()
    canonical = [
        {"id": module_id, "path": registry.get(str(module_id), "MISSING")}
        for module_id in item["canonical_modules"]
    ]
    return {**item, "dependency_state": dependencies, "ready": ready, "canonical_sources": canonical}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("issue", nargs="?", help="001, 1, or P1-I001")
    parser.add_argument("--next", action="store_true", help="select the first TODO issue whose dependencies are DONE")
    parser.add_argument("--json", action="store_true", help="emit JSON")
    args = parser.parse_args()

    try:
        issues = all_issues()
        if args.next:
            selected = next(
                (enrich(item, issues) for item in issues.values() if item["status"] == "TODO" and enrich(item, issues)["ready"]),
                None,
            )
            if selected is None:
                raise ValueError("No dependency-ready TODO issue found")
        elif args.issue:
            key = issue_id(args.issue)
            if key not in issues:
                raise ValueError(f"Issue P1-I{key} does not exist")
            selected = enrich(issues[key], issues)
        else:
            parser.error("provide an issue ID or --next")

        if args.json:
            print(json.dumps(selected, ensure_ascii=False, indent=2))
        else:
            print(f"Issue: P1-I{selected['id']} — {selected['title']}")
            print(f"Status: {selected['status']}")
            print(f"Ready: {'YES' if selected['ready'] else 'NO'}")
            print(f"Path: {selected['path']}")
            print("Dependencies:")
            if selected["dependency_state"]:
                for dependency in selected["dependency_state"]:
                    print(f"  - P1-I{dependency['id']}: {dependency['status']}")
            else:
                print("  - none")
            print("Canonical sources:")
            for source in selected["canonical_sources"]:
                print(f"  - {source['id']}: {source['path']}")
            print(f"Objective: {selected['objective']}")
            print(f"Allowed change surface: {selected['allowed_change_surface']}")
        return 0
    except (OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())