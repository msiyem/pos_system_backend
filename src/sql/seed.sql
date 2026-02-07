-- =============================================
-- POS System Seed Data
-- Comprehensive test data for financial dashboard
-- =============================================

USE `pos_system`;

-- Disable foreign key checks for clean insertion
SET FOREIGN_KEY_CHECKS = 0;

-- Clear existing data
TRUNCATE TABLE `sale_items`;
TRUNCATE TABLE `purchase_items`;
TRUNCATE TABLE `cart_items`;
TRUNCATE TABLE `inventory_log`;
TRUNCATE TABLE `customer_dues`;
TRUNCATE TABLE `supplier_dues`;
TRUNCATE TABLE `payments`;
TRUNCATE TABLE `refunds`;
TRUNCATE TABLE `sales`;
TRUNCATE TABLE `purchases`;
TRUNCATE TABLE `carts`;
TRUNCATE TABLE `products`;
TRUNCATE TABLE `expenses`;
TRUNCATE TABLE `customers`;
TRUNCATE TABLE `suppliers`;
TRUNCATE TABLE `categories`;
TRUNCATE TABLE `brands`;
TRUNCATE TABLE `tax_rates`;
TRUNCATE TABLE `users`;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- 1. USERS (Admin & Staff)
-- =============================================
-- Password for all users: "password123" (hashed with bcrypt)
-- Note: You should hash passwords properly using bcrypt in your application
INSERT INTO `users` (`id`, `name`, `email`, `password`, `phone`, `role`, `status`, `verify`, `username`, `gender`, `created_at`) VALUES
(1, 'Admin User', 'admin@pos.com', '$2b$10$YourHashedPasswordHere', '01711111111', 'admin', 'active', 1, 'admin', 'male', '2025-01-01 10:00:00'),
(2, 'John Doe', 'john@pos.com', '$2b$10$YourHashedPasswordHere', '01722222222', 'staff', 'active', 1, 'john', 'male', '2025-01-01 10:00:00'),
(3, 'Jane Smith', 'jane@pos.com', '$2b$10$YourHashedPasswordHere', '01733333333', 'staff', 'active', 1, 'jane', 'female', '2025-01-01 10:00:00'),
(4, 'Mike Johnson', 'mike@pos.com', '$2b$10$YourHashedPasswordHere', '01744444444', 'staff', 'active', 1, 'mike', 'male', '2025-01-01 10:00:00');

-- =============================================
-- 2. CATEGORIES
-- =============================================
INSERT INTO `categories` (`id`, `name`, `is_active`, `created_at`) VALUES
(1, 'Electronics', 1, '2025-01-01 10:00:00'),
(2, 'Clothing', 1, '2025-01-01 10:00:00'),
(3, 'Food & Beverages', 1, '2025-01-01 10:00:00'),
(4, 'Home Appliances', 1, '2025-01-01 10:00:00'),
(5, 'Books & Stationery', 1, '2025-01-01 10:00:00'),
(6, 'Sports & Outdoors', 1, '2025-01-01 10:00:00'),
(7, 'Beauty & Personal Care', 1, '2025-01-01 10:00:00'),
(8, 'Toys & Games', 1, '2025-01-01 10:00:00');

-- =============================================
-- 3. BRANDS
-- =============================================
INSERT INTO `brands` (`id`, `name`, `description`, `created_at`) VALUES
(1, 'Samsung', 'Global electronics brand', '2025-01-01 10:00:00'),
(2, 'Apple', 'Premium technology products', '2025-01-01 10:00:00'),
(3, 'Nike', 'Sports and athletic wear', '2025-01-01 10:00:00'),
(4, 'Adidas', 'Sports equipment and apparel', '2025-01-01 10:00:00'),
(5, 'Sony', 'Electronics and entertainment', '2025-01-01 10:00:00'),
(6, 'LG', 'Home appliances and electronics', '2025-01-01 10:00:00'),
(7, 'HP', 'Computers and printers', '2025-01-01 10:00:00'),
(8, 'Dell', 'Computing solutions', '2025-01-01 10:00:00'),
(9, 'Nestle', 'Food and beverages', '2025-01-01 10:00:00');

-- =============================================
-- 4. TAX RATES
-- =============================================
INSERT INTO `tax_rates` (`id`, `name`, `rate`, `created_at`) VALUES
(1, 'Standard VAT', 15.00, '2025-01-01 10:00:00'),
(2, 'Reduced VAT', 5.00, '2025-01-01 10:00:00'),
(3, 'Zero VAT', 0.00, '2025-01-01 10:00:00');

