"""Tests for lead normalization, qualifying, dedup, and the workbook.

The Apollo adapter is exercised against synthetic payloads only — the live API
was never reachable when this was written. These tests prove the mapping is
self-consistent, not that it matches production Apollo.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from leads.filters import Criteria, CriteriaError, qualify, reasons_to_reject  # noqa: E402
from leads.models import Lead, dedupe, normalize_domain  # noqa: E402
from leads.sources import apollo  # noqa: E402

PASSED, FAILED = [], []


def check(name, cond):
    (PASSED if cond else FAILED).append(name)
    print(f"{'PASS' if cond else 'FAIL'}: {name}")


def raises(fn, exc=CriteriaError):
    try:
        fn()
    except exc:
        return True
    except Exception:
        return False
    return False


# --- contact validation ---
check("plain address is contactable", Lead(company="A", email="a@b.com").has_email)
check("address with no dot rejected", not Lead(company="A", email="a@b").has_email)
check("bare word is not an email", not Lead(company="A", email="none").has_email)
check("empty email is not contactable", not Lead(company="A").is_contactable)
check("10-digit phone accepted", Lead(company="A", phone="(610) 555-0134").has_phone)
check("E.164 phone accepted", Lead(company="A", phone="+16105550134").has_phone)
check("4-digit extension rejected", not Lead(company="A", phone="x123").has_phone)
check("phone alone is contactable", Lead(company="A", phone="6105550134").is_contactable)

# --- domain + dedup ---
check("scheme and www stripped", normalize_domain("https://WWW.Ex.com/a?b=1#c") == "ex.com")
check("dotless value is not a domain", normalize_domain("none") == "")
check("empty website is empty domain", normalize_domain("") == "")

a = Lead(company="Smith & Sons", website="https://www.smith.com/contact")
b = Lead(company="Smith and Sons, Inc.", website="http://smith.com")
c = Lead(company="Other Co", website="https://other.com")
check("same domain dedupes across name spellings", a.dedup_key == b.dedup_key)
check("different domains stay separate", a.dedup_key != c.dedup_key)
check("dedupe keeps first occurrence", [x.company for x in dedupe([a, b, c])]
      == ["Smith & Sons", "Other Co"])
n1 = Lead(company="No Site LLC", city="Exton")
n2 = Lead(company="no site llc", city="Exton")
check("siteless leads fall back to name+city", n1.dedup_key == n2.dedup_key)
check("same name different city stays separate",
      n1.dedup_key != Lead(company="No Site LLC", city="Paoli").dedup_key)

# --- criteria parsing ---
CRIT = {"geography": {"states": ["PA"], "cities": []},
        "trades": ["roofing", "hvac"], "require_contactable": True}
crit = Criteria.parse(CRIT)
check("states lowercased on load", crit.states == ["pa"])
check("empty city list means no city filter", crit.cities == [])
check("non-object criteria rejected", raises(lambda: Criteria.parse([])))
check("non-string trade rejected",
      raises(lambda: Criteria.parse({**CRIT, "trades": ["ok", 7]})))
check("non-object geography rejected",
      raises(lambda: Criteria.parse({**CRIT, "geography": "PA"})))

# --- qualifying ---
good = Lead(company="Chester Roofing", trade="roofing", state="PA", email="a@b.com")
check("matching lead has no rejection reasons", reasons_to_reject(good, crit) == [])

check("wrong state rejected",
      "state NJ not in target list"
      in reasons_to_reject(Lead(company="X", trade="roofing", state="NJ",
                                email="a@b.com"), crit))
check("wrong trade rejected",
      any("trade" in r for r in reasons_to_reject(
          Lead(company="X Financial", trade="banking", state="PA", email="a@b.com"), crit)))
check("uncontactable rejected",
      "no email or phone"
      in reasons_to_reject(Lead(company="X", trade="roofing", state="PA"), crit))
check("all failures reported at once",
      len(reasons_to_reject(Lead(company="X", trade="banking", state="NJ"), crit)) == 3)
check("trade inferred from company name when undeclared",
      reasons_to_reject(Lead(company="Chester County Roofing", state="PA",
                             email="a@b.com"), crit) == [])
# "PA" as a substring must not match "Campania" or "Spain".
check("state matched exactly, not by substring",
      reasons_to_reject(Lead(company="Roofing Co", trade="roofing",
                             state="Campania", email="a@b.com"), crit) != [])

empty = Criteria.parse({"geography": {}, "trades": [], "require_contactable": False})
check("empty criteria reject nothing",
      reasons_to_reject(Lead(company="Anything"), empty) == [])

q, r = qualify([good, Lead(company="Nope", state="NJ")], crit)
check("qualify splits the list", [x.company for x in q] == ["Chester Roofing"])
check("rejected leads carry their reasons", bool(r[0].rejected_for))

# --- apollo adapter ---
PAYLOAD = {"people": [{
    "id": "p1", "first_name": "Bob", "last_name": "Smith", "title": "Owner",
    "email": "bob@smithroofing.com", "city": "West Chester", "state": "PA",
    "phone_numbers": [{"sanitized_number": "+16105550134", "type": "work"}],
    "organization": {"name": "Smith Roofing", "website_url": "https://smithroofing.com",
                     "keywords": ["roofing", "siding"], "estimated_num_employees": 12},
    "surprise_field": "x",
}]}
lead = apollo.from_response(PAYLOAD)[0]
check("company read from nested organization", lead.company == "Smith Roofing")
check("name assembled from parts", lead.contact_name == "Bob Smith")
check("keywords preferred over coarse industry", lead.trade == "roofing, siding")
check("phone pulled out of phone_numbers", lead.phone == "+16105550134")
check("employee count coerced to int", lead.employees == 12)
check("provenance stamped", lead.source == "apollo.io" and lead.source_id == "p1")
check("retrieval timestamp set", bool(lead.retrieved_at))
check("unmapped fields surfaced", apollo.unmapped_keys(PAYLOAD) == {"surprise_field"})

gated = apollo.from_record({"first_name": "A", "email": "email_not_unlocked@domain.com"})
check("locked-email placeholder treated as absent", gated.email == "")
check("locked-email lead is not contactable", not gated.is_contactable)

check("account envelope accepted",
      apollo.from_record({"account": {"name": "Acme"}}).company == "Acme")
check("bare list payload accepted",
      len(apollo.from_response([{"organization": {"name": "A"}}])) == 1)
check("organizations envelope accepted",
      len(apollo.from_response({"organizations": [{"name": "A"}]})) == 1)
check("empty payload yields no leads", apollo.from_response({}) == [])
check("garbage payload does not raise", apollo.from_response("nonsense") == [])
check("non-numeric employee count becomes None",
      apollo.from_record({"organization": {"estimated_num_employees": "lots"}}).employees is None)

# --- workbook ---
import tempfile  # noqa: E402

from openpyxl import load_workbook  # noqa: E402

from leads.spreadsheet import STATUSES, write_workbook  # noqa: E402

with tempfile.TemporaryDirectory() as tmp:
    out = Path(tmp) / "nested" / "leads.xlsx"
    write_workbook(out, [good, lead], [Lead(company="Nope", rejected_for=["wrong state"])],
                   criteria_note="Filters applied — test")
    check("workbook created in a new directory", out.exists())

    wb = load_workbook(out)
    check("three sheets written", wb.sheetnames == ["Leads", "Rejected", "Summary"])

    ws = wb["Leads"]
    check("header row written", ws["A1"].value == "Company")
    check("header row frozen", ws.freeze_panes == "A2")
    check("autofilter spans the data", ws.auto_filter.ref.endswith("3"))
    check("company written to the first data row", ws["A2"].value == "Chester Roofing")
    check("Contactable is a formula, not a value",
          str(ws["K2"].value).startswith("=IF(OR("))
    check("Contactable formula points at its own row", "H2" in ws["K2"].value)
    check("Status seeded to New", ws["L2"].value == "New")
    check("editable columns marked yellow", ws["L2"].fill.fgColor.rgb.endswith("FFFF00"))
    check("source columns not marked editable",
          not str(ws["A2"].fill.fgColor.rgb).endswith("FFFF00"))
    check("body font is Arial", ws["A2"].font.name == "Arial")

    rej = wb["Rejected"]
    check("rejection reason written", rej["G2"].value == "wrong state")

    summ = wb["Summary"]
    check("summary counts with a formula", str(summ["B3"].value).startswith("=COUNTA("))
    check("summary formula targets the Leads sheet", "Leads!" in summ["B3"].value)
    check("pipeline lists every status",
          all(any(summ.cell(row=r, column=1).value == s
                  for r in range(1, summ.max_row + 1)) for s in STATUSES))
    text = " ".join(str(c.value) for row in summ.iter_rows() for c in row if c.value)
    check("legend explains the yellow cells", "yours to edit" in text)
    check("legend records the filters used", "Filters applied" in text)

    # A zero-lead export must not produce a backwards range like A2:A1.
    empty_out = Path(tmp) / "empty.xlsx"
    write_workbook(empty_out, [], [], criteria_note="none")
    ewb = load_workbook(empty_out)
    check("empty export still writes", empty_out.exists())
    check("empty export has no backwards range", "A2:A1" not in str(ewb["Summary"]["B3"].value))

print(f"\n{len(PASSED)} passed, {len(FAILED)} failed")
if FAILED:
    print("Failures:", ", ".join(FAILED))
    sys.exit(1)
