# Experimentation PED: Model & Feature Selection Framework

## Context

The current ML pipeline uses LightGBM + CatBoost ensemble with 24 engineered features, achieving poor performance (test R²=0.007, MAE=93.82 min, confidence=0.30). Before locking in a production model, we need a rigorous experimentation phase that objectively evaluates multiple models and feature sets to find the best performer for traffic incident duration prediction.

This PED defines the full experimentation framework — from infrastructure setup (MLflow, DVC) through feature/model experimentation roadmaps to a tournament-style elimination that crowns a single champion model.

---

## 1. Infrastructure Setup

### 1.1 MLflow Integration

**Location:** `apps/ml/experiments/`

```
apps/ml/
├── experiments/
│   ├── mlflow_config.py        # MLflow connection, experiment creation
│   ├── run_experiment.py       # Unified experiment runner
│   ├── feature_registry.py    # Feature set definitions
│   ├── model_registry.py      # Model factory (all model configs)
│   ├── evaluate.py            # Standardized evaluation
│   ├── tournament.py          # Tournament elimination logic
│   └── promote.py             # Champion promotion to production
├── mlruns/                    # MLflow local tracking store
├── mlflow.db                  # SQLite backend store
└── dvc.yaml                   # DVC pipeline definition
```

**MLflow Setup:**
- Backend store: SQLite (`mlflow.db`) for local dev, upgradeable to PostgreSQL
- Artifact store: `./mlartifacts/` (local filesystem)
- Tracking URI: `sqlite:///apps/ml/mlflow.db`
- UI: `mlflow ui --port 5001` (added to docker-compose)

### 1.2 DVC for Data Versioning

**Justification:** The dataset (`incidents.csv`, 8205 rows) will evolve as new incidents arrive. DVC tracks data versions so every experiment is reproducible against a specific data snapshot.

```yaml
# dvc.yaml
stages:
  prepare_data:
    cmd: python -m experiments.prepare_data
    deps:
      - data/incidents.csv
      - config/schema.yaml
    outs:
      - data/processed/train.parquet
      - data/processed/test.parquet
    metrics:
      - data/processed/data_stats.json
```

**Strategy:**
- `dvc init` inside `apps/ml/`
- Track `data/incidents.csv` with DVC (remote: local or S3)
- Each experiment logs the DVC data hash as an MLflow param
- Reproducibility: `dvc checkout <hash>` + `mlflow run` recreates any experiment

### 1.3 Experiment Naming Conventions

```
Experiment:   gridlock/{phase}/{focus}
              e.g., gridlock/features/geospatial
              e.g., gridlock/models/neural_nets

Run Name:     {model}_{feature_set}_{timestamp}
              e.g., xgboost_v3_geo_20260618_143022

Tags:
  - phase: "feature_selection" | "model_selection" | "tournament"
  - feature_set: "baseline" | "v2_temporal" | "v3_geo" | ...
  - model_family: "linear" | "tree" | "neural" | "ensemble"
  - stage: "screening" | "tuning" | "final"
```

### 1.4 Artifact Structure per Run

```
mlartifacts/{run_id}/
├── model/                  # Serialized model (MLflow model format)
├── metrics.json            # All computed metrics
├── feature_importance.png  # SHAP or built-in importance
├── residual_plot.png       # Predicted vs actual
├── learning_curve.png      # Train/val over epochs/trees
├── oof_predictions.csv     # Out-of-fold predictions (for stacking)
├── config.yaml             # Full reproducible config
└── notes.md                # Auto-generated observations
```

### 1.5 Metrics Logged per Run

| Metric | Space | Purpose |
|--------|-------|---------|
| `mae` | Linear | Primary business metric (minutes off) |
| `rmse` | Linear | Penalizes large errors |
| `mape` | Linear | Relative error |
| `r2` | Linear | Explained variance |
| `log_mae` | Log | Metric on log-transformed target |
| `log_rmse` | Log | Primary optimization metric |
| `log_r2` | Log | Log-space explained variance |
| `median_ae` | Linear | Robust central tendency |
| `p90_error` | Linear | Tail error (90th percentile) |
| `train_test_gap` | — | Overfitting indicator |
| `cv_std` | — | Stability across folds |
| `inference_time_ms` | — | Latency constraint |

