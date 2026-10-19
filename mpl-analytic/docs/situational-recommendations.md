# Situational item and emblem recommendations

## Implemented in this branch

- `database/migrations/20261016_situational_recommendations.sql` creates `hero_attributes` and `item_suitability_rules`.
- `hero_attributes` is populated from the latest available `hero_details` snapshot. Missing attributes stay `NULL`; the migration does not fabricate values.
- `item_suitability_rules` is seeded from `hero_build_situational_swaps`. Item names are recovered from the scraped `raw_text` when present (for example, names split across the scraper's `condition_text` and `item_name` columns).
- `GET /api/heroes/{id}` keeps the existing `hero` and `detail` properties and adds `recommendations.items` and `recommendations.emblems` inside `data`.
- Item records expose `item_name`, `suitability_status`, `reason`, `condition_key`, `condition_text`, `share_percent`, and `snapshot_at`.
- Emblem records expose `name`, `suitability_status`, `reason`, source build counts, and `snapshot_at`.

## Apply migration

From phpMyAdmin, select database `mpl_analytic`, open the SQL tab, and run the migration file. Alternatively, with the MySQL CLI:

```bash
mysql -u root -p mpl_analytic < mpl-analytic/database/migrations/20261016_situational_recommendations.sql
```

The migration is designed to be re-run safely on MySQL 8+.

## API compatibility and known contract boundary

The project archive does not contain an API Contract v1 document or an input schema for an enemy-team composition. Therefore this implementation does **not** invent a request parameter or endpoint for enemy composition. Item records are explicitly marked `situational` and their reasons describe the source condition; they are not claimed to be a match-specific decision. Emblems are marked `popular_in_build_data` because the available source is historical build counts, not a situational emblem rule table.

Before claiming match-specific suitability, confirm the agreed API Contract v1 field names and how enemy heroes are supplied. Then the service can evaluate `condition_key` against the supplied enemy composition without breaking the current route. The existing response envelope (`success`, `message`, `data`) and current `hero` / `detail` fields are retained.

## Manual smoke test

1. Import/run the migration.
2. Start the existing PHP app as usual.
3. Request `GET /api/heroes/17` (Rafaela exists in the supplied SQL dump).
4. Confirm HTTP 200 and that `data.recommendations.items` and `data.recommendations.emblems` are arrays.
5. Request `GET /api/heroes/999999`; it should retain the existing 404 `HERO_NOT_FOUND` behavior.
6. If the recommendations arrays are empty, check whether the source tables contain rows for the selected `hero_id` and whether the migration completed successfully.
