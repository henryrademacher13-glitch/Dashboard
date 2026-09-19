"""Write qualified leads to .xlsx.

Two data sheets and a summary. Derived cells are real formulas, not values
computed in Python, so the workbook stays correct after you edit it by hand —
fill in a missing phone number and the Contactable column updates itself.
"""
from __future__ import annotations

from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet

from .models import Lead

FONT = "Arial"

HEADER_FILL = PatternFill("solid", fgColor="1F3864")
HEADER_FONT = Font(name=FONT, bold=True, color="FFFFFF", size=10)
# Yellow marks the columns you are meant to type into.
INPUT_FILL = PatternFill("solid", fgColor="FFFF00")
BODY_FONT = Font(name=FONT, size=10)
LABEL_FONT = Font(name=FONT, bold=True, size=10)
NOTE_FONT = Font(name=FONT, italic=True, size=9, color="666666")

# (header, Lead attribute or None for a formula column, width)
COLUMNS: list[tuple[str, str | None, int]] = [
    ("Company",     "company",       30),
    ("Trade",       "trade",         22),
    ("City",        "city",          16),
    ("State",       "state",          7),
    ("Website",     "website",       30),
    ("Contact",     "contact_name",  20),
    ("Title",       "title",         20),
    ("Email",       "email",         28),
    ("Phone",       "phone",         16),
    ("Employees",   "employees",     11),
    ("Contactable", None,            12),  # formula
    ("Status",      None,            14),  # you fill in
    ("Notes",       None,            30),  # you fill in
    ("Source Notes","notes",         34),  # written by the adapter; overwritten on export
    ("Source",      "source",        12),
    ("Retrieved",   "retrieved_at",  20),
    ("Source ID",   "source_id",     14),
]

EMAIL_COL = get_column_letter([c[0] for c in COLUMNS].index("Email") + 1)
PHONE_COL = get_column_letter([c[0] for c in COLUMNS].index("Phone") + 1)
CONTACTABLE_COL = get_column_letter([c[0] for c in COLUMNS].index("Contactable") + 1)
STATUS_COL = get_column_letter([c[0] for c in COLUMNS].index("Status") + 1)
NOTES_COL = get_column_letter([c[0] for c in COLUMNS].index("Notes") + 1)

STATUSES = ["New", "Contacted", "Replied", "Meeting", "Won", "Dead"]


def _header(sheet: Worksheet, headers: list[tuple[str, str | None, int]]) -> None:
    for index, (title, _, width) in enumerate(headers, start=1):
        cell = sheet.cell(row=1, column=index, value=title)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center")
        sheet.column_dimensions[get_column_letter(index)].width = width
    sheet.freeze_panes = "A2"


def _write_leads(sheet: Worksheet, leads: list[Lead]) -> None:
    _header(sheet, COLUMNS)

    for offset, lead in enumerate(leads):
        row = offset + 2
        for index, (title, attr, _) in enumerate(COLUMNS, start=1):
            cell = sheet.cell(row=row, column=index)
            cell.font = BODY_FONT
            cell.alignment = Alignment(vertical="top", wrap_text=title == "Notes")

            if title == "Contactable":
                # A formula, not a computed value: paste in a phone number by
                # hand and this flips to Yes without rerunning anything.
                cell.value = (
                    f'=IF(OR({EMAIL_COL}{row}<>"",{PHONE_COL}{row}<>""),"Yes","No")'
                )
                cell.alignment = Alignment(horizontal="center")
            elif title == "Status":
                cell.value = "New"
                cell.fill = INPUT_FILL
            elif title == "Notes":
                cell.fill = INPUT_FILL
            elif attr:
                value = getattr(lead, attr)
                cell.value = value if value not in ("", None) else None

    if leads:
        sheet.auto_filter.ref = f"A1:{get_column_letter(len(COLUMNS))}{len(leads) + 1}"