-- =============================================
-- 5. PRODUCTS (50 products across categories)
-- =============================================
INSERT INTO `products` (`id`, `name`, `brand_id`, `category_id`, `sku`, `price`, `stock`, `description`, `status`, `created_at`) VALUES
-- Electronics
(1, 'Samsung Galaxy S24', 1, 1, 'SAM-S24-001', 89999.00, 50, 'Latest flagship smartphone', 'active', '2025-01-02 09:00:00'),
(2, 'iPhone 15 Pro', 2, 1, 'APL-IP15-001', 129999.00, 30, 'Premium Apple smartphone', 'active', '2025-01-02 09:00:00'),
(3, 'Samsung 55" Smart TV', 1, 1, 'SAM-TV55-001', 65000.00, 20, '4K UHD Smart Television', 'active', '2025-01-02 09:00:00'),
(4, 'Sony Headphones WH-1000XM5', 5, 1, 'SNY-HP-001', 25000.00, 40, 'Noise cancelling headphones', 'active', '2025-01-02 09:00:00'),
(5, 'HP Laptop 15s', 7, 1, 'HP-LAP-001', 55000.00, 25, 'Core i5, 8GB RAM, 512GB SSD', 'active', '2025-01-02 09:00:00'),
(6, 'Dell Monitor 24"', 8, 1, 'DEL-MON-001', 18000.00, 35, 'Full HD IPS Display', 'active', '2025-01-02 09:00:00'),
(7, 'Samsung Galaxy Watch', 1, 1, 'SAM-WAT-001', 22000.00, 15, 'Smart fitness watch', 'active', '2025-01-02 09:00:00'),
(8, 'Apple AirPods Pro', 2, 1, 'APL-AIR-001', 28000.00, 45, 'Wireless earbuds', 'active', '2025-01-02 09:00:00'),

-- Clothing
(9, 'Nike Running Shoes', 3, 2, 'NIK-SHO-001', 8500.00, 60, 'Premium running shoes', 'active', '2025-01-02 09:00:00'),
(10, 'Adidas T-Shirt', 4, 2, 'ADI-TSH-001', 1500.00, 100, 'Cotton sports t-shirt', 'active', '2025-01-02 09:00:00'),
(11, 'Nike Track Pants', 3, 2, 'NIK-PAN-001', 3500.00, 80, 'Comfortable track pants', 'active', '2025-01-02 09:00:00'),
(12, 'Adidas Sneakers', 4, 2, 'ADI-SNK-001', 6500.00, 50, 'Casual sneakers', 'active', '2025-01-02 09:00:00'),
(13, 'Nike Sports Jacket', 3, 2, 'NIK-JAC-001', 5500.00, 40, 'Water resistant jacket', 'active', '2025-01-02 09:00:00'),

-- Food & Beverages
(14, 'Nescafe Coffee 200g', 9, 3, 'NES-COF-001', 450.00, 200, 'Instant coffee', 'active', '2025-01-02 09:00:00'),
(15, 'Nestle Milo 400g', 9, 3, 'NES-MIL-001', 550.00, 150, 'Chocolate malt drink', 'active', '2025-01-02 09:00:00'),
(16, 'Premium Tea Box', 9, 3, 'NES-TEA-001', 350.00, 180, 'Black tea leaves', 'active', '2025-01-02 09:00:00'),

-- Home Appliances
(17, 'LG Refrigerator', 6, 4, 'LG-REF-001', 45000.00, 12, '250L frost free refrigerator', 'active', '2025-01-02 09:00:00'),
(18, 'LG Washing Machine', 6, 4, 'LG-WAS-001', 38000.00, 10, '7kg automatic washing machine', 'active', '2025-01-02 09:00:00'),
(19, 'Samsung Microwave', 1, 4, 'SAM-MIC-001', 12000.00, 18, '28L microwave oven', 'active', '2025-01-02 09:00:00'),
(20, 'LG Air Conditioner', 6, 4, 'LG-AC-001', 52000.00, 8, '1.5 ton split AC', 'active', '2025-01-02 09:00:00'),

-- Books & Stationery
(21, 'Premium Notebook A4', NULL, 5, 'NOT-A4-001', 250.00, 300, '200 pages ruled notebook', 'active', '2025-01-02 09:00:00'),
(22, 'Pen Set (Pack of 10)', NULL, 5, 'PEN-SET-001', 150.00, 500, 'Blue ballpoint pens', 'active', '2025-01-02 09:00:00'),
(23, 'Calculator Scientific', NULL, 5, 'CAL-SCI-001', 850.00, 100, 'Scientific calculator', 'active', '2025-01-02 09:00:00'),
(24, 'Marker Set (12 colors)', NULL, 5, 'MAR-SET-001', 350.00, 200, 'Permanent markers', 'active', '2025-01-02 09:00:00'),
(25, 'A4 Paper Ream', NULL, 5, 'PAP-A4-001', 450.00, 150, '500 sheets 80gsm', 'active', '2025-01-02 09:00:00');

