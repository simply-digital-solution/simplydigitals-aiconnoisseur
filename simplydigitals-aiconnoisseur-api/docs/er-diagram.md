# Entity-Relationship Diagram

```mermaid
erDiagram
    users {
        string id PK
        string email UK
        string hashed_password "nullable"
        string full_name
        string avatar_url "nullable"
        boolean is_active
        boolean is_superuser
        enum auth_provider "local | google | facebook"
        string oauth_provider_id "nullable"
        datetime created_at
        datetime updated_at
    }

    datasets {
        string id PK
        string name
        string description "nullable"
        string file_path
        string s3_key "nullable"
        int row_count
        int column_count
        json profile "nullable"
        string client_ip "nullable"
        string owner_id FK
        datetime created_at
    }

    ml_models {
        string id PK
        string name
        enum algorithm "classification | regression | clustering"
        enum status "pending | training | ready | failed"
        json hyperparameters "nullable"
        json metrics "nullable"
        string artefact_path "nullable"
        json feature_columns "nullable"
        string target_column "nullable"
        float training_duration_seconds "nullable"
        string dataset_id FK
        string owner_id FK
        datetime created_at
        datetime updated_at
    }

    users ||--o{ datasets : "owns"
    users ||--o{ ml_models : "owns"
    datasets ||--o{ ml_models : "trained on"
```

## Notes

| Table | Key Points |
|-------|-----------|
| `users` | Supports local credentials and OAuth (Google, Facebook). `hashed_password` is nullable for OAuth-only users. |
| `datasets` | `s3_key` is nullable — set when `S3_BUCKET_NAME` is configured, otherwise falls back to `file_path` on local disk. Max 5 datasets per user (oldest evicted on overflow). |
| `ml_models` | Belongs to both a `user` (owner) and a `dataset` (training source). Tracks algorithm type, training status, hyperparameters, and evaluation metrics. |
