#!/usr/bin/env python3
"""
smoke_test.py — Smoke test for simplydigitals-aiconnoisseur-api

Saves results as JSON and HTML and opens the HTML report in the browser.

Usage:
    python scripts/smoke_test.py
    python scripts/smoke_test.py --base-url https://your-lambda-url.aws/
    python scripts/smoke_test.py --wait
    python scripts/smoke_test.py --no-open   # skip auto-open browser
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

# ── State ─────────────────────────────────────────────────────────────────────
results: list[dict[str, Any]] = []
passed = 0
failed = 0
start_time = time.perf_counter()


# ── HTTP helper ───────────────────────────────────────────────────────────────
def request(
    method: str,
    url: str,
    body: dict | None = None,
    token: str | None = None,
) -> tuple[int, dict, float]:
    t0 = time.perf_counter()
    data = json.dumps(body).encode() if body else None
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read()
            duration = round((time.perf_counter() - t0) * 1000, 1)
            try:
                return resp.status, json.loads(raw), duration
            except json.JSONDecodeError:
                # Non-JSON response (e.g. Prometheus /metrics plain text)
                return resp.status, {"_raw_text": raw.decode(errors="replace")[:200]}, duration
    except urllib.error.HTTPError as e:
        body_bytes = e.read()
        duration = round((time.perf_counter() - t0) * 1000, 1)
        try:
            resp_body = json.loads(body_bytes)
        except Exception:
            resp_body = {"raw": body_bytes.decode(errors="replace")[:200]}
        return e.code, resp_body, duration
    except Exception as e:
        return 0, {"error": str(e)}, round((time.perf_counter() - t0) * 1000, 1)


def check(
    name: str,
    method: str,
    url: str,
    body: dict | None = None,
    token: str | None = None,
    expected_status: int = 200,
    assert_keys: list[str] | None = None,
    assert_not_keys: list[str] | None = None,
    group: str = "",
) -> dict:
    global passed, failed

    status, resp_body, duration_ms = request(method, url, body, token)
    ok = status == expected_status
    failure_reason = ""

    if ok and assert_keys:
        for key in assert_keys:
            if key not in resp_body:
                ok = False
                failure_reason = f"Missing key in response: '{key}'"
                break

    if ok and assert_not_keys:
        for key in assert_not_keys:
            if key in resp_body:
                ok = False
                failure_reason = f"Unexpected key in response: '{key}'"
                break

    if not ok and not failure_reason:
        failure_reason = f"Expected status {expected_status}, got {status}"

    icon = f"{GREEN}✔{RESET}" if ok else f"{RED}✘{RESET}"
    status_color = GREEN if ok else RED
    ms_color = GREEN if duration_ms < 500 else YELLOW if duration_ms < 2000 else RED
    print(f"  {icon}  {name:<48} {status_color}{status}{RESET}  {ms_color}{duration_ms}ms{RESET}")

    if not ok:
        snippet = json.dumps(resp_body, indent=2)[:300]
        print(f"       {YELLOW}↳ {failure_reason}{RESET}")
        print(f"       {YELLOW}  {snippet}{RESET}")
        failed += 1
    else:
        passed += 1

    result = {
        "name": name,
        "group": group,
        "method": method,
        "url": url,
        "expected_status": expected_status,
        "actual_status": status,
        "duration_ms": duration_ms,
        "passed": ok,
        "failure_reason": failure_reason,
        "response_snippet": json.dumps(resp_body)[:500],
    }
    results.append(result)
    return result


# ── Output: JSON ──────────────────────────────────────────────────────────────
def save_json(output_dir: Path, base_url: str) -> Path:
    payload = {
        "meta": {
            "timestamp": datetime.now(UTC).isoformat(),
            "base_url": base_url,
            "total": passed + failed,
            "passed": passed,
            "failed": failed,
            "duration_ms": round((time.perf_counter() - start_time) * 1000, 1),
        },
        "results": results,
    }
    path = output_dir / "smoke_test_results.json"
    path.write_text(json.dumps(payload, indent=2))
    return path


# ── Output: HTML ──────────────────────────────────────────────────────────────
def save_html(output_dir: Path, base_url: str) -> Path:
    total = passed + failed
    duration = round((time.perf_counter() - start_time) * 1000, 1)
    ts = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
    pass_pct = round((passed / total * 100) if total else 0, 1)

    groups: dict[str, list[dict]] = {}
    for r in results:
        groups.setdefault(r["group"], []).append(r)

    rows_html = ""
    for group, checks in groups.items():
        rows_html += f"""
        <tr class="group-header">
          <td colspan="6">{group}</td>
        </tr>"""
        for r in checks:
            status_cls = "pass" if r["passed"] else "fail"
            icon = "✔" if r["passed"] else "✘"
            snippet = r["response_snippet"].replace("<", "&lt;").replace(">", "&gt;")
            fail_note = (
                f'<div class="fail-reason">{r["failure_reason"]}</div>' if not r["passed"] else ""
            )
            ms_cls = (
                "ms-fast"
                if r["duration_ms"] < 500
                else "ms-slow"
                if r["duration_ms"] > 2000
                else "ms-ok"
            )
            rows_html += f"""
        <tr class="{status_cls}-row">
          <td><span class="badge {status_cls}">{icon}</span></td>
          <td class="test-name">{r['name']}{fail_note}</td>
          <td><span class="method method-{r['method'].lower()}">{r['method']}</span></td>
          <td class="url-cell">{r['url'].replace(base_url, '')}</td>
          <td><span class="status-code status-{str(r['actual_status'])[0]}xx">{r['actual_status']}</span></td>
          <td><span class="{ms_cls}">{r['duration_ms']}ms</span></td>
        </tr>
        <tr class="detail-row">
          <td></td>
          <td colspan="5" class="response-snippet">{snippet}</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Smoke Test Report — simplydigitals-aiconnoisseur-api</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap');

    :root {{
      --bg:        #0A0A0F;
      --surface:   #111118;
      --surface2:  #1A1A24;
      --border:    rgba(255,255,255,0.07);
      --jade:      #00C98A;
      --jade-dim:  rgba(0,201,138,0.12);
      --jade-border: rgba(0,201,138,0.25);
      --rose:      #F43F5E;
      --rose-dim:  rgba(244,63,94,0.10);
      --rose-border: rgba(244,63,94,0.25);
      --amber:     #F59E0B;
      --violet:    #8B5CF6;
      --text:      #E8E8F0;
      --muted:     #6B6B8A;
      --mono:      'JetBrains Mono', monospace;
    }}

    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    html {{ scroll-behavior: smooth; }}
    body {{
      background: var(--bg);
      color: var(--text);
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      padding: 0 0 60px;
      background-image:
        radial-gradient(ellipse 70% 40% at 15% 0%, rgba(0,201,138,0.06) 0%, transparent 60%),
        radial-gradient(ellipse 50% 30% at 85% 100%, rgba(139,92,246,0.05) 0%, transparent 60%);
    }}

    /* ── Header ── */
    header {{
      padding: 40px 48px 32px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
    }}
    .logo {{ font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; }}
    .logo span {{ color: var(--jade); }}
    .subtitle {{ color: var(--muted); font-size: 13px; margin-top: 4px; }}
    .header-meta {{ text-align: right; }}
    .timestamp {{ font-family: var(--mono); font-size: 12px; color: var(--muted); }}
    .base-url {{ font-family: var(--mono); font-size: 12px; color: var(--jade); margin-top: 4px; }}

    /* ── Summary cards ── */
    .summary {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      padding: 32px 48px;
    }}
    .card {{
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px 24px;
    }}
    .card-label {{
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: .07em;
      color: var(--muted);
      margin-bottom: 8px;
    }}
    .card-value {{
      font-family: 'Syne', sans-serif;
      font-size: 32px;
      font-weight: 800;
      line-height: 1;
    }}
    .card-value.jade {{ color: var(--jade); }}
    .card-value.rose {{ color: var(--rose); }}
    .card-value.amber {{ color: var(--amber); }}
    .card-value.violet {{ color: var(--violet); }}

    /* ── Progress bar ── */
    .progress-wrap {{ padding: 0 48px 32px; }}
    .progress-label {{ font-size: 12px; color: var(--muted); margin-bottom: 8px; }}
    .progress-bar {{
      height: 6px;
      background: var(--surface2);
      border-radius: 3px;
      overflow: hidden;
    }}
    .progress-fill {{
      height: 100%;
      border-radius: 3px;
      background: {"var(--jade)" if failed == 0 else "linear-gradient(90deg, var(--jade), var(--rose))"};
      width: {pass_pct}%;
      transition: width 1s ease;
    }}

    /* ── Verdict banner ── */
    .verdict {{
      margin: 0 48px 32px;
      padding: 16px 24px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      gap: 14px;
      font-family: 'Syne', sans-serif;
      font-weight: 700;
      font-size: 16px;
      {"background: var(--jade-dim); border: 1px solid var(--jade-border); color: var(--jade);" if failed == 0 else "background: var(--rose-dim); border: 1px solid var(--rose-border); color: var(--rose);"}
    }}
    .verdict-icon {{ font-size: 24px; }}

    /* ── Results table ── */
    .table-wrap {{
      margin: 0 48px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
    }}
    table {{ width: 100%; border-collapse: collapse; }}
    th {{
      text-align: left;
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: .07em;
      color: var(--muted);
      background: var(--surface2);
      border-bottom: 1px solid var(--border);
    }}
    td {{ padding: 10px 16px; border-bottom: 1px solid var(--border); vertical-align: top; }}
    tr:last-child td {{ border-bottom: none; }}

    .group-header td {{
      background: var(--surface2);
      font-family: 'Syne', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: .08em;
      padding: 8px 16px;
      border-top: 1px solid var(--border);
    }}

    .pass-row {{ background: transparent; }}
    .fail-row {{ background: rgba(244,63,94,0.04); }}

    .badge {{
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border-radius: 50%;
      font-size: 12px; font-weight: 700;
    }}
    .badge.pass {{ background: var(--jade-dim); color: var(--jade); border: 1px solid var(--jade-border); }}
    .badge.fail {{ background: var(--rose-dim); color: var(--rose); border: 1px solid var(--rose-border); }}

    .test-name {{ font-size: 13px; color: var(--text); }}
    .fail-reason {{ font-size: 11px; color: var(--rose); margin-top: 3px; }}

    .method {{
      display: inline-block;
      padding: 2px 8px; border-radius: 5px;
      font-family: var(--mono); font-size: 11px; font-weight: 500;
    }}
    .method-get  {{ background: rgba(0,201,138,0.10); color: var(--jade);   }}
    .method-post {{ background: rgba(139,92,246,0.12); color: var(--violet); }}
    .method-delete {{ background: rgba(244,63,94,0.10); color: var(--rose); }}

    .url-cell {{ font-family: var(--mono); font-size: 12px; color: var(--muted); }}

    .status-code {{
      display: inline-block;
      padding: 2px 8px; border-radius: 5px;
      font-family: var(--mono); font-size: 12px; font-weight: 500;
    }}
    .status-2xx {{ background: rgba(0,201,138,0.10); color: var(--jade); }}
    .status-4xx {{ background: rgba(245,158,11,0.10); color: var(--amber); }}
    .status-5xx {{ background: rgba(244,63,94,0.10); color: var(--rose); }}

    .ms-fast {{ color: var(--jade); font-family: var(--mono); font-size: 12px; }}
    .ms-ok   {{ color: var(--amber); font-family: var(--mono); font-size: 12px; }}
    .ms-slow {{ color: var(--rose); font-family: var(--mono); font-size: 12px; }}

    .detail-row td {{
      padding: 0 16px 10px;
      border-bottom: 1px solid var(--border);
    }}
    .response-snippet {{
      font-family: var(--mono);
      font-size: 11px;
      color: var(--muted);
      background: var(--surface2);
      padding: 8px 12px;
      border-radius: 8px;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 80px;
      overflow: hidden;
    }}

    /* ── Footer ── */
    footer {{
      margin-top: 40px;
      padding: 0 48px;
      color: var(--muted);
      font-size: 12px;
    }}
  </style>