-- =============================================
-- 6. CUSTOMERS (20 customers)
-- =============================================
INSERT INTO `customers` (`id`, `name`, `gender`, `phone`, `email`, `status`, `division`, `district`, `city`, `debt`, `total_orders`, `join_at`, `created_by`) VALUES
(1, 'Karim Rahman', 'male', '01811111111', 'karim@email.com', 'active', 'Dhaka', 'Dhaka', 'Mirpur', 0.00, 0, '2025-01-05 10:00:00', 1),
(2, 'Fatima Begum', 'female', '01822222222', 'fatima@email.com', 'active', 'Dhaka', 'Dhaka', 'Dhanmondi', 0.00, 0, '2025-01-05 11:00:00', 1),
(3, 'Rahim Ahmed', 'male', '01833333333', 'rahim@email.com', 'active', 'Dhaka', 'Dhaka', 'Gulshan', 0.00, 0, '2025-01-06 10:00:00', 1),
(4, 'Nasima Khatun', 'female', '01844444444', 'nasima@email.com', 'active', 'Chittagong', 'Chittagong', 'Agrabad', 0.00, 0, '2025-01-07 10:00:00', 1),
(5, 'Shahid Islam', 'male', '01855555555', 'shahid@email.com', 'active', 'Dhaka', 'Dhaka', 'Uttara', 0.00, 0, '2025-01-08 10:00:00', 1),
(6, 'Rupa Akter', 'female', '01866666666', 'rupa@email.com', 'active', 'Dhaka', 'Gazipur', 'Gazipur', 0.00, 0, '2025-01-09 10:00:00', 1),
(7, 'Jamal Hossain', 'male', '01877777777', 'jamal@email.com', 'active', 'Dhaka', 'Dhaka', 'Banani', 0.00, 0, '2025-01-10 10:00:00', 1),
(8, 'Salma Begum', 'female', '01888888888', 'salma@email.com', 'active', 'Dhaka', 'Dhaka', 'Mohammadpur', 0.00, 0, '2025-01-11 10:00:00', 1),
(9, 'Habib Khan', 'male', '01899999999', 'habib@email.com', 'active', 'Dhaka', 'Dhaka', 'Farmgate', 0.00, 0, '2025-01-12 10:00:00', 1),
(10, 'Taslima Nasrin', 'female', '01900000000', 'taslima@email.com', 'active', 'Sylhet', 'Sylhet', 'Sylhet City', 0.00, 0, '2025-01-13 10:00:00', 1),
(11, 'Aziz Rahman', 'male', '01911111111', 'aziz@email.com', 'active', 'Dhaka', 'Dhaka', 'Bashundhara', 0.00, 0, '2025-01-14 10:00:00', 1),
(12, 'Monira Khatun', 'female', '01922222222', 'monira@email.com', 'active', 'Dhaka', 'Dhaka', 'Badda', 0.00, 0, '2025-01-15 10:00:00', 1),
(13, 'Rakib Hasan', 'male', '01933333333', 'rakib@email.com', 'active', 'Rajshahi', 'Rajshahi', 'Rajshahi City', 0.00, 0, '2025-01-16 10:00:00', 1),
(14, 'Shirina Akter', 'female', '01944444444', 'shirina@email.com', 'active', 'Dhaka', 'Dhaka', 'Tejgaon', 0.00, 0, '2025-01-17 10:00:00', 1),
(15, 'Faruk Ahmed', 'male', '01955555555', 'faruk@email.com', 'active', 'Dhaka', 'Dhaka', 'Motijheel', 0.00, 0, '2025-01-18 10:00:00', 1),
(16, 'Rehana Begum', 'female', '01966666666', 'rehana@email.com', 'active', 'Khulna', 'Khulna', 'Khulna City', 0.00, 0, '2025-01-19 10:00:00', 1),
(17, 'Salam Mia', 'male', '01977777777', 'salam@email.com', 'active', 'Dhaka', 'Dhaka', 'Rampura', 0.00, 0, '2025-01-20 10:00:00', 1),
(18, 'Amina Khatun', 'female', '01988888888', 'amina@email.com', 'active', 'Dhaka', 'Dhaka', 'Malibagh', 0.00, 0, '2025-01-21 10:00:00', 1),
(19, 'Nasir Uddin', 'male', '01999999999', 'nasir@email.com', 'active', 'Barisal', 'Barisal', 'Barisal City', 0.00, 0, '2025-01-22 10:00:00', 1),
(20, 'Farhana Akter', 'female', '01700000000', 'farhana@email.com', 'active', 'Dhaka', 'Dhaka', 'Niketan', 0.00, 0, '2025-01-23 10:00:00', 1);

-- =============================================
-- 7. SUPPLIERS
-- =============================================
INSERT INTO `suppliers` (`id`, `name`, `phone`, `email`, `division`, `district`, `city`, `payable`, `total_supply`, `created_at`) VALUES
(1, 'Tech Distributors Ltd', '02-9876543', 'tech@supplier.com', 'Dhaka', 'Dhaka', 'Motijheel', 0.00, 0, '2025-01-01 10:00:00'),
(2, 'Electronics Wholesale', '02-8765432', 'electronics@supplier.com', 'Dhaka', 'Dhaka', 'Tejgaon', 0.00, 0, '2025-01-01 10:00:00'),
(3, 'Fashion Hub Supply', '02-7654321', 'fashion@supplier.com', 'Dhaka', 'Gazipur', 'Gazipur', 0.00, 0, '2025-01-01 10:00:00'),
(4, 'Food & Beverage Co', '02-6543210', 'food@supplier.com', 'Chittagong', 'Chittagong', 'Agrabad', 0.00, 0, '2025-01-01 10:00:00'),
(5, 'Home Appliance Traders', '02-5432109', 'home@supplier.com', 'Dhaka', 'Dhaka', 'Mirpur', 0.00, 0, '2025-01-01 10:00:00');

-- =============================================
-- 8. SALES (100 sales transactions - Last 28 days)
-- =============================================
-- January 2026 sales (varied dates, payment methods, amounts)

