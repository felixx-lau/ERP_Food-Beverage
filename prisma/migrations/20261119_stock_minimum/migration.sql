UPDATE "ReorderRule"
SET "minimum" = 5, "target" = MAX("target", 6)
WHERE "minimum" <> 5 OR "target" < 6;
