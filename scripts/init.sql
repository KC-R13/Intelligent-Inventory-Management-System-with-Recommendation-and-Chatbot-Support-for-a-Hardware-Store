-- ============================================================
-- Hardware Store Recommender System - Database Initialization
-- ============================================================

DROP DATABASE IF EXISTS hardware_store;
CREATE DATABASE hardware_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hardware_store;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    lead_time_days INT DEFAULT 7,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200)
);

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    category_id INT NOT NULL,
    supplier_id INT NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    sell_price DECIMAL(10,2) NOT NULL,
    reorder_point INT DEFAULT 10,
    reorder_qty INT DEFAULT 50,
    unit VARCHAR(20) DEFAULT 'each',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL UNIQUE,
    quantity_on_hand INT NOT NULL DEFAULT 0,
    quantity_reserved INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity_sold INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    cost_at_sale DECIMAL(10,2) NOT NULL,
    sale_date DATE NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_sale_date (sale_date),
    INDEX idx_product_date (product_id, sale_date)
);

CREATE TABLE recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    rec_type ENUM('high_selling','low_selling','overstocked','understocked','high_profit','restock_alert') NOT NULL,
    score DECIMAL(10,4),
    reason TEXT,
    action_suggestion TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_rec_type (rec_type),
    INDEX idx_generated (generated_at)
);

-- ============================================================
-- SEED: SUPPLIERS
-- ============================================================

INSERT INTO suppliers (name, contact_name, email, phone, lead_time_days) VALUES
('BuildRight Wholesale', 'James Thornton', 'james@buildright.com', '03-9001-1234', 5),
('ProTools Direct', 'Sandra Kim', 'sandra@protools.com', '02-8001-5678', 7),
('FastFixers Supply Co.', 'Mike Nguyen', 'mike@fastfixers.com', '07-3001-9012', 10),
('ElectraStock Australia', 'Rachel Hughes', 'rachel@electrastock.com.au', '08-6001-3456', 6),
('PipeWorks Distributors', 'David Osei', 'david@pipeworks.com.au', '03-8002-7890', 8);

-- ============================================================
-- SEED: CATEGORIES
-- ============================================================

INSERT INTO categories (name, description) VALUES
('Hand Tools', 'Hammers, screwdrivers, pliers, and manual tools'),
('Power Tools', 'Electric drills, saws, grinders, and power equipment'),
('Fasteners', 'Screws, nails, bolts, nuts, and anchors'),
('Plumbing', 'Pipes, fittings, valves, and plumbing supplies'),
('Electrical', 'Cables, switches, sockets, and electrical components'),
('Safety & PPE', 'Gloves, helmets, goggles, and protective gear');

-- ============================================================
-- SEED: PRODUCTS (52 items)
-- ============================================================

