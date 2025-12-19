"""Smoke test for quote creation + token-protected detail/PDF.

Usage (in one terminal):
  1) Start backend: python manage.py runserver
  2) In another terminal (from backend/ with venv active): python test_quote_flow.py

Optional env vars:
  QUOTE_API_BASE_URL   Default: http://127.0.0.1:8000/api
"""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, List, Optional, Tuple

import requests


def _api_base_url() -> str:
    return os.getenv("QUOTE_API_BASE_URL", "http://127.0.0.1:8000/api").rstrip("/")


def _pick_first_product_id(session: requests.Session, api_base_url: str) -> Tuple[int, str]:
    r = session.get(f"{api_base_url}/products/", timeout=30)
    r.raise_for_status()

    data: Any = r.json()
    if isinstance(data, dict) and "results" in data:
        products = data.get("results")
    else:
        products = data

    if not isinstance(products, list) or not products:
        raise RuntimeError(
            "No products returned from /products/. "
            "Run your seed/populate command, or add at least one available Product."
        )

    first = products[0]
    if not isinstance(first, dict) or "id" not in first:
        raise RuntimeError(f"Unexpected product payload shape: {type(first)} {first}")

    return int(first["id"]), str(first.get("name") or "")


def _create_quote(session: requests.Session, api_base_url: str, product_id: int) -> Tuple[str, str]:
    payload: Dict[str, Any] = {
        "items": [{"id": product_id, "quantity": 1}],
        "customer_name": "Smoke Test",
        "email": "smoketest@example.com",
        "phone": "",
        "company": "",
        "billing_address": {
            "address_line_1": "123 Test St",
            "address_line_2": "",
            "city": "Douala",
            "postal_code": "00000",
            "country": "Cameroon",
            "state": "",
        },
        "same_as_billing": True,
        "shipping_cost": "0.00",
        "tax_rate": "21.00",
        "notes": "",
    }

    r = session.post(f"{api_base_url}/quotes/", json=payload, timeout=30)
    r.raise_for_status()
    data = r.json()

    quote_number = data.get("quote_number")
    access_token = data.get("access_token")

    if not quote_number or not access_token:
        raise RuntimeError(f"Create quote response missing token/number: {data}")

    return str(quote_number), str(access_token)


def _expect_status(resp: requests.Response, expected: int) -> None:
    if resp.status_code != expected:
        try:
            body = resp.json()
        except Exception:
            body = resp.text
        raise RuntimeError(
            f"Expected HTTP {expected}, got {resp.status_code}. Body: {body}"
        )


def main() -> int:
    api_base_url = _api_base_url()
    print(f"Using API base URL: {api_base_url}")

    with requests.Session() as session:
        product_id, product_name = _pick_first_product_id(session, api_base_url)
        print(f"Picked product: id={product_id} name={product_name!r}")

        quote_number, access_token = _create_quote(session, api_base_url, product_id)
        print(f"Created quote: quote_number={quote_number} access_token={access_token[:8]}…")

        # Quote detail access control
        r = session.get(f"{api_base_url}/quotes/{quote_number}/", timeout=30)
        _expect_status(r, 403)
        print("OK: anonymous quote detail without token -> 403")

        r = session.get(
            f"{api_base_url}/quotes/{quote_number}/", params={"token": access_token}, timeout=30
        )
        _expect_status(r, 200)
        print("OK: anonymous quote detail with token -> 200")

        # PDF access control
        r = session.get(f"{api_base_url}/quotes/{quote_number}/pdf/", timeout=60)
        _expect_status(r, 403)
        print("OK: anonymous quote PDF without token -> 403")

        r = session.get(
            f"{api_base_url}/quotes/{quote_number}/pdf/", params={"token": access_token}, timeout=60
        )
        _expect_status(r, 200)
        content_type = (r.headers.get("Content-Type") or "").lower()
        if "pdf" not in content_type:
            raise RuntimeError(f"Expected PDF content-type, got: {r.headers.get('Content-Type')}")

        out_path = os.path.join(os.path.dirname(__file__), f"quote-{quote_number}.pdf")
        with open(out_path, "wb") as f:
            f.write(r.content)

        print(f"OK: downloaded PDF with token -> saved {out_path}")

    print("Quote flow smoke test passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
