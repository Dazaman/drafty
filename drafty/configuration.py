"""Validation shared by the pipeline and the local admin service."""

import math


def validate_config(value):
    if not isinstance(value, dict):
        raise ValueError("Configuration must be an object")
    league = value.get("league_code")
    if type(league) is not int or not 1 <= league <= 1000000000:
        raise ValueError("League ID must be a positive integer")
    brackets = value.get("brackets")
    if not isinstance(brackets, dict) or not 1 <= len(brackets) <= 8:
        raise ValueError("Choose between one and eight brackets")
    clean, previous = {}, 0
    for index, bounds in enumerate(brackets.values(), 1):
        if not isinstance(bounds, list) or len(bounds) != 2:
            raise ValueError("Each bracket needs a start and end gameweek")
        try:
            start, end = (int(item) for item in bounds)
        except (ValueError, TypeError, OverflowError):
            raise ValueError("Gameweeks must be whole numbers") from None
        if any(str(item) != str(int(item)) for item in bounds):
            raise ValueError("Gameweeks must be whole numbers")
        if not previous < start <= end <= 38:
            raise ValueError(
                "Brackets must be ordered, non-overlapping, and within GW 1–38"
            )
        clean[str(index)] = [str(start), str(end)]
        previous = end
    payouts = validate_prizes(value.get("prizes", {"1": 50, "2": 25}), required=True)
    season_payouts = validate_prizes(value.get("season_prizes", {}))
    entry_fee = value.get("entry_fee", 0)
    validate_amount(entry_fee)
    currency = value.get("currency", "USD")
    if currency not in {"USD", "GBP", "EUR", "PKR"}:
        raise ValueError("Choose USD, GBP, EUR, or PKR")
    return {
        "league_code": league,
        "brackets": clean,
        "prizes": payouts,
        "currency": currency,
        "season_prizes": season_payouts,
        "entry_fee": entry_fee,
    }


def validate_amount(amount):
    if (
        isinstance(amount, bool)
        or not isinstance(amount, (int, float))
        or not math.isfinite(amount)
        or not 0 <= amount <= 1000000
    ):
        raise ValueError("Amounts must be finite numbers between 0 and 1,000,000")


def validate_prizes(prizes, required=False):
    if not isinstance(prizes, dict) or (required and not prizes):
        raise ValueError("Provide a prize schedule (zero amounts are allowed)")
    payouts = {}
    for rank, amount in prizes.items():
        if not str(rank).isdigit() or not 1 <= int(rank) <= 20:
            raise ValueError("Prize ranks must be between 1 and 20")
        validate_amount(amount)
        payouts[str(int(rank))] = amount
    return payouts