INSERT INTO products (sku, name, category_id, supplier_id, cost_price, sell_price, reorder_point, reorder_qty, unit, description) VALUES
-- Hand Tools
('HT-001', 'Claw Hammer 16oz', 1, 1, 8.50, 19.99, 20, 50, 'each', 'Steel head claw hammer with fibreglass handle'),
('HT-002', 'Cross-Peen Hammer 12oz', 1, 1, 7.20, 16.99, 15, 40, 'each', 'Cross-peen hammer for metalwork'),
('HT-003', 'Flathead Screwdriver Set 6pc', 1, 1, 5.40, 12.99, 25, 60, 'set', '6-piece flathead screwdriver set various sizes'),
('HT-004', 'Phillips Screwdriver Set 6pc', 1, 1, 5.60, 13.99, 25, 60, 'set', '6-piece Phillips head screwdriver set'),
('HT-005', 'Combination Pliers 8in', 1, 2, 6.80, 15.99, 20, 50, 'each', 'Heavy-duty combination pliers'),
('HT-006', 'Locking Pliers 10in', 1, 2, 9.20, 21.99, 15, 30, 'each', 'Vise-grip style locking pliers'),
('HT-007', 'Tape Measure 5m', 1, 1, 4.50, 10.99, 30, 80, 'each', 'Retractable steel tape measure'),
('HT-008', 'Tape Measure 8m', 1, 1, 6.20, 14.99, 20, 50, 'each', 'Heavy-duty 8m steel tape measure'),
('HT-009', 'Utility Knife with Blades', 1, 1, 3.80, 8.99, 30, 100, 'each', 'Retractable utility knife + 5 spare blades'),
('HT-010', 'Spirit Level 600mm', 1, 2, 11.50, 26.99, 15, 30, 'each', 'Aluminium spirit level, 3 vials'),
-- Power Tools
('PT-001', 'Cordless Drill 18V', 2, 2, 62.00, 139.99, 10, 20, 'each', '18V cordless drill with 2 batteries and charger'),
('PT-002', 'Angle Grinder 125mm 850W', 2, 2, 48.00, 109.99, 8, 15, 'each', '850W angle grinder with disc guard'),
('PT-003', 'Jigsaw 500W', 2, 2, 55.00, 124.99, 6, 12, 'each', '500W jigsaw variable speed'),
('PT-004', 'Circular Saw 185mm 1200W', 2, 2, 78.00, 179.99, 5, 10, 'each', '1200W circular saw with laser guide'),
('PT-005', 'Random Orbit Sander 125mm', 2, 2, 37.00, 84.99, 10, 20, 'each', '125mm random orbit sander 240W'),
('PT-006', 'Heat Gun 2000W', 2, 3, 29.00, 64.99, 8, 15, 'each', 'Variable temperature heat gun'),
('PT-007', 'Cordless Impact Driver 18V', 2, 2, 71.00, 159.99, 8, 15, 'each', '18V brushless impact driver'),
('PT-008', 'Rotary Hammer Drill 800W', 2, 2, 95.00, 219.99, 5, 8, 'each', '3-mode rotary hammer drill SDS-Plus'),
-- Fasteners
('FA-001', 'Wood Screws 8x50mm 100pk', 3, 3, 3.20, 7.99, 50, 200, 'pack', 'Self-tapping wood screws zinc-plated'),
('FA-002', 'Wood Screws 10x75mm 100pk', 3, 3, 4.10, 9.99, 40, 150, 'pack', 'Self-tapping coarse thread wood screws'),
('FA-003', 'Hex Bolts M8x50mm 50pk', 3, 3, 4.80, 11.99, 30, 100, 'pack', 'Galvanised hex head bolts M8'),
('FA-004', 'Hex Bolts M10x75mm 50pk', 3, 3, 6.20, 14.99, 25, 80, 'pack', 'Galvanised hex head bolts M10'),
('FA-005', 'Nails 75mm 1kg Box', 3, 3, 3.50, 8.49, 40, 120, 'box', 'Round head wire nails 75mm'),
('FA-006', 'Nails 100mm 1kg Box', 3, 3, 3.80, 8.99, 35, 100, 'box', 'Round head wire nails 100mm'),
('FA-007', 'Masonry Anchors M8 50pk', 3, 3, 5.60, 13.49, 30, 80, 'pack', 'Expansion anchors for concrete/masonry'),
('FA-008', 'Stainless Rivets 4mm 100pk', 3, 3, 4.20, 9.99, 25, 80, 'pack', 'Stainless steel blind rivets'),
('FA-009', 'Washers M8 100pk', 3, 3, 2.10, 4.99, 40, 150, 'pack', 'Flat washers M8 zinc-plated'),
('FA-010', 'Nuts M10 50pk', 3, 3, 2.40, 5.99, 35, 120, 'pack', 'Hex nuts M10 galvanised'),
-- Plumbing
('PL-001', 'PVC Pipe 25mm x 3m', 4, 5, 5.80, 13.99, 20, 60, 'length', 'Class 12 PVC pressure pipe'),
('PL-002', 'PVC Pipe 50mm x 3m', 4, 5, 9.40, 21.99, 15, 40, 'length', 'Class 12 PVC pressure pipe 50mm'),
('PL-003', 'PVC Elbow 25mm 90deg', 4, 5, 1.20, 3.49, 50, 200, 'each', 'PVC pressure elbow 25mm 90 degree'),
('PL-004', 'PVC Tee 25mm', 4, 5, 1.40, 3.99, 40, 150, 'each', 'PVC pressure tee fitting 25mm'),
('PL-005', 'Ball Valve 25mm Brass', 4, 5, 8.60, 19.99, 20, 50, 'each', 'Full-bore brass ball valve 25mm BSP'),
('PL-006', 'Flexible Tap Connector 300mm', 4, 5, 4.20, 9.99, 30, 80, 'each', 'Flexible braided tap connector'),
('PL-007', 'Teflon Thread Seal Tape 12mm', 4, 5, 0.90, 2.49, 80, 300, 'each', 'PTFE thread seal tape 12mm x 12m'),
('PL-008', 'Copper Pipe 15mm x 3m', 4, 5, 14.20, 32.99, 10, 30, 'length', 'Copper tube type B 15mm'),
('PL-009', 'Compression Fitting 15mm', 4, 5, 2.80, 6.99, 30, 100, 'each', 'Brass compression coupling 15mm'),
('PL-010', 'Pipe Wrench 14in', 4, 1, 16.40, 37.99, 10, 20, 'each', 'Heavy-duty pipe wrench 14 inch'),
-- Electrical
('EL-001', 'GPO Double Power Point White', 5, 4, 4.80, 11.99, 30, 100, 'each', '10A double power outlet, safety shutters'),
('EL-002', 'Single Light Switch White', 5, 4, 2.60, 6.49, 40, 120, 'each', '10A single pole light switch'),
('EL-003', '2.5mm Twin & Earth Cable 10m', 5, 4, 18.50, 42.99, 15, 40, 'roll', 'Flat TPS cable 2.5mm twin and earth'),
('EL-004', '1.5mm Single Cable Red 10m', 5, 4, 8.20, 18.99, 20, 60, 'roll', '1.5mm single insulated cable, red'),
('EL-005', 'RCD Safety Switch 30mA', 5, 4, 32.00, 74.99, 10, 20, 'each', 'Double pole 30mA RCD safety switch'),
('EL-006', 'Cable Clips 20mm 100pk', 5, 4, 3.10, 7.49, 40, 150, 'pack', 'Plastic snap-in cable clips 20mm'),
('EL-007', 'Wire Connectors 20pk', 5, 4, 2.40, 5.99, 50, 200, 'pack', 'Lever wage connectors assorted 3-5 wire'),
('EL-008', '10A Inline Fuse Holder', 5, 4, 1.80, 4.49, 30, 100, 'each', 'Waterproof inline blade fuse holder'),
('EL-009', 'Conduit 20mm x 3m Grey', 5, 4, 4.10, 9.99, 20, 60, 'length', 'PVC rigid conduit 20mm'),
('EL-010', 'Circuit Breaker 20A Single Pole', 5, 4, 7.60, 17.99, 15, 40, 'each', '20A MCB single pole DIN rail mount'),
-- Safety & PPE
('SF-001', 'Safety Glasses Clear', 6, 3, 2.20, 5.99, 40, 150, 'each', 'Anti-scratch clear safety glasses, ANSI Z87'),
('SF-002', 'Safety Glasses Tinted', 6, 3, 2.50, 6.49, 30, 100, 'each', 'UV400 tinted safety glasses'),
('SF-003', 'Work Gloves Leather XL', 6, 3, 6.80, 15.99, 25, 80, 'pair', 'Full leather work gloves, reinforced palm'),
('SF-004', 'Disposable Dust Masks 20pk', 6, 3, 4.20, 9.99, 30, 100, 'pack', 'P2 dust masks with valve'),
('SF-005', 'Hard Hat White', 6, 3, 11.50, 26.99, 15, 40, 'each', 'Type 1 safety helmet with ratchet harness'),
('SF-006', 'Ear Muffs 25dB', 6, 3, 9.80, 22.99, 20, 50, 'each', 'Over-ear hearing protection 25dB NRR'),
('SF-007', 'High-Vis Vest Orange M/L', 6, 3, 5.20, 12.99, 20, 60, 'each', 'Class D/N hi-vis safety vest'),
('SF-008', 'Safety Boots Steel-Toe Size 10', 6, 3, 52.00, 119.99, 8, 15, 'pair', 'Steel toe cap safety boot, waterproof');

