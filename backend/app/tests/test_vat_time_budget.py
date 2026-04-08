from main import _vies_effective_max_total_sec, _vies_env_max_total_sec


def test_vies_env_max_total_sec_defaults_when_unset(monkeypatch) -> None:
    monkeypatch.delenv("VIES_MAX_TOTAL_SEC", raising=False)
    assert _vies_env_max_total_sec() == 12.0


def test_vies_env_max_total_sec_clamps_invalid_value(monkeypatch) -> None:
    monkeypatch.setenv("VIES_MAX_TOTAL_SEC", "not-a-number")
    assert _vies_env_max_total_sec() == 12.0


def test_vies_effective_budget_uses_min_of_env_and_endpoint(monkeypatch) -> None:
    monkeypatch.setenv("VIES_MAX_TOTAL_SEC", "12")
    assert _vies_effective_max_total_sec(endpoint_budget_sec=5.5) == 5.5


def test_vies_effective_budget_keeps_minimum_floor(monkeypatch) -> None:
    monkeypatch.setenv("VIES_MAX_TOTAL_SEC", "0.1")
    assert _vies_effective_max_total_sec(endpoint_budget_sec=0.2) == 1.0
