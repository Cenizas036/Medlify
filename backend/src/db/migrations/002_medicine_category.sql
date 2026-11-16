ALTER TABLE medicines ADD COLUMN IF NOT EXISTS category TEXT;
UPDATE medicines SET category='pain-relief' WHERE name IN ('Paracetamol 500mg','Ibuprofen 400mg','Dolo 650','Crocin Advance','Combiflam','Aspirin 75mg');
UPDATE medicines SET category='diabetes-care' WHERE name IN ('Metformin 500mg','Glimepiride 1mg','Insulin Glargine 100U/mL');
UPDATE medicines SET category='allergy-care' WHERE name IN ('Cetirizine 10mg','Levocetrizine 5mg','Montelukast 10mg','Montair LC');
UPDATE medicines SET category='digestive-health' WHERE name IN ('Omeprazole 20mg','Pantoprazole 40mg','Ranitidine 150mg','Domperidone 10mg','Ondansetron 4mg','ORS Sachet','Pantodac DSR');
UPDATE medicines SET category='vitamins-supplements' WHERE name IN ('Zinc Sulphate 20mg','Vitamin C 500mg','Vitamin D3 60K','Calcium + D3','Iron + Folic Acid');
UPDATE medicines SET category='first-aid' WHERE name IN ('Clotrimazole Cream','Mupirocin Ointment');