</head>
<body>

<header>
  <div>
    <div class="logo">Simply<span>Digitals</span> · AIConnoisseur</div>
    <div class="subtitle">API Smoke Test Report</div>
  </div>
  <div class="header-meta">
    <div class="timestamp">{ts}</div>
    <div class="base-url">{base_url}</div>
  </div>
</header>

<div class="summary">
  <div class="card">
    <div class="card-label">Total Checks</div>
    <div class="card-value violet">{total}</div>
  </div>
  <div class="card">
    <div class="card-label">Passed</div>
    <div class="card-value jade">{passed}</div>
  </div>
  <div class="card">
    <div class="card-label">Failed</div>
    <div class="card-value {"rose" if failed > 0 else "jade"}">{failed}</div>
  </div>
  <div class="card">
    <div class="card-label">Pass Rate</div>
    <div class="card-value {"jade" if failed == 0 else "amber"}">{pass_pct}%</div>
  </div>
  <div class="card">
    <div class="card-label">Duration</div>
    <div class="card-value amber">{duration}ms</div>
  </div>
</div>

<div class="progress-wrap">
  <div class="progress-label">{passed} of {total} checks passed</div>
  <div class="progress-bar"><div class="progress-fill"></div></div>
</div>

<div class="verdict">
  <span class="verdict-icon">{"✔" if failed == 0 else "✘"}</span>
  {"All checks passed — API is healthy" if failed == 0 else f"{failed} check(s) failed — review the details below"}