**Primary ranking metric:** `log_rmse` (matches log-transformed target)
**Secondary:** `mae` (business interpretability)
**Constraints:** `inference_time_ms < 100ms`, `train_test_gap < 15%`

---

## 2. Cross-Validation & Evaluation Strategy

### 2.1 CV Strategy

- **Method:** TimeSeriesSplit (5 folds) — preserves temporal ordering
- **Hold-out test set:** Last 20% chronologically (never touched until final evaluation)
- **OOF predictions:** Saved for every run (enables stacking later)

### 2.2 Overfitting Checks

1. **Train-test gap:** If `(train_metric - test_metric) / train_metric > 15%` → flag
2. **CV variance:** If `std(fold_scores) / mean(fold_scores) > 20%` → flag
3. **Learning curve:** Plot train vs val score over complexity — check for divergence
4. **Feature ablation:** Remove top feature, check if score drops proportionally

### 2.3 Model Promotion Criteria

A model is promoted to "candidate" if ALL:
- `log_rmse` improves over current best by > 1%
- `train_test_gap` < 15%
- `cv_std` < 20% of mean score
- `inference_time_ms` < 100ms
- No data leakage detected (future features, target leakage)

---

## 3. Feature Experimentation Roadmap

### Phase F1: Baseline (current 24 features)

Reproduce current feature set as the baseline. All models get compared on this first.

### Phase F2: Temporal Deep-Dive

Add:
- `month`, `quarter`, `is_holiday` (Indian public holidays)
- `minutes_since_midnight` (continuous)
- `time_bucket` (early_morning/morning/afternoon/evening/night)
- `days_since_first_event` (trend feature)

### Phase F3: Geospatial Enhancement

Add:
- `geohash_5`, `geohash_6` (spatial clustering)
- `distance_to_city_center`
- `road_density_proxy` (count of events within 1km radius in training data)
- `nearest_junction_distance` (if data available)
- Cluster labels from KMeans on (lat, lon) with k=10,20,50

### Phase F4: Advanced Encodings

- Replace current target encoding with proper K-fold target encoding (prevent leakage)
- Add WOE (Weight of Evidence) encoding for categorical variables
- Leave-one-out encoding
- James-Stein encoding for high-cardinality categoricals

### Phase F5: Interaction & Polynomial

- `cause x corridor` interaction
- `hour x zone` interaction
- `priority x road_closure` interaction
- 2nd-degree polynomial on (lat, lon, hour)
- PCA on all numeric features (top 5 components as additional features)

### Phase F6: Historical/Lag Features

- `avg_duration_same_cause_last_30d`
- `avg_duration_same_zone_last_7d`
- `event_count_same_hour_last_7d` (congestion proxy)
- `rolling_mean_duration_7d` (global trend)

### Feature Selection Method

After generating all candidate features:
1. Compute mutual information with target
2. Run Boruta (Random Forest wrapper) for feature importance
3. Use permutation importance on best model
4. Forward selection on top-50 features
5. Log selected feature set as MLflow artifact

---

## 4. Model Experimentation Roadmap

### Phase M1: Linear Models (Screening)

| Model | Library | Key Params |
|-------|---------|------------|
| Ridge Regression | sklearn | alpha: [0.01, 0.1, 1, 10, 100] |
| Lasso Regression | sklearn | alpha: [0.001, 0.01, 0.1, 1] |
| ElasticNet | sklearn | alpha, l1_ratio grid |
| HuberRegressor | sklearn | epsilon: [1.1, 1.35, 1.5, 2.0] |

**Purpose:** Establish linear baseline. If linear models are competitive, the problem is simpler than assumed.

**Tuning:** GridSearchCV (small param space, fast).

### Phase M2: Tree-Based Models (Main Competition)

| Model | Library | Tuning Trials |
|-------|---------|---------------|
| Random Forest | sklearn | 50 Optuna trials |
| Extra Trees | sklearn | 50 Optuna trials |
| XGBoost | xgboost | 100 Optuna trials |
| LightGBM | lightgbm | 100 Optuna trials |
| CatBoost | catboost | 100 Optuna trials |
| HistGradientBoosting | sklearn | 80 Optuna trials |