-- ============================================================
-- SEED: INVENTORY
-- ============================================================

INSERT INTO inventory (product_id, quantity_on_hand, quantity_reserved) VALUES
-- Hand Tools (product IDs 1-10)
(1,  85,  5),   -- Claw Hammer  (healthy)
(2,  42,  2),   -- Cross-Peen
(3,  120, 8),   -- Flathead Set (overstocked)
(4,  115, 6),   -- Phillips Set (overstocked)
(5,  55,  4),   -- Combo Pliers
(6,  12,  1),   -- Locking Pliers (near reorder)
(7,  200, 10),  -- Tape 5m (overstocked)
(8,  60,  4),   -- Tape 8m
(9,  180, 15),  -- Utility Knife (overstocked)
(10, 18,  2),   -- Spirit Level
-- Power Tools (11-18)
(11, 22,  3),   -- Cordless Drill
(12, 9,   1),   -- Angle Grinder (understocked)
(13, 5,   0),   -- Jigsaw (understocked - critical)
(14, 4,   0),   -- Circ Saw (understocked - critical)
(15, 18,  2),   -- Orbit Sander
(16, 7,   0),   -- Heat Gun (understocked)
(17, 11,  2),   -- Impact Driver
(18, 3,   0),   -- Rotary Hammer (understocked - critical)
-- Fasteners (19-27)
(19, 280, 20),  -- Wood Screws 8x50 (overstocked)
(20, 190, 15),  -- Wood Screws 10x75
(21, 95,  5),   -- Hex Bolts M8
(22, 75,  5),   -- Hex Bolts M10
(23, 210, 12),  -- Nails 75mm (overstocked)
(24, 130, 8),   -- Nails 100mm
(25, 28,  2),   -- Masonry Anchors (near reorder)
(26, 40,  3),   -- Stainless Rivets
(27, 50,  4),   -- Washers
(28, 60,  3),   -- Nuts M10
-- Plumbing (28-37 -> products 29-38)
(29, 35,  3),   -- PVC Pipe 25mm
(30, 18,  2),   -- PVC Pipe 50mm
(31, 95,  8),   -- PVC Elbow
(32, 70,  5),   -- PVC Tee
(33, 14,  1),   -- Ball Valve (near reorder)
(34, 45,  4),   -- Flex Connector
(35, 320, 20),  -- PTFE Tape (overstocked)
(36, 8,   0),   -- Copper Pipe (understocked)
(37, 55,  4),   -- Compression Fitting
(38, 6,   0),   -- Pipe Wrench (understocked)
-- Electrical (39-48)
(39, 85,  6),   -- Double GPO
(40, 110, 8),   -- Light Switch
(41, 12,  1),   -- TPS Cable (near reorder)
(42, 25,  2),   -- 1.5mm Cable
(43, 7,   0),   -- RCD (understocked)
(44, 130, 10),  -- Cable Clips (overstocked)
(45, 95,  7),   -- Wire Connectors
(46, 65,  5),   -- Fuse Holder
(47, 38,  3),   -- Conduit
(48, 22,  2),   -- Circuit Breaker
-- Safety & PPE (49-56)
(49, 140, 10),  -- Safety Glasses Clear (overstocked)
(50, 88,  6),   -- Safety Glasses Tinted
(51, 45,  3),   -- Work Gloves
(52, 55,  4),   -- Dust Masks
(53, 12,  1),   -- Hard Hat (near reorder)
(54, 18,  1),   -- Ear Muffs
(55, 35,  2),   -- Hi-Vis Vest
(56, 5,   0);   -- Safety Boots (understocked)