</div>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th style="width:40px"></th>
        <th>Test</th>
        <th style="width:70px">Method</th>
        <th>Endpoint</th>
        <th style="width:70px">Status</th>
        <th style="width:80px">Time</th>
      </tr>
    </thead>
    <tbody>
      {rows_html}
    </tbody>
  </table>
</div>

<footer>
  <p>Generated by smoke_test.py · simplydigitals-aiconnoisseur-api · {ts}</p>
</footer>

</body>
</html>"""

    path = output_dir / "smoke_test_report.html"
    path.write_text(html, encoding="utf-8")
    return path


# ── Open browser ──────────────────────────────────────────────────────────────
def open_browser(path: Path) -> None:
    system = platform.system()
    try:
        if system == "Darwin":
            subprocess.run(["open", str(path)], check=True)
        elif system == "Windows":
            os.startfile(str(path))  # type: ignore[attr-defined]
        else:
            subprocess.run(["xdg-open", str(path)], check=True)
        print(f"  {GREEN}▶ Opened report in browser{RESET}")
    except Exception as e:
        print(f"  {YELLOW}⚠ Could not open browser automatically: {e}{RESET}")
        print(f"  Open manually: {CYAN}file://{path.resolve()}{RESET}")


# ── Server readiness check ────────────────────────────────────────────────────
def wait_for_server(base_url: str, retries: int = 10) -> bool:
    print(f"\n{CYAN}▶ Waiting for server at {base_url}...{RESET}")
    for i in range(retries):
        try:
            with urllib.request.urlopen(f"{base_url}/health", timeout=3):
                return True
        except Exception:
            if i < retries - 1:
                print(f"  Attempt {i + 1}/{retries} — retrying in 2s...")
                time.sleep(2)
    return False


# ── Main test suite ───────────────────────────────────────────────────────────
def run(base_url: str, output_dir: Path, open_report: bool) -> None:
    unique = uuid.uuid4().hex[:8]
    email = f"smoke_{unique}@test.com"
    password = "SmokeTest123!"

    print(f"\n{BOLD}{'═' * 62}{RESET}")
    print(f"{BOLD}  simplydigitals-aiconnoisseur-api — Smoke Test{RESET}")
    print(f"  Target : {CYAN}{base_url}{RESET}")
    print(f"  Reports: {CYAN}{output_dir.resolve()}{RESET}")
    print(f"{BOLD}{'═' * 62}{RESET}")

    def c(*args: Any, **kwargs: Any) -> dict:
        return check(*args, **kwargs)

    # ── Health ────────────────────────────────────────────────────────────────
    print(f"\n{BOLD}Health{RESET}")
    c(
        "GET /health → 200",
        "GET",
        f"{base_url}/health",
        expected_status=200,
        assert_keys=["status"],
        group="Health",
    )
    # /metrics returns Prometheus plain text — check separately without JSON parsing
    print("  ", end="")
    try:
        with urllib.request.urlopen(f"{base_url}/metrics", timeout=5) as resp:
            raw = resp.read().decode(errors="replace")
            ok = resp.status == 200 and "http_" in raw
            icon = f"{GREEN}✔{RESET}" if ok else f"{RED}✘{RESET}"
            status_color = GREEN if ok else RED
            print(
                f"{icon}  {'GET /metrics → 200 (Prometheus text)':<48} {status_color}{resp.status}{RESET}  {GREEN}ok{RESET}"
            )
            results.append(
                {
                    "name": "GET /metrics → 200 (Prometheus text)",
                    "group": "Health",
                    "method": "GET",
                    "url": f"{base_url}/metrics",
                    "expected_status": 200,
                    "actual_status": resp.status,
                    "duration_ms": 0,
                    "passed": ok,
                    "failure_reason": "",
                    "response_snippet": raw[:120],
                }
            )
            if ok:
                globals()["passed"] += 1
            else:
                globals()["failed"] += 1
    except Exception as ex:
        print(f"{RED}✘{RESET}  {'GET /metrics → 200 (Prometheus text)':<48} {RED}error{RESET}")
        results.append(
            {
                "name": "GET /metrics → 200 (Prometheus text)",
                "group": "Health",
                "method": "GET",
                "url": f"{base_url}/metrics",
                "expected_status": 200,
                "actual_status": 0,
                "duration_ms": 0,
                "passed": False,
                "failure_reason": str(ex),
                "response_snippet": "",
            }
        )
        globals()["failed"] += 1

    # ── Authentication ────────────────────────────────────────────────────────
    print(f"\n{BOLD}Authentication{RESET}")
    c(
        "POST /auth/register → 201",
        "POST",
        f"{base_url}/api/v1/auth/register",
        body={"email": email, "password": password, "full_name": "Smoke Test"},
        expected_status=201,
        assert_keys=["id", "email"],
        assert_not_keys=["hashed_password"],
        group="Authentication",
    )

    c(
        "POST /auth/register duplicate → 409",
        "POST",
        f"{base_url}/api/v1/auth/register",
        body={"email": email, "password": password, "full_name": "Smoke Test"},
        expected_status=409,
        group="Authentication",
    )

    r = c(
        "POST /auth/login → 200",
        "POST",
        f"{base_url}/api/v1/auth/login",
        body={"email": email, "password": password},
        expected_status=200,
        assert_keys=["access_token", "refresh_token", "token_type"],
        group="Authentication",
    )
    token = r.get("response", {}).get("access_token", "")
    refresh = r.get("response", {}).get("refresh_token", "")
    if not token:
        print(f"  {YELLOW}⚠  Could not extract token — auth-dependent tests will be skipped{RESET}")

    c(
        "POST /auth/login wrong password → 401",
        "POST",
        f"{base_url}/api/v1/auth/login",
        body={"email": email, "password": "WrongPass!"},
        expected_status=401,
        group="Authentication",
    )

    c(
        "POST /auth/refresh → 200",
        "POST",
        f"{base_url}/api/v1/auth/refresh",
        body={"refresh_token": refresh},
        expected_status=200,
        assert_keys=["access_token"],
        group="Authentication",
    )

    # ── Auth guards ───────────────────────────────────────────────────────────
    print(f"\n{BOLD}Auth guards{RESET}")
    c(
        "GET /datasets/ no token → 403",
        "GET",
        f"{base_url}/api/v1/datasets/",
        expected_status=403,
        group="Auth guards",
    )
    c(
        "GET /models/ no token → 403",
        "GET",
        f"{base_url}/api/v1/models/",
        expected_status=403,
        group="Auth guards",
    )
    c(
        "GET /models/ bad token → 401",
        "GET",
        f"{base_url}/api/v1/models/",
        token="bad.token.value",
        expected_status=401,
        group="Auth guards",
    )

    # ── Datasets ──────────────────────────────────────────────────────────────
    print(f"\n{BOLD}Datasets{RESET}")
    c(
        "GET /datasets/ authenticated → 200",
        "GET",
        f"{base_url}/api/v1/datasets/",
        token=token,
        expected_status=200,
        group="Datasets",
    )
    c(
        "GET /datasets/bad-id → 404",
        "GET",
        f"{base_url}/api/v1/datasets/nonexistent",
        token=token,
        expected_status=404,
        group="Datasets",
    )

    # ── Models ────────────────────────────────────────────────────────────────
    print(f"\n{BOLD}Models{RESET}")
    c(
        "GET /models/ authenticated → 200",
        "GET",
        f"{base_url}/api/v1/models/",
        token=token,
        expected_status=200,
        group="Models",
    )
    c(
        "GET /models/bad-id → 404",
        "GET",
        f"{base_url}/api/v1/models/nonexistent",
        token=token,
        expected_status=404,
        group="Models",
    )
    c(
        "POST /models/train bad dataset → 404",
        "POST",
        f"{base_url}/api/v1/models/train",
        token=token,
        body={
            "name": "smoke",
            "dataset_id": "nonexistent",
            "algorithm": "classification",
            "target_column": "label",
            "feature_columns": ["a", "b"],
        },
        expected_status=404,
        group="Models",
    )

    # ── Analytics ─────────────────────────────────────────────────────────────
    print(f"\n{BOLD}Analytics{RESET}")
    c(
        "POST /analytics/describe bad dataset → 404",
        "POST",
        f"{base_url}/api/v1/analytics/describe",
        token=token,
        body={"dataset_id": "nonexistent"},
        expected_status=404,
        group="Analytics",
    )
    c(
        "POST /analytics/correlation bad dataset → 404",
        "POST",
        f"{base_url}/api/v1/analytics/correlation",
        token=token,
        body={"dataset_id": "nonexistent"},
        expected_status=404,
        group="Analytics",
    )

    # ── Security headers ──────────────────────────────────────────────────────
    print(f"\n{BOLD}Security headers{RESET}")
    try:
        with urllib.request.urlopen(f"{base_url}/health", timeout=5) as resp:
            headers = {k.lower(): v for k, v in resp.headers.items()}
        for header, expected_value in [
            ("x-content-type-options", "nosniff"),
            ("x-frame-options", "DENY"),
            ("x-xss-protection", "1; mode=block"),
            ("referrer-policy", "strict-origin-when-cross-origin"),
        ]:
            actual = headers.get(header, "MISSING")
            ok = actual == expected_value
            icon = f"{GREEN}✔{RESET}" if ok else f"{RED}✘{RESET}"
            print(f"  {icon}  {header}: {GREEN if ok else RED}{actual}{RESET}")
            results.append(
                {
                    "name": f"Header: {header}",
                    "group": "Security headers",
                    "method": "GET",
                    "url": f"{base_url}/health",
                    "expected_status": 200,
                    "actual_status": 200,
                    "duration_ms": 0,
                    "passed": ok,
                    "failure_reason": f"Expected '{expected_value}', got '{actual}'"
                    if not ok
                    else "",
                    "response_snippet": f"{header}: {actual}",
                }
            )
            if ok:
                globals()["passed"] += 1
            else:
                globals()["failed"] += 1
    except Exception as e:
        print(f"  {RED}✘  Could not check security headers: {e}{RESET}")
        globals()["failed"] += 1

    # ── Save outputs ──────────────────────────────────────────────────────────
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = save_json(output_dir, base_url)
    html_path = save_html(output_dir, base_url)

    total = passed + failed
    print(f"\n{BOLD}{'═' * 62}{RESET}")
    if failed == 0:
        print(f"{GREEN}{BOLD}  ✔  All {total} checks passed{RESET}")
    else:
        print(f"{RED}{BOLD}  ✘  {failed}/{total} checks failed{RESET}")
    print(f"{BOLD}{'═' * 62}{RESET}")
    print(f"\n  {CYAN}JSON{RESET}  {json_path.resolve()}")
    print(f"  {CYAN}HTML{RESET}  {html_path.resolve()}\n")

    if open_report:
        open_browser(html_path)

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Smoke test for aiconnoisseur-api")
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="API base URL (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--output-dir",
        default="smoke_test_output",
        help="Directory to save JSON and HTML reports (default: smoke_test_output)",
    )
    parser.add_argument(
        "--wait", action="store_true", help="Wait for the server to be ready before testing"
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Do not open the HTML report in the browser automatically",
    )
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    output_dir = Path(args.output_dir)

    if args.wait:
        if not wait_for_server(base):
            print(f"{RED}Server did not become ready.{RESET}")
            sys.exit(1)

    run(base, output_dir, open_report=not args.no_open)