def _write_rejected(sheet: Worksheet, rejected: list[Lead]) -> None:
    headers = [
        ("Company", "company", 30), ("Trade", "trade", 22), ("City", "city", 16),
        ("State", "state", 7), ("Email", "email", 26), ("Phone", "phone", 16),
        ("Rejected for", None, 46),
    ]
    _header(sheet, headers)
    for offset, lead in enumerate(rejected):
        row = offset + 2
        for index, (title, attr, _) in enumerate(headers, start=1):
            cell = sheet.cell(row=row, column=index)
            cell.font = BODY_FONT
            if title == "Rejected for":
                cell.value = "; ".join(lead.rejected_for)
            elif attr:
                value = getattr(lead, attr)
                cell.value = value if value not in ("", None) else None


def _write_summary(sheet: Worksheet, n_leads: int, n_rejected: int, criteria_note: str) -> None:
    sheet.column_dimensions["A"].width = 26
    sheet.column_dimensions["B"].width = 12
    sheet.column_dimensions["C"].width = 58

    title = sheet.cell(row=1, column=1, value="Lead list summary")
    title.font = Font(name=FONT, bold=True, size=14)

    last = n_leads + 1  # last populated row on the Leads sheet
    # Guard the ranges: with zero leads, "Leads!A2:A1" is a backwards range.
    rng = lambda col: f"Leads!{col}2:{col}{last}" if n_leads else f"Leads!{col}2:{col}2"

    rows: list[tuple[str, object, str]] = [
        ("Qualified leads", f"=COUNTA({rng('A')})", "Rows on the Leads tab."),
        ("With email", f'=COUNTIF({rng(EMAIL_COL)},"?*")', "Non-blank Email cells."),
        ("With phone", f'=COUNTIF({rng(PHONE_COL)},"?*")', "Non-blank Phone cells."),
        ("Contactable", f'=COUNTIF({rng(CONTACTABLE_COL)},"Yes")',
         "Either an email or a phone number."),
        ("Rejected", n_rejected, "See the Rejected tab for the reason on each."),
    ]
    for offset, (label, value, note) in enumerate(rows):
        row = offset + 3
        sheet.cell(row=row, column=1, value=label).font = LABEL_FONT
        cell = sheet.cell(row=row, column=2, value=value)
        cell.font = BODY_FONT
        sheet.cell(row=row, column=3, value=note).font = NOTE_FONT

    start = len(rows) + 5
    sheet.cell(row=start, column=1, value="Pipeline").font = Font(name=FONT, bold=True, size=12)
    for offset, status in enumerate(STATUSES):
        row = start + 1 + offset
        sheet.cell(row=row, column=1, value=status).font = BODY_FONT
        cell = sheet.cell(row=row, column=2, value=f'=COUNTIF({rng(STATUS_COL)},"{status}")')
        cell.font = BODY_FONT

    legend_row = start + len(STATUSES) + 3
    sheet.cell(row=legend_row, column=1, value="How to use this").font = Font(
        name=FONT, bold=True, size=12
    )
    legend = [
        f"Yellow cells are yours to edit — column {STATUS_COL} (Status) and "
        f"column {NOTES_COL} (Notes) on the Leads tab.",
        f"Status accepts: {', '.join(STATUSES)}. The Pipeline counts above follow what you type.",
        f"Contactable (column {CONTACTABLE_COL}) is a formula. Fill in a missing "
        "phone or email and it updates itself.",
        "Everything else came from the source and is overwritten on the next export.",
        criteria_note,
    ]
    for offset, line in enumerate(legend):
        cell = sheet.cell(row=legend_row + 1 + offset, column=1, value=line)
        cell.font = NOTE_FONT
        sheet.merge_cells(
            start_row=legend_row + 1 + offset, start_column=1,
            end_row=legend_row + 1 + offset, end_column=3,
        )


def write_workbook(
    path: Path,
    qualified: list[Lead],
    rejected: list[Lead],
    criteria_note: str = "",
) -> Path:
    book = Workbook()
    leads_sheet = book.active
    leads_sheet.title = "Leads"
    _write_leads(leads_sheet, qualified)
    _write_rejected(book.create_sheet("Rejected"), rejected)
    _write_summary(book.create_sheet("Summary"), len(qualified), len(rejected), criteria_note)

    path.parent.mkdir(parents=True, exist_ok=True)
    book.save(path)
    return path
