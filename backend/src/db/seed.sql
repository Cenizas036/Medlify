-- ═══════════════════════════════════════════════════════════
--  SEED DATA  — Pune, Maharashtra (prototype / demo only)
--  Centre: 18.5204° N, 73.8567° E
-- ═══════════════════════════════════════════════════════════

-- ─── 40 Common Medicines ───────────────────────────────────
INSERT INTO medicines (name, generic_name, requires_prescription) VALUES
  ('Paracetamol 500mg',          'Paracetamol',           FALSE),
  ('Ibuprofen 400mg',            'Ibuprofen',             FALSE),
  ('Amoxicillin 500mg',          'Amoxicillin',           TRUE),
  ('Azithromycin 500mg',         'Azithromycin',          TRUE),
  ('Metformin 500mg',            'Metformin',             TRUE),
  ('Amlodipine 5mg',             'Amlodipine',            TRUE),
  ('Atorvastatin 10mg',          'Atorvastatin',          TRUE),
  ('Omeprazole 20mg',            'Omeprazole',            FALSE),
  ('Pantoprazole 40mg',          'Pantoprazole',          FALSE),
  ('Cetirizine 10mg',            'Cetirizine',            FALSE),
  ('Levocetrizine 5mg',          'Levocetirizine',        FALSE),
  ('Montelukast 10mg',           'Montelukast',           TRUE),
  ('Dolo 650',                   'Paracetamol 650mg',     FALSE),
  ('Crocin Advance',             'Paracetamol 500mg',     FALSE),
  ('Combiflam',                  'Ibuprofen+Paracetamol', FALSE),
  ('Aspirin 75mg',               'Aspirin',               FALSE),
  ('Ranitidine 150mg',           'Ranitidine',            FALSE),
  ('Domperidone 10mg',           'Domperidone',           FALSE),
  ('Ondansetron 4mg',            'Ondansetron',           TRUE),
  ('ORS Sachet',                 'Oral Rehydration Salts',FALSE),
  ('Zinc Sulphate 20mg',         'Zinc Sulphate',         FALSE),
  ('Vitamin C 500mg',            'Ascorbic Acid',         FALSE),
  ('Vitamin D3 60K',             'Cholecalciferol',       FALSE),
  ('Calcium + D3',               'Calcium Carbonate',     FALSE),
  ('Iron + Folic Acid',          'Ferrous Sulphate',      FALSE),
  ('Metronidazole 400mg',        'Metronidazole',         TRUE),
  ('Ciprofloxacin 500mg',        'Ciprofloxacin',         TRUE),
  ('Doxycycline 100mg',          'Doxycycline',           TRUE),
  ('Clotrimazole Cream',         'Clotrimazole',          FALSE),
  ('Betamethasone Cream',        'Betamethasone',         TRUE),
  ('Mupirocin Ointment',         'Mupirocin',             FALSE),
  ('Salbutamol Inhaler',         'Salbutamol',            TRUE),
  ('Budesonide Inhaler',         'Budesonide',            TRUE),
  ('Losartan 50mg',              'Losartan',              TRUE),
  ('Telmisartan 40mg',           'Telmisartan',           TRUE),
  ('Glimepiride 1mg',            'Glimepiride',           TRUE),
  ('Insulin Glargine 100U/mL',   'Insulin Glargine',      TRUE),
  ('Pregabalin 75mg',            'Pregabalin',            TRUE),
  ('Pantodac DSR',               'Pantoprazole+Domperidone', FALSE),
  ('Montair LC',                 'Montelukast+Levocetirizine', FALSE)
ON CONFLICT DO NOTHING;