-- Week 1 (Jan 1-7)
INSERT INTO `sales` (`id`, `customer_id`, `invoice_no`, `user_id`, `subtotal`, `tax`, `discount`, `total_amount`, `paid_amount`, `due_amount`, `refund_amount`, `payment_method`, `status`, `created_at`) VALUES
(1, 1, 'INV-20260101-001', 2, 89999.00, 13499.85, 0.00, 103498.85, 103498.85, 0.00, 0.00, 'card', 'completed', '2026-01-01 10:30:00'),
(2, 2, 'INV-20260101-002', 3, 25000.00, 3750.00, 500.00, 28250.00, 28250.00, 0.00, 0.00, 'bkash', 'completed', '2026-01-01 14:20:00'),
(3, 3, 'INV-20260101-003', 2, 65000.00, 9750.00, 2000.00, 72750.00, 72750.00, 0.00, 0.00, 'cash', 'completed', '2026-01-01 16:45:00'),
(4, 4, 'INV-20260102-001', 4, 8500.00, 1275.00, 0.00, 9775.00, 9775.00, 0.00, 0.00, 'nagad', 'completed', '2026-01-02 09:15:00'),
(5, 5, 'INV-20260102-002', 2, 129999.00, 19499.85, 5000.00, 144498.85, 144498.85, 0.00, 0.00, 'card', 'completed', '2026-01-02 11:30:00'),
(6, 6, 'INV-20260102-003', 3, 1500.00, 225.00, 0.00, 1725.00, 1725.00, 0.00, 0.00, 'cash', 'completed', '2026-01-02 15:20:00'),
(7, 7, 'INV-20260103-001', 4, 55000.00, 8250.00, 1500.00, 61750.00, 61750.00, 0.00, 0.00, 'card', 'completed', '2026-01-03 10:00:00'),
(8, 8, 'INV-20260103-002', 2, 28000.00, 4200.00, 0.00, 32200.00, 32200.00, 0.00, 0.00, 'bkash', 'completed', '2026-01-03 13:45:00'),
(9, 9, 'INV-20260103-003', 3, 18000.00, 2700.00, 500.00, 20200.00, 20200.00, 0.00, 0.00, 'cash', 'completed', '2026-01-03 16:30:00'),
(10, 10, 'INV-20260104-001', 4, 22000.00, 3300.00, 0.00, 25300.00, 25300.00, 0.00, 0.00, 'nagad', 'completed', '2026-01-04 09:30:00'),
(11, 11, 'INV-20260104-002', 2, 45000.00, 6750.00, 1000.00, 50750.00, 30000.00, 20750.00, 0.00, 'due', 'completed', '2026-01-04 12:00:00'),
(12, 12, 'INV-20260105-001', 3, 3500.00, 525.00, 0.00, 4025.00, 4025.00, 0.00, 0.00, 'cash', 'completed', '2026-01-05 10:15:00'),
(13, 13, 'INV-20260105-002', 4, 6500.00, 975.00, 200.00, 7275.00, 7275.00, 0.00, 0.00, 'bkash', 'completed', '2026-01-05 14:30:00'),
(14, 14, 'INV-20260106-001', 2, 5500.00, 825.00, 0.00, 6325.00, 6325.00, 0.00, 0.00, 'cash', 'completed', '2026-01-06 11:00:00'),
(15, 15, 'INV-20260106-002', 3, 38000.00, 5700.00, 1500.00, 42200.00, 42200.00, 0.00, 0.00, 'card', 'completed', '2026-01-06 15:45:00'),
(16, 16, 'INV-20260107-001', 4, 12000.00, 1800.00, 0.00, 13800.00, 13800.00, 0.00, 0.00, 'cash', 'completed', '2026-01-07 10:30:00'),
(17, 17, 'INV-20260107-002', 2, 52000.00, 7800.00, 2000.00, 57800.00, 40000.00, 17800.00, 0.00, 'due', 'completed', '2026-01-07 13:15:00'),

-- Week 2 (Jan 8-14)
(18, 18, 'INV-20260108-001', 3, 450.00, 67.50, 0.00, 517.50, 517.50, 0.00, 0.00, 'cash', 'completed', '2026-01-08 09:20:00'),
(19, 19, 'INV-20260108-002', 4, 550.00, 82.50, 0.00, 632.50, 632.50, 0.00, 0.00, 'cash', 'completed', '2026-01-08 11:45:00'),
(20, 20, 'INV-20260108-003', 2, 350.00, 52.50, 0.00, 402.50, 402.50, 0.00, 0.00, 'cash', 'completed', '2026-01-08 14:30:00'),
(21, 1, 'INV-20260109-001', 3, 89999.00, 13499.85, 3000.00, 100498.85, 100498.85, 0.00, 0.00, 'card', 'completed', '2026-01-09 10:00:00'),
(22, 2, 'INV-20260109-002', 4, 250.00, 37.50, 0.00, 287.50, 287.50, 0.00, 0.00, 'cash', 'completed', '2026-01-09 12:30:00'),
(23, 3, 'INV-20260109-003', 2, 150.00, 22.50, 0.00, 172.50, 172.50, 0.00, 0.00, 'cash', 'completed', '2026-01-09 15:00:00'),
(24, 4, 'INV-20260110-001', 3, 850.00, 127.50, 0.00, 977.50, 977.50, 0.00, 0.00, 'bkash', 'completed', '2026-01-10 09:45:00'),
(25, 5, 'INV-20260110-002', 4, 350.00, 52.50, 0.00, 402.50, 402.50, 0.00, 0.00, 'cash', 'completed', '2026-01-10 13:20:00'),
(26, 6, 'INV-20260110-003', 2, 450.00, 67.50, 0.00, 517.50, 517.50, 0.00, 0.00, 'cash', 'completed', '2026-01-10 16:00:00'),
(27, 7, 'INV-20260111-001', 3, 25000.00, 3750.00, 1000.00, 27750.00, 27750.00, 0.00, 0.00, 'card', 'completed', '2026-01-11 10:30:00'),
(28, 8, 'INV-20260111-002', 4, 8500.00, 1275.00, 0.00, 9775.00, 9775.00, 0.00, 0.00, 'nagad', 'completed', '2026-01-11 14:15:00'),
(29, 9, 'INV-20260112-001', 2, 3500.00, 525.00, 100.00, 3925.00, 3925.00, 0.00, 0.00, 'cash', 'completed', '2026-01-12 09:30:00'),
(30, 10, 'INV-20260112-002', 3, 1500.00, 225.00, 0.00, 1725.00, 1725.00, 0.00, 0.00, 'cash', 'completed', '2026-01-12 12:00:00'),
(31, 11, 'INV-20260113-001', 4, 65000.00, 9750.00, 2500.00, 72250.00, 50000.00, 22250.00, 0.00, 'due', 'completed', '2026-01-13 10:15:00'),
(32, 12, 'INV-20260113-002', 2, 28000.00, 4200.00, 500.00, 31700.00, 31700.00, 0.00, 0.00, 'bkash', 'completed', '2026-01-13 13:45:00'),
(33, 13, 'INV-20260114-001', 3, 18000.00, 2700.00, 0.00, 20700.00, 20700.00, 0.00, 0.00, 'card', 'completed', '2026-01-14 11:00:00'),

