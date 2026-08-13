"""
IP → country → local subscription prices.

Paystack only accepts a subset of currencies. Countries without a configured
price fall back to DEFAULT_COUNTRY_CODE (override with DEFAULT_PRICING_COUNTRY).
"""
from __future__ import annotations

import ipaddress
import logging
import os
import time
from typing import Any, Dict, Optional, Tuple

import requests

logger = logging.getLogger(__name__)

# Fallback when the visitor's country has no Paystack price configured.
DEFAULT_COUNTRY_CODE = os.environ.get('DEFAULT_PRICING_COUNTRY', 'US').upper().strip() or 'US'

PLAN_META = (
    {
        'id': 'monthly',
        'name': '1 Month',
        'period': 'per month',
        'description': 'Best for building a lasting habit',
        'duration_minutes': 43200,
        'highlight': False,
        'price_key': 'monthly',
    },
    {
        'id': 'six_months',
        'name': '6 Months',
        'period': 'per 6 months',
        'description': 'Commit for half a year. Better value.',
        'duration_minutes': 259200,
        'highlight': True,
        'price_key': 'six_months',
    },
    {
        'id': 'yearly',
        'name': '1 Year',
        'period': 'per year',
        'description': 'Best value. A full year of access.',
        'duration_minutes': 525600,
        'highlight': False,
        'price_key': 'yearly',
    },
)

# Local Paystack prices. Only listed countries have a plan; everyone else
# is billed in the default country currency.
COUNTRY_PLANS: Dict[str, Dict[str, Any]] = {
    'US': {
        'country_name': 'United States',
        'currency': 'USD',
        'symbol': '$',
        'currency_name': 'US Dollar',
        'monthly': 20,
        'six_months': 120,
        'yearly': 240,
    },
    'NG': {
        'country_name': 'Nigeria',
        'currency': 'NGN',
        'symbol': '₦',
        'currency_name': 'Nigerian Naira',
        'monthly': 30000,
        'six_months': 180000,
        'yearly': 360000,
    },
    'KE': {
        'country_name': 'Kenya',
        'currency': 'KES',
        'symbol': 'KSh',
        'currency_name': 'Kenyan Shilling',
        'monthly': 3000,
        'six_months': 18000,
        'yearly': 36000,
    },
    'GH': {
        'country_name': 'Ghana',
        'currency': 'GHS',
        'symbol': '₵',
        'currency_name': 'Ghanaian Cedi',
        'monthly': 240,
        'six_months': 1440,
        'yearly': 2880,
    },
    'ZA': {
        'country_name': 'South Africa',
        'currency': 'ZAR',
        'symbol': 'R',
        'currency_name': 'South African Rand',
        'monthly': 360,
        'six_months': 2160,
        'yearly': 4320,
    },
    'EG': {
        'country_name': 'Egypt',
        'currency': 'EGP',
        'symbol': 'E£',
        'currency_name': 'Egyptian Pound',
        'monthly': 600,
        'six_months': 3600,
        'yearly': 7200,
    },
    # West African CFA (Paystack XOF)
    'CI': {
        'country_name': "Côte d'Ivoire",
        'currency': 'XOF',
        'symbol': 'CFA',
        'currency_name': 'West African CFA Franc',
        'monthly': 12000,
        'six_months': 72000,
        'yearly': 144000,
    },
    'SN': {
        'country_name': 'Senegal',
        'currency': 'XOF',
        'symbol': 'CFA',
        'currency_name': 'West African CFA Franc',
        'monthly': 12000,
        'six_months': 72000,
        'yearly': 144000,
    },
    'BJ': {
        'country_name': 'Benin',
        'currency': 'XOF',
        'symbol': 'CFA',
        'currency_name': 'West African CFA Franc',
        'monthly': 12000,
        'six_months': 72000,
        'yearly': 144000,
    },
    'BF': {
        'country_name': 'Burkina Faso',
        'currency': 'XOF',
        'symbol': 'CFA',
        'currency_name': 'West African CFA Franc',
        'monthly': 12000,
        'six_months': 72000,
        'yearly': 144000,
    },
    'ML': {
        'country_name': 'Mali',
        'currency': 'XOF',
        'symbol': 'CFA',
        'currency_name': 'West African CFA Franc',
        'monthly': 12000,
        'six_months': 72000,
        'yearly': 144000,
    },
    'NE': {
        'country_name': 'Niger',
        'currency': 'XOF',
        'symbol': 'CFA',
        'currency_name': 'West African CFA Franc',
        'monthly': 12000,
        'six_months': 72000,
        'yearly': 144000,
    },
    'TG': {
        'country_name': 'Togo',
        'currency': 'XOF',
        'symbol': 'CFA',
        'currency_name': 'West African CFA Franc',
        'monthly': 12000,
        'six_months': 72000,
        'yearly': 144000,
    },
    'GW': {
        'country_name': 'Guinea-Bissau',
        'currency': 'XOF',
        'symbol': 'CFA',
        'currency_name': 'West African CFA Franc',
        'monthly': 12000,
        'six_months': 72000,
        'yearly': 144000,
    },
}

_GEO_CACHE: Dict[str, Tuple[float, Optional[str], Optional[str]]] = {}
_GEO_CACHE_TTL_SECONDS = 60 * 60
_GEO_CACHE_MAX = 2000


def _is_private_ip(ip: str) -> bool:
    try:
        return ipaddress.ip_address(ip).is_private or ipaddress.ip_address(ip).is_loopback
    except ValueError:
        return True


