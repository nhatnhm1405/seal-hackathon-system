-- =====================================================
-- MIGRATION: seed reusable scoring-criteria TEMPLATES + their items
-- Run this on an EXISTING database that already has the SEAL schema/seed but
-- whose templates have no items yet (the old seed only created template_id 1
-- as a header with no reusable criteria).
--
--   mysql -u root -p seal_hackathon < "migration_criteria_template.sql"
--
-- Idempotent: safe to re-run. Template-only criteria (event_id/round_id NULL)
-- are never scored, so the DELETE below only clears the reusable items and
-- never touches an event's real criteria.
-- =====================================================

USE seal_hackathon;

-- 1) Ensure the two templates exist. Template 1 was already seeded; add #2 only
--    if missing. Align template 1's text to the English default.
INSERT INTO ScoringCriteriaTemplate (template_id, name, description, is_default)
SELECT 2, 'Pitch & Demo Day', 'Lightweight set for pitch / demo-day rounds', FALSE FROM dual
WHERE NOT EXISTS (SELECT 1 FROM ScoringCriteriaTemplate WHERE template_id = 2);

UPDATE ScoringCriteriaTemplate
SET name = 'Standard Hackathon Criteria',
    description = 'Default SEAL set: innovation, technical, UI/UX, presentation, completeness'
WHERE template_id = 1;

-- 2) (Re)seed the template-only items. Clear first so re-running never dupes.
DELETE FROM ScoringCriteria
WHERE template_id IN (1, 2) AND event_id IS NULL AND round_id IS NULL;

INSERT INTO ScoringCriteria (event_id, round_id, template_id, name, description, weight, max_score, order_number) VALUES
  -- Template 1 — Standard Hackathon Criteria
  (NULL, NULL, 1, 'Innovation',   'Originality and creativity of the idea',  1.5, 10.0, 1),
  (NULL, NULL, 1, 'Technical',    'Engineering quality and implementation',  2.0, 10.0, 2),
  (NULL, NULL, 1, 'UI/UX',        'Interface design and user experience',    1.0, 10.0, 3),
  (NULL, NULL, 1, 'Presentation', 'Pitching and demo skills',                1.0, 10.0, 4),
  (NULL, NULL, 1, 'Completeness', 'How finished and usable the product is',  1.5, 10.0, 5),
  -- Template 2 — Pitch & Demo Day
  (NULL, NULL, 2, 'Problem & Solution', 'Clarity of the problem and the proposed solution', 1.5, 10.0, 1),
  (NULL, NULL, 2, 'Demo',               'Quality and impact of the live demo',              2.0, 10.0, 2),
  (NULL, NULL, 2, 'Market Potential',   'Market viability and ability to scale',            1.0, 10.0, 3),
  (NULL, NULL, 2, 'Teamwork',           'Team collaboration and role clarity',              1.0, 10.0, 4);
