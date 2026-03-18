from __future__ import annotations

from typing import Any

documents: dict[tuple[int, int], dict[str, Any]] = {}
presence: dict[int, dict[str, dict[str, Any]]] = {}


def split_lines(text: str) -> list[str]:
    return text.split("\n")


def join_lines(lines: list[str]) -> str:
    return "\n".join(lines)


def apply_ace_delta(lines: list[str], delta: dict[str, Any]) -> list[str]:
    action = delta.get("action")
    start = delta.get("start") or {}
    end = delta.get("end") or {}
    dlines = delta.get("lines") or []

    start_row = int(start.get("row", 0))
    start_col = int(start.get("column", 0))
    end_row = int(end.get("row", start_row))
    end_col = int(end.get("column", start_col))

    if start_row < 0:
        start_row = 0
    if end_row < 0:
        end_row = 0

    if start_row >= len(lines):
        lines = lines + [""] * (start_row - len(lines) + 1)
    if end_row >= len(lines):
        lines = lines + [""] * (end_row - len(lines) + 1)

    if action == "insert":
        if not dlines:
            return lines

        before = lines[start_row][:start_col]
        after = lines[start_row][start_col:]

        if len(dlines) == 1:
            lines[start_row] = before + dlines[0] + after
            return lines

        new_lines = []
        new_lines.extend(lines[:start_row])
        new_lines.append(before + dlines[0])
        new_lines.extend(dlines[1:-1])
        new_lines.append(dlines[-1] + after)
        new_lines.extend(lines[start_row + 1 :])
        return new_lines

    if action == "remove":
        if start_row == end_row:
            lines[start_row] = lines[start_row][:start_col] + lines[start_row][end_col:]
            return lines

        first_part = lines[start_row][:start_col]
        last_part = lines[end_row][end_col:]

        new_lines = []
        new_lines.extend(lines[:start_row])
        new_lines.append(first_part + last_part)
        new_lines.extend(lines[end_row + 1 :])
        return new_lines

    return lines


def ensure_doc(project_id: int, file_id: int, *, content: str, rev: int) -> dict[str, Any]:
    key = (project_id, file_id)
    doc = documents.get(key)
    if doc is None:
        doc = {"rev": int(rev), "lines": split_lines(content), "snapshot_rev": -1}
        documents[key] = doc
        return doc

    doc["rev"] = int(rev)
    doc["lines"] = split_lines(content)
    if "snapshot_rev" not in doc:
        doc["snapshot_rev"] = -1
    return doc


def get_doc(project_id: int, file_id: int) -> dict[str, Any] | None:
    return documents.get((project_id, file_id))