def get_client_ip() -> str:
    from flask import request

    for header in ('CF-Connecting-IP', 'X-Real-IP', 'X-Forwarded-For'):
        value = (request.headers.get(header) or '').strip()
        if not value:
            continue
        ip = value.split(',')[0].strip()
        if ip:
            return ip
    return (request.remote_addr or '').strip()


def _header_country_code() -> Optional[str]:
    from flask import request

    for header in ('CF-IPCountry', 'CloudFront-Viewer-Country'):
        value = (request.headers.get(header) or '').strip().upper()
        if value and len(value) == 2 and value != 'XX':
            return value
    return None


def lookup_country_from_ip(ip: str) -> Tuple[Optional[str], Optional[str]]:
    """Return (country_code, country_name) for a public IP."""
    if not ip or _is_private_ip(ip):
        return None, None

    now = time.time()
    cached = _GEO_CACHE.get(ip)
    if cached and now - cached[0] < _GEO_CACHE_TTL_SECONDS:
        return cached[1], cached[2]

    country_code: Optional[str] = None
    country_name: Optional[str] = None
    try:
        response = requests.get(
            f'http://ip-api.com/json/{ip}',
            params={'fields': 'status,country,countryCode'},
            timeout=3,
        )
        data = response.json() if response.ok else {}
        if data.get('status') == 'success':
            country_code = (data.get('countryCode') or '').upper() or None
            country_name = data.get('country') or None
    except Exception as exc:
        logger.warning('IP geo lookup failed for %s: %s', ip, exc)

    if len(_GEO_CACHE) >= _GEO_CACHE_MAX:
        _GEO_CACHE.clear()
    _GEO_CACHE[ip] = (now, country_code, country_name)
    return country_code, country_name


def resolve_pricing_country(
    detected_code: Optional[str],
    detected_name: Optional[str] = None,
) -> Dict[str, Any]:
    default_code = DEFAULT_COUNTRY_CODE if DEFAULT_COUNTRY_CODE in COUNTRY_PLANS else 'US'
    default_plan = COUNTRY_PLANS[default_code]

    code = (detected_code or '').upper()
    if code and code in COUNTRY_PLANS:
        plan = COUNTRY_PLANS[code]
        return {
            'country_code': code,
            'country_name': plan['country_name'],
            'used_fallback': False,
            'fallback_country_code': default_code,
            **plan,
        }

    return {
        'country_code': default_code,
        'country_name': default_plan['country_name'],
        'detected_country_code': code or None,
        'detected_country_name': detected_name,
        'used_fallback': True,
        'fallback_country_code': default_code,
        **default_plan,
    }


def build_localized_plans(pricing: Dict[str, Any]) -> list:
    plans = []
    for meta in PLAN_META:
        amount = int(pricing[meta['price_key']])
        formatted = format_plan_price(amount, pricing['symbol'], pricing['currency'])
        plans.append({
            'id': meta['id'],
            'name': meta['name'],
            'label': f"{formatted} {meta['name'].replace('1 ', '')}",
            'period': meta['period'],
            'description': meta['description'],
            'price': amount,
            'paystack_amount': amount,
            'currency': pricing['currency'],
            'symbol': pricing['symbol'],
            'formatted_price': formatted,
            'duration_minutes': meta['duration_minutes'],
            'highlight': meta['highlight'],
        })
    return plans


def format_plan_price(amount: int, symbol: str, currency: str) -> str:
    formatted = f'{amount:,}'
    if currency == 'XOF':
        return f'{formatted} {symbol}'
    # Letter-based symbols need a space (KSh, E£); glyph symbols do not ($, ₦, R, ₵)
    if any(ch.isalpha() for ch in symbol):
        return f'{symbol} {formatted}'
    return f'{symbol}{formatted}'


def get_localized_pricing(hint_country: Optional[str] = None) -> Dict[str, Any]:
    """
    Detect visitor country from IP and return local plans.

    `hint_country` is only used when the IP is private/unknown (local dev).
    Production always follows the IP.
    """
    ip = get_client_ip()
    header_code = _header_country_code()
    detected_code: Optional[str] = header_code
    detected_name: Optional[str] = None

    if not detected_code:
        detected_code, detected_name = lookup_country_from_ip(ip)

    # Localhost / unknown IP: allow a client hint so VPN testing still works in dev.
    if not detected_code and hint_country and _is_private_ip(ip or '127.0.0.1'):
        detected_code = hint_country.upper()

    pricing = resolve_pricing_country(detected_code, detected_name)
    plans = build_localized_plans(pricing)

    return {
        'status': 'success',
        'ip_private': _is_private_ip(ip or '127.0.0.1'),
        'country_code': pricing['country_code'],
        'country_name': pricing['country_name'],
        'currency': pricing['currency'],
        'symbol': pricing['symbol'],
        'currency_name': pricing['currency_name'],
        'used_fallback': pricing['used_fallback'],
        'fallback_country_code': pricing['fallback_country_code'],
        'detected_country_code': pricing.get('detected_country_code') or detected_code,
        'plans': plans,
        'free_plan': {
            'id': 'trial',
            'name': 'Free',
            'formatted_price': format_plan_price(0, pricing['symbol'], pricing['currency']),
            'price': 0,
            'currency': pricing['currency'],
            'symbol': pricing['symbol'],
            'period': '1 free meal plan',
        },
    }