**Hyperparameter Spaces:**

**Random Forest / Extra Trees:**
```python
n_estimators: [100, 500, 1000]
max_depth: [5, 10, 20, 30, None]
min_samples_split: [2, 5, 10, 20]
min_samples_leaf: [1, 2, 5, 10]
max_features: ["sqrt", "log2", 0.5, 0.8]
```

**XGBoost:**
```python
n_estimators: [100, 2000]
max_depth: [3, 10]
learning_rate: [0.005, 0.3]  # log-uniform
subsample: [0.5, 1.0]
colsample_bytree: [0.3, 1.0]
reg_alpha: [1e-8, 10]  # log-uniform
reg_lambda: [1e-8, 10]  # log-uniform
min_child_weight: [1, 20]
gamma: [0, 5]
```

**LightGBM:**
```python
n_estimators: [100, 2000]
num_leaves: [7, 255]
max_depth: [-1, 12]
learning_rate: [0.005, 0.3]
subsample: [0.5, 1.0]
colsample_bytree: [0.3, 1.0]
reg_alpha: [1e-8, 10]
reg_lambda: [1e-8, 10]
min_child_samples: [5, 100]
```

**CatBoost:**
```python
iterations: [100, 2000]
depth: [3, 10]
learning_rate: [0.005, 0.3]
l2_leaf_reg: [1, 30]
bagging_temperature: [0, 10]
random_strength: [0, 10]
border_count: [32, 255]
```

**HistGradientBoosting:**
```python
max_iter: [100, 1000]
max_depth: [3, 12]
learning_rate: [0.005, 0.3]
min_samples_leaf: [5, 50]
max_leaf_nodes: [15, 255]
l2_regularization: [0, 10]
```

### Phase M3: Neural Networks (Tabular)

| Model | Library | Architecture |
|-------|---------|--------------|
| MLP | PyTorch | 3-5 layers, BatchNorm, Dropout |
| TabNet | pytorch-tabnet | Attention-based tabular |
| FT-Transformer | rtdl | Feature Tokenizer + Transformer |

**MLP Architecture Search:**
```python
hidden_dims: [[256,128,64], [512,256,128,64], [128,64,32]]
dropout: [0.1, 0.5]
batch_norm: [True, False]
activation: ["relu", "gelu", "silu"]
learning_rate: [1e-4, 1e-2]
weight_decay: [1e-5, 1e-3]
batch_size: [64, 128, 256]
epochs: [100, 500] with early stopping (patience=20)
```

**TabNet:**
```python
n_d: [8, 64]  # Width of decision prediction layer
n_a: [8, 64]  # Width of attention prediction layer
n_steps: [3, 10]  # Number of steps
gamma: [1.0, 2.0]  # Coefficient for feature reusage
lambda_sparse: [1e-4, 1e-2]
momentum: [0.01, 0.4]
```

**FT-Transformer (only if dataset > 5K rows after cleaning):**
```python
d_token: [64, 256]
n_blocks: [2, 6]
attention_heads: [4, 8]
ffn_d_hidden_factor: [2/3, 8/3]
attention_dropout: [0.0, 0.3]
ffn_dropout: [0.0, 0.3]
residual_dropout: [0.0, 0.2]
```

**Justification for Neural Nets:** With ~6,500 training samples, neural nets may underperform trees. However, TabNet's attention mechanism could reveal feature interactions missed by trees, and FT-Transformer has shown SOTA on some tabular benchmarks. We include them for completeness — the tournament will objectively eliminate them if they underperform.

### Phase M4: Ensemble Methods

Built from top performers in M1-M3:
- **Weighted Average:** Grid search blend weights on OOF predictions
- **Stacking:** Train a Ridge meta-learner on OOF predictions from top-5 models
- **Blending:** 80/20 split of training data, meta-learner on 20% holdout

---

## 5. Experiment Execution Workflow

### Step-by-step Process

