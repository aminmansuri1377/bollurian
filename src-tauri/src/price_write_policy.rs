//! Compares only stored master-price overrides. It does not calculate a quote.
use serde_json::Value;
use std::collections::BTreeMap;

const PRICE_FIELDS: [&str; 2] = ["prices", "previousPrices"];

fn price_map(value: Option<&Value>, strict: bool) -> Result<BTreeMap<String, f64>, String> {
    let mut result = BTreeMap::new();
    let Some(value) = value else { return Ok(result); };
    let Some(object) = value.as_object() else {
        return if strict { Err("INVALID_PRICE_STATE".into()) } else { Ok(result) };
    };
    for (key, value) in object {
        match value.as_f64().filter(|n| n.is_finite() && *n >= 0.0) {
            Some(number) => { result.insert(key.clone(), number); }
            None if strict => return Err("INVALID_PRICE_STATE".into()),
            None => {} // Match the existing frontend's legacy readNumberMap sanitization.
        }
    }
    Ok(result)
}

pub fn changes_master_prices(previous: Option<&Value>, next: &Value) -> Result<bool, String> {
    if !next.is_object() { return Err("INVALID_STATE".into()); }
    let mut changed = false;
    for field in PRICE_FIELDS {
        let before = price_map(previous.and_then(|state| state.get(field)), false)?;
        let after = price_map(next.get(field), true)?;
        changed |= before != after;
    }
    Ok(changed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn first_run_and_regular_settings_do_not_need_admin() {
        assert!(!changes_master_prices(None, &json!({"prices":{}, "previousPrices":{}})).unwrap());
        let previous = json!({"prices":{"brand|A":0,"B":2000},"previousPrices":{},"stops":3});
        let next = json!({"prices":{"B":2000.0,"brand|A":0},"previousPrices":{},"stops":10,"capacity":"8","railTypes":["T9","T16"]});
        assert!(!changes_master_prices(Some(&previous), &next).unwrap());
    }
    #[test]
    fn all_price_mutations_require_admin() {
        let previous = json!({"prices":{"A":1000},"previousPrices":{"A":900}});
        for next in [json!({"prices":{"A":2000},"previousPrices":{"A":900}}),
            json!({"prices":{"A":1000},"previousPrices":{"A":800}}),
            json!({"prices":{},"previousPrices":{}})] {
            assert!(changes_master_prices(Some(&previous), &next).unwrap());
        }
        assert!(changes_master_prices(None, &json!({"prices":{"A":1000}})).unwrap());
    }
    #[test]
    fn invalid_values_do_not_enter_the_database() {
        assert!(changes_master_prices(None, &json!({"prices":{"A":-1}})).is_err());
        assert!(changes_master_prices(None, &json!({"prices":[]})).is_err());
        assert!(changes_master_prices(None, &json!({"prices":{"A":"1000"}})).is_err());
        assert!(changes_master_prices(None, &json!([])).is_err());
    }
    #[test]
    fn legacy_sanitization_is_not_a_price_change() {
        let previous = json!({"prices":{"A":1000,"bad":"text","negative":-1},"previousPrices":null});
        assert!(!changes_master_prices(Some(&previous), &json!({"prices":{"A":1000},"previousPrices":{}})).unwrap());
    }
}
