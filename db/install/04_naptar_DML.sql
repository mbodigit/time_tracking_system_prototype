USE time_tracking_db_prototype;

SET NAMES utf8mb4;

INSERT INTO GlobalCalendar (gl_cal_date, gl_cal_day_type, gl_cal_note)
SELECT v.datum, v.tipus, v.megjegyzes FROM (
            SELECT '2026-01-01' AS datum, 'Munkaszüneti nap' AS tipus,
                   'Újév'                                    AS megjegyzes
  UNION ALL SELECT '2026-03-15', 'Munkaszüneti nap', 'Az 1848-as forradalom ünnepe'
  UNION ALL SELECT '2026-04-03', 'Munkaszüneti nap', 'Nagypéntek'
  UNION ALL SELECT '2026-04-06', 'Munkaszüneti nap', 'Húsvéthétfő'
  UNION ALL SELECT '2026-05-01', 'Munkaszüneti nap', 'A munka ünnepe'
  UNION ALL SELECT '2026-05-25', 'Munkaszüneti nap', 'Pünkösdhétfő'
  UNION ALL SELECT '2026-08-20', 'Munkaszüneti nap', 'Az államalapítás ünnepe'
  UNION ALL SELECT '2026-10-23', 'Munkaszüneti nap', 'Az 1956-os forradalom ünnepe'
  UNION ALL SELECT '2026-11-01', 'Munkaszüneti nap', 'Mindenszentek'
  UNION ALL SELECT '2026-12-25', 'Munkaszüneti nap', 'Karácsony'
  UNION ALL SELECT '2026-12-26', 'Munkaszüneti nap', 'Karácsony másnapja'
) v
WHERE NOT EXISTS (
  SELECT 1 FROM GlobalCalendar g WHERE g.gl_cal_date = v.datum
);