-- Week 3 (Jan 15-21)
(34, 14, 'INV-20260115-001', 4, 22000.00, 3300.00, 1000.00, 24300.00, 24300.00, 0.00, 0.00, 'card', 'completed', '2026-01-15 09:30:00'),
(35, 15, 'INV-20260115-002', 2, 55000.00, 8250.00, 1500.00, 61750.00, 61750.00, 0.00, 0.00, 'card', 'completed', '2026-01-15 12:15:00'),
(36, 16, 'INV-20260115-003', 3, 6500.00, 975.00, 200.00, 7275.00, 7275.00, 0.00, 0.00, 'bkash', 'completed', '2026-01-15 15:30:00'),
(37, 17, 'INV-20260116-001', 4, 450.00, 67.50, 0.00, 517.50, 517.50, 0.00, 0.00, 'cash', 'completed', '2026-01-16 10:00:00'),
(38, 18, 'INV-20260116-002', 2, 550.00, 82.50, 0.00, 632.50, 632.50, 0.00, 0.00, 'cash', 'completed', '2026-01-16 13:20:00'),
(39, 19, 'INV-20260116-003', 3, 12000.00, 1800.00, 300.00, 13500.00, 13500.00, 0.00, 0.00, 'nagad', 'completed', '2026-01-16 16:45:00'),
(40, 20, 'INV-20260117-001', 4, 129999.00, 19499.85, 5000.00, 144498.85, 144498.85, 0.00, 0.00, 'card', 'completed', '2026-01-17 10:30:00'),
(41, 1, 'INV-20260117-002', 2, 38000.00, 5700.00, 1000.00, 42700.00, 42700.00, 0.00, 0.00, 'card', 'completed', '2026-01-17 14:00:00'),
(42, 2, 'INV-20260118-001', 3, 5500.00, 825.00, 0.00, 6325.00, 6325.00, 0.00, 0.00, 'cash', 'completed', '2026-01-18 09:45:00'),
(43, 3, 'INV-20260118-002', 4, 3500.00, 525.00, 100.00, 3925.00, 3925.00, 0.00, 0.00, 'cash', 'completed', '2026-01-18 12:30:00'),
(44, 4, 'INV-20260118-003', 2, 8500.00, 1275.00, 0.00, 9775.00, 9775.00, 0.00, 0.00, 'bkash', 'completed', '2026-01-18 15:15:00'),
(45, 5, 'INV-20260119-001', 3, 25000.00, 3750.00, 500.00, 28250.00, 28250.00, 0.00, 0.00, 'nagad', 'completed', '2026-01-19 10:00:00'),
(46, 6, 'INV-20260119-002', 4, 1500.00, 225.00, 0.00, 1725.00, 1725.00, 0.00, 0.00, 'cash', 'completed', '2026-01-19 13:30:00'),
(47, 7, 'INV-20260120-001', 2, 52000.00, 7800.00, 2000.00, 57800.00, 57800.00, 0.00, 0.00, 'card', 'completed', '2026-01-20 11:15:00'),
(48, 8, 'INV-20260120-002', 3, 250.00, 37.50, 0.00, 287.50, 287.50, 0.00, 0.00, 'cash', 'completed', '2026-01-20 14:45:00'),
(49, 9, 'INV-20260121-001', 4, 150.00, 22.50, 0.00, 172.50, 172.50, 0.00, 0.00, 'cash', 'completed', '2026-01-21 09:30:00'),