-- ============================================================
-- SEED: SALES (12 months of historical data)
-- Using stored procedure for realistic volume
-- ============================================================

DELIMITER $$
DROP PROCEDURE IF EXISTS seed_sales$$
CREATE PROCEDURE seed_sales()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE p_id INT;
    DECLARE cur_date DATE;
    DECLARE qty INT;
    DECLARE multiplier DECIMAL(4,2);

    -- Product-level demand patterns (product_id, weekly_avg_units, variability)
    -- We'll loop through products and generate ~52 weeks of daily data
    
    SET cur_date = DATE_SUB(CURDATE(), INTERVAL 365 DAY);
    
    WHILE cur_date <= CURDATE() DO
        -- ---- HAND TOOLS ----
        IF DAYOFWEEK(cur_date) NOT IN (1,7) THEN -- weekdays only
            -- Claw Hammer (high seller)
            SET qty = FLOOR(3 + RAND()*5);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (1, qty, 19.99, 8.50, cur_date);
            -- Cross-Peen Hammer (moderate)
            IF RAND() > 0.4 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (2, FLOOR(1+RAND()*3), 16.99, 7.20, cur_date);
            END IF;
            -- Flathead Screwdriver Set (very high, overstocked reason)
            SET qty = FLOOR(2 + RAND()*3);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (3, qty, 12.99, 5.40, cur_date);
            -- Phillips Screwdriver Set (high seller)
            SET qty = FLOOR(3 + RAND()*4);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (4, qty, 13.99, 5.60, cur_date);
            -- Combo Pliers (moderate)
            IF RAND() > 0.3 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (5, FLOOR(1+RAND()*3), 15.99, 6.80, cur_date);
            END IF;
            -- Locking Pliers (low seller)
            IF RAND() > 0.75 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (6, 1, 21.99, 9.20, cur_date);
            END IF;
            -- Tape Measure 5m (super high)
            SET qty = FLOOR(4 + RAND()*6);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (7, qty, 10.99, 4.50, cur_date);
            -- Tape Measure 8m (moderate)
            IF RAND() > 0.45 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (8, FLOOR(1+RAND()*3), 14.99, 6.20, cur_date);
            END IF;
            -- Utility Knife (high)
            SET qty = FLOOR(3 + RAND()*5);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (9, qty, 8.99, 3.80, cur_date);
            -- Spirit Level (low)
            IF RAND() > 0.70 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (10, 1, 26.99, 11.50, cur_date);
            END IF;

            -- ---- POWER TOOLS ----
            -- Cordless Drill (very high seller)
            SET qty = FLOOR(2 + RAND()*4);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (11, qty, 139.99, 62.00, cur_date);
            -- Angle Grinder (high)
            IF RAND() > 0.30 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (12, FLOOR(1+RAND()*3), 109.99, 48.00, cur_date);
            END IF;
            -- Jigsaw (moderate)
            IF RAND() > 0.55 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (13, FLOOR(1+RAND()*2), 124.99, 55.00, cur_date);
            END IF;
            -- Circular Saw (moderate-high)
            IF RAND() > 0.45 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (14, FLOOR(1+RAND()*3), 179.99, 78.00, cur_date);
            END IF;
            -- Orbit Sander (moderate)
            IF RAND() > 0.50 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (15, FLOOR(1+RAND()*2), 84.99, 37.00, cur_date);
            END IF;
            -- Heat Gun (low)
            IF RAND() > 0.80 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (16, 1, 64.99, 29.00, cur_date);
            END IF;
            -- Impact Driver (high)
            IF RAND() > 0.35 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (17, FLOOR(1+RAND()*3), 159.99, 71.00, cur_date);
            END IF;
            -- Rotary Hammer (very low)
            IF RAND() > 0.88 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (18, 1, 219.99, 95.00, cur_date);
            END IF;

            -- ---- FASTENERS ----
            -- Wood Screws 8x50 (very high)
            SET qty = FLOOR(5 + RAND()*10);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (19, qty, 7.99, 3.20, cur_date);
            -- Wood Screws 10x75 (high)
            SET qty = FLOOR(3 + RAND()*7);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (20, qty, 9.99, 4.10, cur_date);
            -- Hex Bolts M8 (moderate)
            IF RAND() > 0.30 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (21, FLOOR(1+RAND()*4), 11.99, 4.80, cur_date);
            END IF;
            -- Hex Bolts M10 (moderate)
            IF RAND() > 0.40 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (22, FLOOR(1+RAND()*3), 14.99, 6.20, cur_date);
            END IF;
            -- Nails 75mm (high)
            SET qty = FLOOR(4 + RAND()*8);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (23, qty, 8.49, 3.50, cur_date);
            -- Nails 100mm (high)
            SET qty = FLOOR(3 + RAND()*6);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (24, qty, 8.99, 3.80, cur_date);
            -- Masonry Anchors (moderate)
            IF RAND() > 0.50 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (25, FLOOR(1+RAND()*3), 13.49, 5.60, cur_date);
            END IF;
            -- Stainless Rivets (low)
            IF RAND() > 0.65 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (26, FLOOR(1+RAND()*2), 9.99, 4.20, cur_date);
            END IF;
            -- Washers (moderate)
            IF RAND() > 0.40 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (27, FLOOR(1+RAND()*4), 4.99, 2.10, cur_date);
            END IF;
            -- Nuts M10 (moderate)
            IF RAND() > 0.40 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (28, FLOOR(1+RAND()*3), 5.99, 2.40, cur_date);
            END IF;

            -- ---- PLUMBING ----
            -- PVC Pipe 25mm (high)
            IF RAND() > 0.25 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (29, FLOOR(2+RAND()*5), 13.99, 5.80, cur_date);
            END IF;
            -- PVC Pipe 50mm (moderate)
            IF RAND() > 0.50 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (30, FLOOR(1+RAND()*3), 21.99, 9.40, cur_date);
            END IF;
            -- PVC Elbow (high)
            SET qty = FLOOR(3 + RAND()*7);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (31, qty, 3.49, 1.20, cur_date);
            -- PVC Tee (high)
            SET qty = FLOOR(2 + RAND()*5);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (32, qty, 3.99, 1.40, cur_date);
            -- Ball Valve (moderate)
            IF RAND() > 0.50 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (33, FLOOR(1+RAND()*2), 19.99, 8.60, cur_date);
            END IF;
            -- Flex Connector (moderate)
            IF RAND() > 0.45 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (34, FLOOR(1+RAND()*3), 9.99, 4.20, cur_date);
            END IF;
            -- PTFE Tape (very high)
            SET qty = FLOOR(8 + RAND()*12);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (35, qty, 2.49, 0.90, cur_date);
            -- Copper Pipe (moderate-high but understocked)
            IF RAND() > 0.35 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (36, FLOOR(1+RAND()*3), 32.99, 14.20, cur_date);
            END IF;
            -- Compression Fitting (moderate)
            IF RAND() > 0.45 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (37, FLOOR(1+RAND()*4), 6.99, 2.80, cur_date);
            END IF;
            -- Pipe Wrench (very low)
            IF RAND() > 0.85 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (38, 1, 37.99, 16.40, cur_date);
            END IF;

            -- ---- ELECTRICAL ----
            -- Double GPO (high)
            SET qty = FLOOR(3 + RAND()*6);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (39, qty, 11.99, 4.80, cur_date);
            -- Light Switch (high)
            SET qty = FLOOR(3 + RAND()*5);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (40, qty, 6.49, 2.60, cur_date);
            -- TPS Cable (moderate-high)
            IF RAND() > 0.30 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (41, FLOOR(1+RAND()*3), 42.99, 18.50, cur_date);
            END IF;
            -- 1.5mm Cable (moderate)
            IF RAND() > 0.45 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (42, FLOOR(1+RAND()*3), 18.99, 8.20, cur_date);
            END IF;
            -- RCD (low-moderate specialist item)
            IF RAND() > 0.65 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (43, 1, 74.99, 32.00, cur_date);
            END IF;
            -- Cable Clips (very high volume)
            SET qty = FLOOR(6 + RAND()*8);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (44, qty, 7.49, 3.10, cur_date);
            -- Wire Connectors (very high)
            SET qty = FLOOR(5 + RAND()*8);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (45, qty, 5.99, 2.40, cur_date);
            -- Fuse Holder (low)
            IF RAND() > 0.70 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (46, FLOOR(1+RAND()*2), 4.49, 1.80, cur_date);
            END IF;
            -- Conduit (moderate)
            IF RAND() > 0.45 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (47, FLOOR(1+RAND()*3), 9.99, 4.10, cur_date);
            END IF;
            -- Circuit Breaker (moderate)
            IF RAND() > 0.50 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (48, FLOOR(1+RAND()*2), 17.99, 7.60, cur_date);
            END IF;

            -- ---- SAFETY & PPE ----
            -- Safety Glasses Clear (very high)
            SET qty = FLOOR(4 + RAND()*8);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (49, qty, 5.99, 2.20, cur_date);
            -- Safety Glasses Tinted (high)
            SET qty = FLOOR(3 + RAND()*5);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (50, qty, 6.49, 2.50, cur_date);
            -- Work Gloves (high)
            IF RAND() > 0.30 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (51, FLOOR(1+RAND()*4), 15.99, 6.80, cur_date);
            END IF;
            -- Dust Masks (high)
            SET qty = FLOOR(2 + RAND()*4);
            INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (52, qty, 9.99, 4.20, cur_date);
            -- Hard Hat (low)
            IF RAND() > 0.72 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (53, 1, 26.99, 11.50, cur_date);
            END IF;
            -- Ear Muffs (low-moderate)
            IF RAND() > 0.60 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (54, FLOOR(1+RAND()*2), 22.99, 9.80, cur_date);
            END IF;
            -- Hi-Vis Vest (moderate)
            IF RAND() > 0.50 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (55, FLOOR(1+RAND()*3), 12.99, 5.20, cur_date);
            END IF;
            -- Safety Boots (very low, expensive item)
            IF RAND() > 0.90 THEN
                INSERT INTO sales (product_id, quantity_sold, unit_price, cost_at_sale, sale_date) VALUES (56, 1, 119.99, 52.00, cur_date);
            END IF;
        END IF;
        
        SET cur_date = DATE_ADD(cur_date, INTERVAL 1 DAY);
    END WHILE;
