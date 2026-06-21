# GridLock — ML Model Card

A short, honest description of what the duration model is, what it is not, and how it is used.
Written for technical reviewers who want the real numbers, not a marketing figure.

## Task & target
- **Predicts:** `duration_mins` — time from incident start to **administrative closure**
  (`closed_datetime − start_datetime`, fallback `resolved_datetime`).
- **Honest framing:** this is an *administrative-resolution* proxy, **not** validated physical
  roadway-clearance time. We do not claim minute-accurate clearance prediction.
- Modeled in log space (durations are heavy-tailed).

## Data
- **Astram incident log (Bengaluru), the only dataset.** No external traffic/weather/census data.
- 8,173 raw rows → **2,497 usable** after the 2–1440 min filter (most rows lack an end timestamp).
- **Chronological** 80/20 split: 1,997 train / 500 test (no random shuffling → no temporal leakage).

## Model
- Stacking ensemble: RandomForest + CatBoost + ExtraTrees → Ridge meta-learner.
- **RandomForest is the workhorse** (meta-weight ≈ 0.82); CatBoost's learned weight is negative.
  A single RandomForest is statistically equivalent — the ensemble is not load-bearing.
- Serving feeds the exact engineered features the model trained on (F4 K-fold target encoding +
  F5 interactions/PCA) via a persisted `FeaturePipeline` — no train/serve skew.

## Honest held-out performance (500 chronological test rows)
| Metric | Value |
|---|---|
| R² (minutes) | **≈ 0.09** |
| MAE | **≈ 97 min** |
| Median absolute error | **≈ 30 min** |
| log-RMSE | **≈ 1.09** |
| Conformal 90% interval coverage | **≈ 91%** (empirical) |

Point accuracy is **weak by design-of-the-data**, ~10% better than predicting the mean.

## The predictability ceiling (measured, not assumed)
Five independent tests show ~0.09 is the realistic ceiling for this dataset:
- A linear Ridge model **ties** the tree ensembles → no untapped nonlinear signal.
- The full F1–F6 feature union does **not** beat F4 → feature space is saturated.
- 5-fold time-series CV: R²(log) = **0.079 ± 0.099** → skill barely above zero, high variance.
- Incidents with the **same cause + corridor** vary in duration with **CV ≈ 0.77**; knowing
  (cause, corridor) explains only **~2%** of variance → duration is mostly driven by on-scene
  factors absent from the 46 columns.
- Short-vs-long band classification reaches only AUC 0.61.

Survival/AFT salvage of censored rows was tested and **rejected** — `modified_datetime` is an
administrative edit time (floors ~3× real durations), not a valid censoring time; it hurt R².

## How the weak scalar becomes useful (the actual product)
The point estimate is deliberately **not** the product. It is the service-time input to a physics
and decision stack the tabular model cannot represent on its own:
`ML duration → M/M/c/K (+ tandem) queueing → blocking/spillover risk → +5/+15/+30 propagation →
deployment & gating playbook`, with the **conformal interval** (not the point) driving a
contingency reserve in dispatch. The defensible claim is **calibrated decision support under
noisy, censored labels**, not an accurate ETA oracle.

## What we do NOT claim
- Not minute-accurate clearance-time prediction.
- `closed_datetime` is not asserted to be true physical end-of-impact.
- No causal claims from feature importance.
- No field-ready generalization beyond this one Bengaluru dataset.

## Reproducibility
- `scripts/build_feature_pipeline.py` — serving feature pipeline.
- `scripts/calibrate_conformal.py` — conformal intervals (calibrated vs the deployed predictor).
- `scripts/build_fingerprint_reference.py` — similar-incident retrieval table.
- `experiments/` — the 5-round tournament + MLflow tracking that selected the champion.