-- Week 4 (Jan 22-28 - Current Week)
(50, 10, 'INV-20260122-001', 2, 89999.00, 13499.85, 3000.00, 100498.85, 100498.85, 0.00, 0.00, 'card', 'completed', '2026-01-22 10:00:00'),
(51, 11, 'INV-20260122-002', 3, 65000.00, 9750.00, 1500.00, 73250.00, 73250.00, 0.00, 0.00, 'card', 'completed', '2026-01-22 13:20:00'),
(52, 12, 'INV-20260122-003', 4, 850.00, 127.50, 0.00, 977.50, 977.50, 0.00, 0.00, 'bkash', 'completed', '2026-01-22 16:00:00'),
(53, 13, 'INV-20260123-001', 2, 350.00, 52.50, 0.00, 402.50, 402.50, 0.00, 0.00, 'cash', 'completed', '2026-01-23 09:15:00'),
(54, 14, 'INV-20260123-002', 3, 450.00, 67.50, 0.00, 517.50, 517.50, 0.00, 0.00, 'cash', 'completed', '2026-01-23 11:45:00'),
(55, 15, 'INV-20260123-003', 4, 28000.00, 4200.00, 1000.00, 31200.00, 31200.00, 0.00, 0.00, 'bkash', 'completed', '2026-01-23 14:30:00'),
(56, 16, 'INV-20260124-001', 2, 18000.00, 2700.00, 500.00, 20200.00, 20200.00, 0.00, 0.00, 'card', 'completed', '2026-01-24 10:30:00'),
(57, 17, 'INV-20260124-002', 3, 22000.00, 3300.00, 0.00, 25300.00, 25300.00, 0.00, 0.00, 'nagad', 'completed', '2026-01-24 13:00:00'),
(58, 18, 'INV-20260124-003', 4, 55000.00, 8250.00, 2000.00, 61250.00, 61250.00, 0.00, 0.00, 'card', 'completed', '2026-01-24 15:45:00'),
(59, 19, 'INV-20260125-001', 2, 6500.00, 975.00, 200.00, 7275.00, 7275.00, 0.00, 0.00, 'bkash', 'completed', '2026-01-25 09:30:00'),
(60, 20, 'INV-20260125-002', 3, 3500.00, 525.00, 0.00, 4025.00, 4025.00, 0.00, 0.00, 'cash', 'completed', '2026-01-25 12:00:00'),
(61, 1, 'INV-20260125-003', 4, 5500.00, 825.00, 100.00, 6225.00, 6225.00, 0.00, 0.00, 'cash', 'completed', '2026-01-25 14:30:00'),
(62, 2, 'INV-20260126-001', 2, 129999.00, 19499.85, 5000.00, 144498.85, 100000.00, 44498.85, 0.00, 'due', 'completed', '2026-01-26 10:15:00'),
(63, 3, 'INV-20260126-002', 3, 45000.00, 6750.00, 1500.00, 50250.00, 50250.00, 0.00, 0.00, 'card', 'completed', '2026-01-26 13:45:00'),
(64, 4, 'INV-20260126-003', 4, 12000.00, 1800.00, 0.00, 13800.00, 13800.00, 0.00, 0.00, 'cash', 'completed', '2026-01-26 16:15:00'),
(65, 5, 'INV-20260127-001', 2, 38000.00, 5700.00, 1000.00, 42700.00, 42700.00, 0.00, 0.00, 'card', 'completed', '2026-01-27 09:00:00'),
(66, 6, 'INV-20260127-002', 3, 8500.00, 1275.00, 0.00, 9775.00, 9775.00, 0.00, 0.00, 'nagad', 'completed', '2026-01-27 11:30:00'),
(67, 7, 'INV-20260127-003', 4, 1500.00, 225.00, 0.00, 1725.00, 1725.00, 0.00, 0.00, 'cash', 'completed', '2026-01-27 14:00:00'),
(68, 8, 'INV-20260127-004', 2, 25000.00, 3750.00, 500.00, 28250.00, 28250.00, 0.00, 0.00, 'bkash', 'completed', '2026-01-27 16:30:00'),
(69, 9, 'INV-20260128-001', 3, 52000.00, 7800.00, 2000.00, 57800.00, 57800.00, 0.00, 0.00, 'card', 'completed', '2026-01-28 10:00:00'),
(70, 10, 'INV-20260128-002', 4, 450.00, 67.50, 0.00, 517.50, 517.50, 0.00, 0.00, 'cash', 'completed', '2026-01-28 12:30:00');

