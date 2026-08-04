#!/usr/bin/env python3
"""Validate Zenly Phase 1 module and atomic-issue references."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote


ROOT = Path(__file__).resolve().parents[2]
MASTER = ROOT / "Zenly_Ecosystem_Phase_1_Plan.md"
PHASE = ROOT / "Phase 1"
ISSUES = PHASE / "Issues"
INDEX = ISSUES / "00_ISSUE_INDEX.md"
VALID_STATUSES = {"TODO", "IN_PROGRESS", "BLOCKED", "DONE"}


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def main() -> int:
    errors: list[str] = []
    required = [MASTER, INDEX, PHASE / "16_TRACEABILITY_AND_AI_WORK_PACKAGES.md"]
    for path in required:
        if not path.is_file():
            fail(errors, f"Missing required file: {path.relative_to(ROOT)}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    master_text = MASTER.read_text(encoding="utf-8")
    module_registry: dict[str, Path] = {}
    for module_id, raw_path in re.findall(r"\|\s*`(P1-[A-Z]+)`\s*\|\s*\[[^]]+\]\(([^)]+)\)", master_text):
        path = ROOT / unquote(raw_path)
        module_registry[module_id] = path
        if not path.is_file():
            fail(errors, f"Module {module_id} points to missing file: {raw_path}")

    issue_files: dict[str, Path] = {}
    issue_statuses: dict[str, str] = {}
    issue_dependencies: dict[str, list[str]] = {}
    for path in sorted(ISSUES.glob("[0-9][0-9][0-9]_*.md")):
        text = path.read_text(encoding="utf-8")
        heading = re.search(r"^#\s+P1-I(\d{3})\s+—", text, re.MULTILINE)
        if not heading:
            fail(errors, f"Missing issue heading: {path.relative_to(ROOT)}")
            continue
        issue_id = heading.group(1)
        if issue_id in issue_files:
            fail(errors, f"Duplicate issue P1-I{issue_id}")
        issue_files[issue_id] = path

        status_match = re.search(r"^\*\*Status:\*\*\s*(\S+)", text, re.MULTILINE)
        status = status_match.group(1) if status_match else "MISSING"
        issue_statuses[issue_id] = status
        if status not in VALID_STATUSES:
            fail(errors, f"P1-I{issue_id} has invalid status: {status}")

        dependency_match = re.search(r"^\*\*Depends on:\*\*\s*(.+)$", text, re.MULTILINE)
        dependencies = re.findall(r"\d{3}", dependency_match.group(1)) if dependency_match else []
        issue_dependencies[issue_id] = dependencies

        modules_match = re.search(r"^\*\*Canonical modules — read fully:\*\*\s*(.+)$", text, re.MULTILINE)
        modules = re.findall(r"P1-[A-Z]+", modules_match.group(1)) if modules_match else []
        if not modules:
            fail(errors, f"P1-I{issue_id} has no canonical modules")
        for module_id in modules:
            if module_id not in module_registry:
                fail(errors, f"P1-I{issue_id} references unknown module {module_id}")

    for issue_id, dependencies in issue_dependencies.items():
        for dependency_id in dependencies:
            if dependency_id not in issue_files:
                fail(errors, f"P1-I{issue_id} depends on missing P1-I{dependency_id}")

    index_text = INDEX.read_text(encoding="utf-8")
    index_rows = re.findall(
        r"^\|\s*(\d{3})\s*\|\s*\[P1-I(\d{3})[^]]*\]\(([^)]+)\).*\|\s*(TODO|IN_PROGRESS|BLOCKED|DONE)\s*\|$",
        index_text,
        re.MULTILINE,
    )
    indexed: set[str] = set()
    for order, issue_id, raw_path, status in index_rows:
        if order != issue_id:
            fail(errors, f"Index order {order} does not match P1-I{issue_id}")
        if issue_id in indexed:
            fail(errors, f"Index contains duplicate P1-I{issue_id}")
        indexed.add(issue_id)
        target = INDEX.parent / unquote(raw_path)
        if not target.is_file():
            fail(errors, f"Index link for P1-I{issue_id} is missing: {raw_path}")
        if issue_statuses.get(issue_id) != status:
            fail(errors, f"P1-I{issue_id} status differs: issue={issue_statuses.get(issue_id)} index={status}")

    missing_from_index = sorted(set(issue_files) - indexed)
    extra_in_index = sorted(indexed - set(issue_files))
    for issue_id in missing_from_index:
        fail(errors, f"P1-I{issue_id} is missing from index")
    for issue_id in extra_in_index:
        fail(errors, f"Index references missing P1-I{issue_id}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"Validation failed with {len(errors)} error(s).", file=sys.stderr)
        return 1

    print(f"OK: {len(module_registry)} modules, {len(issue_files)} issues, statuses and dependencies are consistent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())