```
1. SET baseline
   -> Train all models on F1 (baseline features)
   -> Log to MLflow experiment "gridlock/screening/baseline"
   -> Rank by log_rmse

2. FEATURE iteration (for top-5 models from step 1)
   -> For each feature set F2-F6:
     -> Train top-5 models
     -> Log to "gridlock/features/{feature_set}"
     -> Identify best feature set per model

3. HYPERPARAMETER tuning (top-3 model+feature combos)
   -> Full Optuna tuning (100 trials each)
   -> Log to "gridlock/tuning/{model}"
   -> Save best params

4. NEURAL NET evaluation
   -> Train MLP, TabNet, FT-Transformer on best feature set
   -> Log to "gridlock/models/neural"
   -> Compare against tuned tree models

5. ENSEMBLE construction
   -> Use OOF predictions from top-5 tuned models
   -> Test weighted average, stacking, blending
   -> Log to "gridlock/ensemble/final"

6. TOURNAMENT (see Section 6)
```

### Comparison Methodology

All comparisons use:
- Same CV folds (seeded TimeSeriesSplit)
- Same preprocessing pipeline
- Same evaluation metrics
- Statistical significance: Paired t-test on fold scores (p < 0.05)
- Effect size: Cohen's d > 0.2 for meaningful improvement

---

## 6. Tournament-Style Elimination

### Round 1: Screening (All models, baseline features)

- Train all 10+ models on F1 baseline
- **Eliminate:** Models with `log_rmse` > 120% of best, or `inference_time > 500ms`
- **Advance:** Top 6 models

### Round 2: Feature Exploration (Top 6 models)

- Each model trained on F1-F6 feature sets
- **Eliminate:** Models that don't improve with any feature set beyond F1
- Select best feature set per model
- **Advance:** Top 4 model+feature combos

### Round 3: Hyperparameter Tuning (Top 4)

- Full Optuna tuning (100 trials, 15-min timeout)
- **Eliminate:** Models where tuning yields < 2% improvement (suggests ceiling reached)
- **Advance:** Top 3 tuned models

### Round 4: Neural Network Challenge

- Best neural net (from M3) challenges top 3
- If neural net beats any tree model -> replaces it
- **Advance:** Top 3 models (trees or neural)

### Round 5: Ensemble Finals

- Build ensembles from top 3 individual models
- Compare: best individual vs. weighted avg vs. stacked ensemble
- **Champion:** Single best performer (individual or ensemble)

### Promotion to Production

The champion model:
1. Gets registered in MLflow Model Registry as `gridlock-duration-predictor`
2. Transitions through stages: `None` -> `Staging` -> `Production`
3. Production model loaded by `predict.py` via MLflow model URI
4. Old model archived (not deleted)

---

## 7. New Dependencies

Add to `apps/ml/requirements.txt`:
```
mlflow>=2.12
dvc>=3.50
xgboost>=2.0
torch>=2.2
pytorch-tabnet>=4.1
shap>=0.45
boruta>=0.3
category_encoders>=2.6
```

---

## 8. Key Files to Modify/Create

| File | Action | Purpose |
|------|--------|---------|
| `apps/ml/experiments/mlflow_config.py` | Create | MLflow setup & utilities |
| `apps/ml/experiments/run_experiment.py` | Create | Unified experiment runner |
| `apps/ml/experiments/feature_registry.py` | Create | All feature set definitions |
| `apps/ml/experiments/model_registry.py` | Create | Model factory with all configs |
| `apps/ml/experiments/evaluate.py` | Create | Standardized eval + logging |
| `apps/ml/experiments/tournament.py` | Create | Tournament elimination logic |
| `apps/ml/experiments/promote.py` | Create | Champion -> production promotion |
| `apps/ml/dvc.yaml` | Create | DVC pipeline stages |
| `apps/ml/requirements.txt` | Modify | Add new dependencies |
| `docker-compose.yml` | Modify | Add MLflow UI service |
| `apps/ml/config/experiment.yaml` | Create | Experiment configuration |

---

## 9. Verification Plan

1. **MLflow UI:** Run `mlflow ui`, verify experiments/runs/artifacts visible
2. **Reproducibility:** Re-run any experiment by run_id, confirm identical metrics
3. **DVC:** `dvc repro` reproduces data preparation stage
4. **Tournament:** Run full tournament on subset (100 samples) to verify elimination logic
5. **Promotion:** Promote a model, verify `predict.py` loads it correctly
6. **End-to-end:** `python -m experiments.run_experiment --tournament full` completes without error