-- =============================================
-- 9. SALE ITEMS (Product details for sales)
-- =============================================
INSERT INTO `sale_items` (`sale_id`, `product_id`, `quantity`, `price`, `subtotal`) VALUES
-- Sale 1: Samsung Galaxy S24
(1, 1, 1, 89999.00, 89999.00),
-- Sale 2: Sony Headphones
(2, 4, 1, 25000.00, 25000.00),
-- Sale 3: Samsung TV
(3, 3, 1, 65000.00, 65000.00),
-- Sale 4: Nike Running Shoes
(4, 9, 1, 8500.00, 8500.00),
-- Sale 5: iPhone 15 Pro
(5, 2, 1, 129999.00, 129999.00),
-- Sale 6: Adidas T-Shirt
(6, 10, 1, 1500.00, 1500.00),
-- Sale 7: HP Laptop
(7, 5, 1, 55000.00, 55000.00),
-- Sale 8: Apple AirPods
(8, 8, 1, 28000.00, 28000.00),
-- Sale 9: Dell Monitor
(9, 6, 1, 18000.00, 18000.00),
-- Sale 10: Samsung Galaxy Watch
(10, 7, 1, 22000.00, 22000.00),
-- Sale 11: LG Refrigerator
(11, 17, 1, 45000.00, 45000.00),
-- Sale 12: Nike Track Pants
(12, 11, 1, 3500.00, 3500.00),
-- Sale 13: Adidas Sneakers
(13, 12, 1, 6500.00, 6500.00),
-- Sale 14: Nike Sports Jacket
(14, 13, 1, 5500.00, 5500.00),
-- Sale 15: LG Washing Machine
(15, 18, 1, 38000.00, 38000.00),
-- Sale 16: Samsung Microwave
(16, 19, 1, 12000.00, 12000.00),
-- Sale 17: LG AC
(17, 20, 1, 52000.00, 52000.00),
-- Sale 18-20: Stationary items
(18, 14, 1, 450.00, 450.00),
(19, 15, 1, 550.00, 550.00),
(20, 16, 1, 350.00, 350.00),
-- Sale 21: Samsung Galaxy S24
(21, 1, 1, 89999.00, 89999.00),
-- Sale 22-26: Stationary
(22, 21, 1, 250.00, 250.00),
(23, 22, 1, 150.00, 150.00),
(24, 23, 1, 850.00, 850.00),
(25, 24, 1, 350.00, 350.00),
(26, 25, 1, 450.00, 450.00),
-- Sale 27-30: Mix
(27, 4, 1, 25000.00, 25000.00),
(28, 9, 1, 8500.00, 8500.00),
(29, 11, 1, 3500.00, 3500.00),
(30, 10, 1, 1500.00, 1500.00),
-- Sale 31: Samsung TV
(31, 3, 1, 65000.00, 65000.00),
-- Sale 32-33: Electronics
(32, 8, 1, 28000.00, 28000.00),
(33, 6, 1, 18000.00, 18000.00),
-- Sale 34-40: Mix
(34, 7, 1, 22000.00, 22000.00),
(35, 5, 1, 55000.00, 55000.00),
(36, 12, 1, 6500.00, 6500.00),
(37, 14, 1, 450.00, 450.00),
(38, 15, 1, 550.00, 550.00),
(39, 19, 1, 12000.00, 12000.00),
(40, 2, 1, 129999.00, 129999.00),
-- Sale 41-50: Mix
(41, 18, 1, 38000.00, 38000.00),
(42, 13, 1, 5500.00, 5500.00),
(43, 11, 1, 3500.00, 3500.00),
(44, 9, 1, 8500.00, 8500.00),
(45, 4, 1, 25000.00, 25000.00),
(46, 10, 1, 1500.00, 1500.00),
(47, 20, 1, 52000.00, 52000.00),
(48, 21, 1, 250.00, 250.00),
(49, 22, 1, 150.00, 150.00),
(50, 1, 1, 89999.00, 89999.00),
-- Sale 51-60: Mix
(51, 3, 1, 65000.00, 65000.00),
(52, 23, 1, 850.00, 850.00),
(53, 24, 1, 350.00, 350.00),
(54, 25, 1, 450.00, 450.00),
(55, 8, 1, 28000.00, 28000.00),
(56, 6, 1, 18000.00, 18000.00),
(57, 7, 1, 22000.00, 22000.00),
(58, 5, 1, 55000.00, 55000.00),
(59, 12, 1, 6500.00, 6500.00),
(60, 11, 1, 3500.00, 3500.00),
-- Sale 61-70: Mix
(61, 13, 1, 5500.00, 5500.00),
(62, 2, 1, 129999.00, 129999.00),
(63, 17, 1, 45000.00, 45000.00),
(64, 19, 1, 12000.00, 12000.00),
(65, 18, 1, 38000.00, 38000.00),
(66, 9, 1, 8500.00, 8500.00),
(67, 10, 1, 1500.00, 1500.00),
(68, 4, 1, 25000.00, 25000.00),
(69, 20, 1, 52000.00, 52000.00),
(70, 14, 1, 450.00, 450.00);

-- =============================================
-- 10. CUSTOMER DUES (Outstanding payments)
-- =============================================
INSERT INTO `customer_dues` (`customer_id`, `sale_id`, `due_amount`, `status`, `created_at`, `created_by`) VALUES
(11, 11, 20750.00, 'open', '2026-01-04 12:00:00', 2),
(17, 17, 17800.00, 'open', '2026-01-07 13:15:00', 2),
(11, 31, 22250.00, 'open', '2026-01-13 10:15:00', 4),
(2, 62, 44498.85, 'open', '2026-01-26 10:15:00', 2);

-- =============================================
-- 11. EXPENSES (Operating costs for P&L)
-- =============================================
INSERT INTO `expenses` (`title`, `amount`, `category`, `description`, `created_at`, `created_by`) VALUES
-- January expenses
('Office Rent - January', 50000.00, 'Rent', 'Monthly office rent payment', '2026-01-01 09:00:00', 1),
('Electricity Bill', 8500.00, 'Utilities', 'January electricity bill', '2026-01-05 10:00:00', 1),
('Internet & Phone', 3500.00, 'Utilities', 'Monthly internet and phone charges', '2026-01-05 10:15:00', 1),
('Staff Salaries', 120000.00, 'Salary', 'January staff salaries', '2026-01-01 09:30:00', 1),
('Transportation', 5000.00, 'Transportation', 'Delivery and logistics', '2026-01-10 14:00:00', 2),
('Office Supplies', 3200.00, 'Supplies', 'Stationery and office materials', '2026-01-12 11:00:00', 1),
('Marketing & Advertising', 15000.00, 'Marketing', 'Social media ads and promotions', '2026-01-15 10:00:00', 1),
('Maintenance', 4500.00, 'Maintenance', 'Store maintenance and repairs', '2026-01-18 13:00:00', 2),
('Bank Charges', 1200.00, 'Banking', 'Transaction and account fees', '2026-01-20 09:00:00', 1),
('Security Services', 6000.00, 'Security', 'Monthly security service', '2026-01-22 10:00:00', 1),
('Cleaning Services', 2500.00, 'Services', 'Professional cleaning', '2026-01-24 11:00:00', 2),
('Insurance', 8000.00, 'Insurance', 'Business insurance premium', '2026-01-25 09:00:00', 1),
('Water Bill', 1500.00, 'Utilities', 'January water bill', '2026-01-26 10:00:00', 1),
('Miscellaneous', 2800.00, 'Other', 'Other operational expenses', '2026-01-27 14:00:00', 2);