END$$
DELIMITER ;

CALL seed_sales();
DROP PROCEDURE IF EXISTS seed_sales;

-- ============================================================
-- VIEWS for common recommendation queries
-- ============================================================

CREATE OR REPLACE VIEW v_sales_summary AS
SELECT 
    p.id AS product_id,
    p.sku,
    p.name AS product_name,
    c.name AS category,
    p.cost_price,
    p.sell_price,
    (p.sell_price - p.cost_price) AS margin,
    ROUND(((p.sell_price - p.cost_price) / p.sell_price) * 100, 2) AS margin_pct,
    p.reorder_point,
    p.reorder_qty,
    i.quantity_on_hand,
    COALESCE(SUM(s.quantity_sold), 0) AS total_units_sold,
    COALESCE(SUM(s.quantity_sold * s.unit_price), 0) AS total_revenue,
    COALESCE(SUM(s.quantity_sold * (s.unit_price - s.cost_at_sale)), 0) AS total_profit,
    COUNT(DISTINCT s.sale_date) AS active_selling_days
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN inventory i ON p.id = i.product_id
LEFT JOIN sales s ON p.id = s.product_id
WHERE p.is_active = TRUE
GROUP BY p.id, p.sku, p.name, c.name, p.cost_price, p.sell_price, 
         p.reorder_point, p.reorder_qty, i.quantity_on_hand;

