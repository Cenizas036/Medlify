ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS owner_user_id INT REFERENCES users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pharmacies_owner_uq ON pharmacies(owner_user_id) WHERE owner_user_id IS NOT NULL;
ALTER TABLE medicines ADD COLUMN IF NOT EXISTS form TEXT, ADD COLUMN IF NOT EXISTS drug_class TEXT, ADD COLUMN IF NOT EXISTS summary TEXT;

DO $$ DECLARE r text; BEGIN
  FOR r IN SELECT DISTINCT grantee FROM information_schema.role_table_grants
           WHERE table_schema='public' AND table_name='users' AND grantee NOT IN ('postgres','PUBLIC')
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON inventory, medicines, pharmacies TO %I', r);
    EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', r);
  END LOOP;
END $$;

UPDATE medicines m SET form = v.form, drug_class = v.cls, summary = v.info
FROM (VALUES
 ('Paracetamol 500mg','tablet','Analgesic and antipyretic','Relieves mild to moderate pain and lowers fever. Gentle on the stomach, but taking more than the label allows can seriously damage the liver.'),
 ('Dolo 650','tablet','Analgesic and antipyretic','A paracetamol brand for fever and mild to moderate pain. Check that no other medicine you take also contains paracetamol.'),
 ('Crocin Advance','tablet','Analgesic and antipyretic','A paracetamol brand for fever and pain relief. Do not combine with other paracetamol products.'),
 ('Ibuprofen 400mg','tablet','NSAID (anti-inflammatory painkiller)','Relieves pain, fever and inflammation. Best taken with food. People with stomach ulcers, kidney problems or asthma should ask a doctor or pharmacist first.'),
 ('Combiflam','tablet','NSAID and analgesic combination','Combines ibuprofen and paracetamol for pain and fever. Take with food and avoid other paracetamol or NSAID products at the same time.'),
 ('Aspirin 75mg','tablet','Antiplatelet (low-dose aspirin)','At this strength aspirin is mainly used on medical advice to help prevent blood clots. It is not a routine painkiller.'),
 ('Metformin 500mg','tablet','Antidiabetic (biguanide)','Helps control blood sugar in type 2 diabetes. Usually taken with meals and monitored by a doctor.'),
 ('Glimepiride 1mg','tablet','Antidiabetic (sulfonylurea)','Lowers blood sugar in type 2 diabetes by helping the body release more insulin. It can cause low blood sugar, so use it only as prescribed.'),
 ('Insulin Glargine 100U/mL','injection','Long-acting insulin','Gives a steady background level of insulin over many hours. Prescribed by a doctor. Unopened pens or vials are usually stored in a refrigerator.'),
 ('Cetirizine 10mg','tablet','Antihistamine','Relieves sneezing, runny nose, itchy eyes and hives caused by allergies. May cause drowsiness in some people.'),
 ('Levocetrizine 5mg','tablet','Antihistamine','Relieves allergy symptoms such as sneezing, runny nose and itching. May cause drowsiness.'),
 ('Montelukast 10mg','tablet','Leukotriene receptor antagonist','Helps prevent asthma symptoms and allergic rhinitis. A prescription medicine; tell a doctor about any mood or behaviour changes.'),
 ('Montair LC','tablet','Montelukast and levocetirizine combination','Combines an asthma and allergy preventer with an antihistamine for allergic rhinitis. Can cause drowsiness. Use on prescription.'),
 ('Omeprazole 20mg','capsule','Proton pump inhibitor (acid reducer)','Reduces stomach acid to treat acidity, heartburn and ulcers. Usually taken before a meal.'),
 ('Pantoprazole 40mg','tablet','Proton pump inhibitor (acid reducer)','Reduces stomach acid to treat acidity, reflux and ulcers. Usually taken before a meal.'),
 ('Ranitidine 150mg','tablet','H2 blocker (acid reducer)','Reduces stomach acid for heartburn and ulcers. Ranitidine has been withdrawn in several countries over impurity concerns, so ask a pharmacist about alternatives.'),
 ('Domperidone 10mg','tablet','Anti-nausea (prokinetic)','Eases nausea, vomiting and bloating by helping the stomach empty. It can affect heart rhythm, so use it only as advised by a doctor.'),
 ('Ondansetron 4mg','tablet','Anti-nausea (5-HT3 blocker)','Prevents and treats nausea and vomiting, for example from infections or chemotherapy.'),
 ('ORS Sachet','sachet','Oral rehydration salts','Replaces water and salts lost through diarrhoea or vomiting. Mix only with the amount of clean water stated on the pack.'),
 ('Pantodac DSR','capsule','Acid reducer and anti-nausea combination','Combines pantoprazole (reduces acid) with domperidone (eases nausea and bloating) for acidity and reflux. Use on prescription.'),
 ('Zinc Sulphate 20mg','tablet','Mineral supplement','A zinc supplement, often used with ORS for diarrhoea in children and for zinc deficiency. Follow the label or medical advice.'),
 ('Vitamin C 500mg','tablet','Vitamin supplement','Supports normal immune function and helps the body absorb iron. It does not cure or reliably prevent colds.'),
 ('Vitamin D3 60K',NULL,'Vitamin supplement','High-strength vitamin D (60,000 IU) used to treat deficiency, taken at intervals set by a doctor. Not intended for daily use.'),
 ('Calcium + D3','tablet','Mineral and vitamin supplement','Supports bone health when diet is low in calcium and vitamin D.'),
 ('Iron + Folic Acid','tablet','Iron supplement (haematinic)','Used to prevent or treat iron-deficiency anaemia, including in pregnancy, on medical advice. Can upset the stomach and darken stools.'),
 ('Clotrimazole Cream','cream','Antifungal','Treats fungal skin infections such as athletes foot and ringworm. Apply only to the affected skin as directed.'),
 ('Mupirocin Ointment','cream','Topical antibiotic','Treats small bacterial skin infections such as impetigo. Usually prescribed; complete the course as directed.')
) AS v(name, form, cls, info) WHERE m.name = v.name;