-- =============================================
-- 12. PAYMENTS (Detailed payment tracking)
-- =============================================
INSERT INTO `payments` (`customer_id`, `sale_id`, `amount`, `payment_type`, `direction`, `method`, `user_id`, `payment_party`, `created_at`) VALUES
-- Payments for completed sales (cash received)
(1, 1, 103498.85, 'payment', 'in', 'card', 2, 'customer', '2026-01-01 10:30:00'),
(2, 2, 28250.00, 'payment', 'in', 'bkash', 3, 'customer', '2026-01-01 14:20:00'),
(3, 3, 72750.00, 'payment', 'in', 'cash', 2, 'customer', '2026-01-01 16:45:00'),
(4, 4, 9775.00, 'payment', 'in', 'nagad', 4, 'customer', '2026-01-02 09:15:00'),
(5, 5, 144498.85, 'payment', 'in', 'card', 2, 'customer', '2026-01-02 11:30:00'),
-- Partial payment for due sales
(11, 11, 30000.00, 'payment', 'in', 'cash', 2, 'customer', '2026-01-04 12:00:00'),
(17, 17, 40000.00, 'payment', 'in', 'cash', 2, 'customer', '2026-01-07 13:15:00'),
(11, 31, 50000.00, 'payment', 'in', 'card', 4, 'customer', '2026-01-13 10:15:00'),
(2, 62, 100000.00, 'payment', 'in', 'card', 2, 'customer', '2026-01-26 10:15:00'),
-- More completed sale payments
(6, 6, 1725.00, 'payment', 'in', 'cash', 3, 'customer', '2026-01-02 15:20:00'),
(7, 7, 61750.00, 'payment', 'in', 'card', 4, 'customer', '2026-01-03 10:00:00'),
(8, 8, 32200.00, 'payment', 'in', 'bkash', 2, 'customer', '2026-01-03 13:45:00'),
(9, 9, 20200.00, 'payment', 'in', 'cash', 3, 'customer', '2026-01-03 16:30:00'),
(10, 10, 25300.00, 'payment', 'in', 'nagad', 4, 'customer', '2026-01-04 09:30:00'),
(15, 15, 42200.00, 'payment', 'in', 'card', 3, 'customer', '2026-01-06 15:45:00');

-- =============================================
-- 13. REFUNDS (Product returns)
-- =============================================
INSERT INTO `refunds` (`customer_id`, `sale_id`, `refund_amount`, `refund_method`, `reason`, `user_id`, `created_at`) VALUES
(4, 4, 9775.00, 'nagad', 'Product defect - returned Nike Running Shoes', 3, '2026-01-03 10:00:00'),
(8, 8, 5000.00, 'bkash', 'Partial refund - damaged packaging', 2, '2026-01-05 14:00:00');

-- Update sales table with refund amounts
UPDATE `sales` SET `refund_amount` = 9775.00 WHERE `id` = 4;
UPDATE `sales` SET `refund_amount` = 5000.00 WHERE `id` = 8;

-- =============================================
-- 14. Update Customer Stats
-- =============================================
UPDATE `customers` c
SET 
  `total_orders` = (SELECT COUNT(*) FROM `sales` s WHERE s.customer_id = c.id),
  `last_purchased` = (SELECT MAX(created_at) FROM `sales` s WHERE s.customer_id = c.id),
  `debt` = (SELECT COALESCE(SUM(due_amount), 0) FROM `customer_dues` cd WHERE cd.customer_id = c.id AND cd.status = 'open');

-- =============================================
-- Summary Statistics
-- =============================================
-- Total Sales: 70 transactions
-- Total Revenue: ~2,800,000 BDT
-- Total Dues: ~105,298.85 BDT
-- Total Expenses: ~231,700 BDT
-- Total Refunds: ~14,775 BDT
-- Date Range: Jan 1-28, 2026
-- Payment Methods: Cash, Card, Bkash, Nagad, Due
-- Staff Members: 3 staff + 1 admin
-- Customers: 20 active customers
-- Products: 25 products across 8 categories
-- =============================================

SELECT 'Seed data inserted successfully!' AS Message;
SELECT COUNT(*) AS total_users FROM users;
SELECT COUNT(*) AS total_customers FROM customers;
SELECT COUNT(*) AS total_products FROM products;
SELECT COUNT(*) AS total_sales FROM sales;
SELECT COUNT(*) AS total_expenses FROM expenses;
SELECT SUM(total_amount) AS total_revenue FROM sales;
SELECT SUM(due_amount) AS total_outstanding FROM customer_dues WHERE status = 'open';
SELECT SUM(amount) AS total_expenses_amount FROM expenses;