CREATE OR REPLACE VIEW v_sales_last_30 AS
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.sell_price,
    p.cost_price,
    i.quantity_on_hand,
    p.reorder_point,
    p.reorder_qty,
    COALESCE(SUM(s.quantity_sold), 0) AS units_30d,
    COALESCE(SUM(s.quantity_sold * s.unit_price), 0) AS revenue_30d,
    COALESCE(SUM(s.quantity_sold * (s.unit_price - s.cost_at_sale)), 0) AS profit_30d
FROM products p
JOIN inventory i ON p.id = i.product_id
LEFT JOIN sales s ON p.id = s.product_id 
    AND s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
WHERE p.is_active = TRUE
GROUP BY p.id, p.name, p.sell_price, p.cost_price, i.quantity_on_hand, p.reorder_point, p.reorder_qty;

CREATE OR REPLACE VIEW v_daily_revenue AS
SELECT 
    sale_date,
    SUM(quantity_sold * unit_price) AS revenue,
    SUM(quantity_sold * (unit_price - cost_at_sale)) AS profit,
    SUM(quantity_sold) AS total_units
FROM sales
GROUP BY sale_date
ORDER BY sale_date;

-- Done!
SELECT 'Database initialized successfully!' AS status;
SELECT COUNT(*) AS total_products FROM products;
SELECT COUNT(*) AS total_sales_records FROM sales;