-- ─── 15 Pharmacies around Pune centre ─────────────────────
-- Using ST_MakePoint(longitude, latitude)
INSERT INTO pharmacies (name, address, location, phone, open_hours) VALUES
  ('Apollo Pharmacy – FC Road',
   'FC Road, Shivajinagar, Pune 411004',
   ST_SetSRID(ST_MakePoint(73.8488, 18.5308), 4326)::geography,
   '020-25671234', '8:00 AM – 10:00 PM'),

  ('MedPlus – Kothrud',
   'Paud Road, Kothrud, Pune 411029',
   ST_SetSRID(ST_MakePoint(73.8120, 18.5074), 4326)::geography,
   '020-25384567', '8:00 AM – 10:00 PM'),

  ('Jan Aushadhi – Warje',
   'Warje Bridge, Warje, Pune 411052',
   ST_SetSRID(ST_MakePoint(73.7990, 18.4934), 4326)::geography,
   '020-24222345', '9:00 AM – 8:00 PM'),

  ('Wellness Forever – Baner',
   'Baner Road, Baner, Pune 411045',
   ST_SetSRID(ST_MakePoint(73.7898, 18.5590), 4326)::geography,
   '020-27294567', '8:00 AM – 11:00 PM'),

  ('Netmeds Store – Hinjewadi',
   'Phase 1, Hinjewadi, Pune 411057',
   ST_SetSRID(ST_MakePoint(73.7384, 18.5916), 4326)::geography,
   '020-29761234', '9:00 AM – 9:00 PM'),

  ('Sahyadri Medical – Deccan',
   'Deccan Gymkhana, Pune 411004',
   ST_SetSRID(ST_MakePoint(73.8392, 18.5157), 4326)::geography,
   '020-25671111', '8:30 AM – 9:30 PM'),

  ('Life Pharmacy – Wakad',
   'Wakad Road, Wakad, Pune 411057',
   ST_SetSRID(ST_MakePoint(73.7616, 18.5986), 4326)::geography,
   '020-27652345', '9:00 AM – 9:00 PM'),

  ('Shree Pharmacy – Hadapsar',
   'Magarpatta Road, Hadapsar, Pune 411028',
   ST_SetSRID(ST_MakePoint(73.9230, 18.5089), 4326)::geography,
   '020-26834567', '8:00 AM – 10:00 PM'),

  ('Cipla Store – Viman Nagar',
   'Viman Nagar Road, Pune 411014',
   ST_SetSRID(ST_MakePoint(73.9007, 18.5679), 4326)::geography,
   '020-26612345', '9:00 AM – 9:00 PM'),

  ('Om Medical – Katraj',
   'Katraj Road, Pune 411046',
   ST_SetSRID(ST_MakePoint(73.8617, 18.4529), 4326)::geography,
   '020-24374567', '9:00 AM – 8:00 PM'),

  ('Health Hub – Aundh',
   'Aundh Road, Aundh, Pune 411007',
   ST_SetSRID(ST_MakePoint(73.8073, 18.5600), 4326)::geography,
   '020-27272345', '8:00 AM – 10:00 PM'),

  ('Prime Pharmacy – Kondhwa',
   'Kondhwa Road, Pune 411048',
   ST_SetSRID(ST_MakePoint(73.8905, 18.4710), 4326)::geography,
   '020-26832345', '9:00 AM – 9:00 PM'),

  ('Global Med – Pimpri',
   'Old Mumbai Pune Highway, Pimpri 411018',
   ST_SetSRID(ST_MakePoint(73.7962, 18.6279), 4326)::geography,
   '020-27422345', '8:00 AM – 10:00 PM'),

  ('Ruby Hall Pharmacy – Camp',
   'Sassoon Road, Camp, Pune 411001',
   ST_SetSRID(ST_MakePoint(73.8742, 18.5252), 4326)::geography,
   '020-26123456', '24 Hours'),

  ('Quick Meds – Kharadi',
   'Kharadi Bypass, Kharadi, Pune 411014',
   ST_SetSRID(ST_MakePoint(73.9456, 18.5543), 4326)::geography,
   '020-27001234', '8:00 AM – 11:00 PM')
ON CONFLICT DO NOTHING;

-- ─── Inventory: each pharmacy gets a random subset ─────────
-- We use generate_series tricks to seed realistically
DO $$
DECLARE
  pid INTEGER;
  mid INTEGER;
  qty INTEGER;
  prc NUMERIC;
BEGIN
  FOR pid IN SELECT id FROM pharmacies LOOP
    FOR mid IN SELECT id FROM medicines ORDER BY random() LIMIT (20 + floor(random()*15)::int) LOOP
      qty := 5 + floor(random() * 100)::int;
      prc := ROUND((CAST(5 + random() * 195 AS NUMERIC)), 2);
      INSERT INTO inventory (pharmacy_id, medicine_id, quantity, price)
      VALUES (pid, mid, qty, prc)
      ON CONFLICT (pharmacy_id, medicine_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;
