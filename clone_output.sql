-- ══════════════════════════════════════════════════════════
-- Clone dữ liệu từ port 6002 vào D1
-- Generated: 2026-09-06T09:43:19.275Z
-- ══════════════════════════════════════════════════════════

-- Xóa dữ liệu cũ
DELETE FROM order_item_toppings;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM category_toppings;
DELETE FROM product_sizes;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM tables;
DELETE FROM users;
DELETE FROM sessions;
DELETE FROM settings;
DELETE FROM staff_calls;
DELETE FROM zalo_notification_logs;

-- Categories (13 rows)
INSERT INTO categories (id, store_id, name, sort_order, production_unit, allow_all_toppings) VALUES (1, 1, 'Chè', 0, 'counter', 0);
INSERT INTO categories (id, store_id, name, sort_order, production_unit, allow_all_toppings) VALUES (2, 1, 'Trà Sữa', 1, 'counter', 0);
INSERT INTO categories (id, store_id, name, sort_order, production_unit, allow_all_toppings) VALUES (3, 1, 'Sữa Chua', 2, 'counter', 1);
INSERT INTO categories (id, store_id, name, sort_order, production_unit, allow_all_toppings) VALUES (4, 1, 'Tàu Hũ', 3, 'counter', 0);
INSERT INTO categories (id, store_id, name, sort_order, production_unit, allow_all_toppings) VALUES (6, 1, 'Trà Hoa Quả', 4, 'counter', 1);
INSERT INTO categories (id, store_id, name, sort_order, production_unit, allow_all_toppings) VALUES (10, 1, 'Bơ', 5, 'counter', 1);
INSERT INTO categories (id, store_id, name, sort_order, production_unit, allow_all_toppings) VALUES (5, 1, 'Đồ Ăn Vặt', 6, 'kitchen', 0);
INSERT INTO categories (id, store_id, name, sort_order, production_unit, allow_all_toppings) VALUES (7, 1, 'Mì Cay 7 Cấp Độ', 7, 'kitchen', 0);
INSERT INTO categories (id, store_id, name, sort_order, production_unit, allow_all_toppings) VALUES (8, 1, 'Bánh Mì Chảo', 8, 'kitchen', 0);
INSERT INTO categories (id, store_id, name, sort_order, production_unit, allow_all_toppings) VALUES (9, 1, 'Topping', 9, 'kitchen', 1);
INSERT INTO categories (id, store_id, name, sort_order, production_unit, allow_all_toppings) VALUES (11, 1, 'Báo bếp', 10, 'kitchen', 1);
INSERT INTO categories (id, store_id, name, sort_order, production_unit, allow_all_toppings) VALUES (12, 1, 'Nước Dừa', 11, 'counter', 1);
INSERT INTO categories (id, store_id, name, sort_order, production_unit, allow_all_toppings) VALUES (13, 1, 'Đồ uống chai', 12, 'counter', 1);

-- Products (116 rows)
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (1, 1, 1, 'Chè khoai dẻo', 20000, '/uploads/51433a835f754c04b27d0b24db685f6d.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (2, 1, 1, 'Chè khoai dẻo caramen', 25000, '/uploads/6b6d50cc81d244e48178ec7e1505c91a.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (3, 1, 1, 'Chè dừa dầm', 20000, '/uploads/9ccc30aa8e6347fc94c38c013045016f.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (4, 1, 1, 'Chè dừa dầm caramen', 25000, '/uploads/1a24f7bb586d439a9b9498fa617b6237.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (5, 1, 1, 'Chè bưởi trân châu', 15000, '/uploads/960bb5f43c0e4377841fa9f6c605359a.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (6, 1, 1, 'Chè bưởi dừa non', 20000, '/uploads/21b3ce904b9c4adebea2c03a4787685d.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (7, 1, 1, 'Chè thái dừa', 20000, '/uploads/aa80f5b437a14500a6f261c55fab104f.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (8, 1, 1, 'Chè sầu', 30000, '/uploads/4ade40deedaa4fbf8d45397e51394476.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (9, 1, 1, 'Chè đác sầu', 35000, '/uploads/8dd95307d3f44cca9774c27c64506aba.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (10, 1, 1, 'Sương sa hạt lựu', 20000, '/uploads/325336690ec14c10be1d22eac582454a.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (11, 1, 1, 'Chè hạt đác', 25000, '/uploads/87a2745ca9f14eb88ba683a2f61f3c0a.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (12, 1, 1, 'Chè dừa đậu đỏ', 20000, '/uploads/a420d49b36d145748df584af1bf30118.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (13, 1, 1, 'Chè dừa đác rim', 25000, '/uploads/03c1cad6e0b54817afb88fda16ec7f59.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (14, 1, 1, 'Chè thập cẩm', 15000, '/uploads/2860f4b499764312976c438854aa22ea.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (15, 1, 1, 'Chè đậu đen ngô bung', 15000, '/uploads/569148c7fec8461ea85139b561091898.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (16, 1, 2, 'Trà sữa sốt khoai môn tươi', 30000, '/uploads/3f3a953eabc241a5b30ef36d2faa8365.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (17, 1, 2, 'Trà sữa hạt dẻ kem trứng', 40000, '/uploads/66cc2a1aa21246c584200516c707781c.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (18, 1, 2, 'Matcha kem trứng', 40000, '/uploads/6534e35ae696423b82e12bad991574cb.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (19, 1, 2, 'Trà sữa trân châu đường đen', 25000, '/uploads/cce4eacd2bbd4b40bfddf9fedbb8e666.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (20, 1, 2, 'Trà sữa vị trà xanh', 25000, '/uploads/109326ab4f76469bb1fa3b513d7a4fc2.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (21, 1, 2, 'Trà sữa vị việt quất', 25000, '/uploads/8665bfc1ad724aab9366a15c4baff5df.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (22, 1, 2, 'Trà sữa vị đào', 25000, '/uploads/9e882ff38db144ae9649a67dc9d4a5ae.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (23, 1, 2, 'Trà sữa dâu', 25000, '/uploads/7f75723718624377a2eebda1765fb55a.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (24, 1, 2, 'Trà sữa socola đậm vị', 25000, '/uploads/4bd93cd72bd5479bbc96d96ace8bace7.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (25, 1, 2, 'Hồng trà sữa', 25000, '/uploads/6b45149a29fb48ce81e3585aca9fd95c.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (26, 1, 3, 'Sữa chua hoa quả dầm', 25000, '/uploads/66884516c0fc44b0995cda7300d04835.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (27, 1, 3, 'Sữa chua mít', 20000, '/uploads/e3bc3f6af93c41d1839ea0bc522df3ae.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (28, 1, 3, 'Sữa chua mít đặc biệt', 25000, '/uploads/d58b2c2204a34610a5153939a33fa1be.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (29, 1, 3, 'Sữa chua mít caramen', 25000, '/uploads/816deaeeea35494994020a752b0d099a.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (30, 1, 3, 'Sữa chua đậu đỏ', 20000, '/uploads/258ba0275b9646c0969029b96fa18ce8.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (31, 1, 3, 'Sữa chua dâu tây', 30000, '/uploads/c67401d4706f4440b0f74684b1d4d83f.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (32, 1, 3, 'Sữa chua đác nha đam', 25000, '/uploads/dce242bdfed14738a0120ad11eeaf404.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (33, 1, 3, 'Sữa chua đánh đá', 25000, '/uploads/884e00f7674e4513802252a9cb641525.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (34, 1, 4, 'Tàu hũ trân châu đường đen', 20000, '/uploads/229ebc00c32843e486017b054a1508f0.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (35, 1, 4, 'Tàu hũ caramen', 25000, '/uploads/b17fb6c3aa294892b508e819bdb6d450.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (36, 1, 4, 'Tàu hũ đậu đỏ', 25000, '/uploads/234233a8bee2422db93eeb683c325817.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (37, 1, 4, 'Tàu hũ kem trứng dừa', 30000, '/uploads/28e853f379ef4890bd01c64dabf16456.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (38, 1, 4, 'Tàu hũ thập cẩm', 30000, '/uploads/6c707523f5b7407890517068c1ae372c.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (39, 1, 4, 'Tàu hũ hoa quả', 30000, '/uploads/516be6d75b7b4d92a6bd066d2d16432a.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (40, 1, 5, 'Nem nướng Nha Trang', 40000, '/uploads/3c7a193146b849fd8be8190f370fab7b.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (41, 1, 5, 'Tokbokki phomai', 50000, '/uploads/71dcbe27d7384c4ca916feddfdb0cb7d.jpg', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (42, 1, 5, 'Bánh tôm Hồ Tây', 45000, '', 0, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (43, 1, 5, 'Chân gà sốt thái', 55000, '/uploads/7ab35327f01b484bac8e299ba2388a7a.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (44, 1, 5, 'Khoai tây lắc', 30000, '/uploads/d3b9c754f1464942a1169452cd0f09eb.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (45, 1, 5, 'Gà KFC', 30000, '/uploads/e6a7d91776b54ee5b19e0faaff44feee.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (46, 1, 5, 'Nem chua rán (chiếc)', 6000, '', 0, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (47, 1, 5, 'Nem chua rán (đĩa)', 60000, '/uploads/a427177cc618406abf977921fc79f52b.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (48, 1, 5, 'Phomai que (chiếc)', 6000, '', 0, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (49, 1, 5, 'Phomai que (đĩa)', 60000, '/uploads/63690cf911d74b44a029bf688ba0526a.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (50, 1, 5, 'Xúc xích', 10000, '/uploads/66990a0461444f92b2ce16f8d9a4e037.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (51, 1, 5, 'Bánh mỳ muối ớt', 25000, '/uploads/239f98964a374e13a19755791feefbe4.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (52, 1, 5, 'Kimbap chiên', 25000, '/uploads/3f19c9b498ba4a75a183e3c6443f7861.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (53, 1, 5, 'Khoai lang kén', 25000, '/uploads/6e2fec1d3aa8436daf1d145eae98ca97.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (54, 1, 5, 'Chả cá', 25000, '/uploads/3b8d92fd0ff84637854d473eb4c71c5f.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (55, 1, 5, 'Khô bò miếng', 60000, '/uploads/9477ed1d81e34cefb336a7bfbd503d02.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (56, 1, 5, 'Khô bò gói', 25000, '/uploads/38e3585b9ee94fc88d32443079ff131a.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (57, 1, 5, 'Khô gà gói', 25000, '/uploads/b672d26867534115bc523cf8f61837cb.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (58, 1, 5, 'Hướng dương', 15000, '/uploads/a8bd2c7fe0a34168ac431789f188937e.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (59, 1, 5, 'Pizza (Bò ngô/Xúc Xích) Size 20', 85000, '/uploads/d6d00a91389c4830be9186f4d3f95354.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (60, 1, 6, 'Trà đào cam sả', 30000, '/uploads/38771d27b1674a2c9c2440879f0ede55.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (61, 1, 6, 'Cam đào dâu tây', 30000, '/uploads/ee9109d6ed69403aa06c221a7b703fa7.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (62, 1, 6, 'Trà bí đao hạt chia', 20000, '/uploads/f60c0dc35f7042c385872740765e5f4a.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (63, 1, 6, 'Trà chanh', 15000, '/uploads/f20d6994eeeb4851b5a49ae9ebf4bc2c.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (64, 1, 6, 'Trà Tắc', 15000, '/uploads/c8dc2ab6ede54c69afa65e4c6870af8d.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (65, 1, 6, 'Trà xoài chanh leo', 25000, '/uploads/639156ffc8494988911fbab2dc0f44b9.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (66, 1, 6, 'Trà mãng cầu', 30000, '/uploads/1ff7d9073141439b900e57f6f545e2ef.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (67, 1, 7, 'Mì cay thập cẩm', 60000, '/uploads/d7518f3dbdfc447d9849ed9a552f3f97.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (68, 1, 7, 'Mì cay bò nấm', 50000, '/uploads/09e571fedce3473a9ae32f721b3f50ac.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (69, 1, 7, 'Mì cay hải sản', 55000, '/uploads/7c38bf3612394093bbd8f9226e342bc6.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (70, 1, 7, 'Mì sườn sụn', 50000, '/uploads/9c4159cd56fa4d33ab8626265b7701d3.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (71, 1, 7, 'Mì xúc xích', 35000, '/uploads/b2e0d1bd107f47f3bdaed3f98b16fd06.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (72, 1, 8, 'Bánh mì chảo', 60000, '/uploads/8c8271a0719f49219e7ace57d82aa25e.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (73, 1, 9, 'Nha đam', 5000, '', 1, 1, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (74, 1, 9, 'Trân châu trắng', 5000, '', 1, 1, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (75, 1, 9, 'Trân châu đường đen', 5000, '', 1, 1, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (76, 1, 9, 'Thạch', 5000, '', 1, 1, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (77, 1, 5, 'Món thử (kỹ thuật viên phần mềm)', 25000, '', 0, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (78, 1, 5, 'Khoai môn lệ phố nhân phô mai', 7000, '/uploads/a048644532ee4a919ee4e1a3efb282d0.png', 0, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (79, 1, 5, 'Khoai môn lệ phố nhân phô mai (5 cái)', 35000, '/uploads/1bd02ba944ee49f4a5e20eb37f4ca339.png', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (80, 1, 5, 'Bim gói', 10000, '', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (81, 1, 5, 'Bim ống', 30000, '', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (82, 1, 5, 'Bánh gà(1 chiếc)', 8000, '', 0, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (83, 1, 5, 'Bánh gà (5 chiếc)', 40000, '', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (84, 1, 10, 'Bơ già dừa non', 35000, '/uploads/5f40e59ec66c468b99216b39169ec289.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (85, 1, 10, 'Bơ già dừa non (2cốc)', 70000, '/uploads/72effcef6c1e4155a2b868225d174e29.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (86, 1, 8, 'Bánh mì', 7000, '', 1, 1, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (87, 1, 7, 'Thêm mì', 5000, '', 1, 1, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (90, 1, 9, 'Thêm tôm', 10000, '', 1, 1, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (91, 1, 7, 'Thêm xúc xích', 5000, '', 1, 1, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (92, 1, 7, 'Thêm chả cá', 5000, '', 1, 1, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (93, 1, 7, 'Thêm sườn sụn', 10000, '', 1, 1, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (94, 1, 8, 'Trứng chín', 0, '', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (95, 1, 5, 'Nước chấm nem nướng(thêm)', 0, '', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (96, 1, 9, 'Thêm bò', 15000, '', 1, 1, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (97, 1, 3, 'Sữa chua cốm', 25000, '', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (98, 1, 11, 'Xay đá', 0, '', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (99, 1, 11, 'Đá Bi', 0, '', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (100, 1, 11, 'Trần Lọt', 0, '', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (101, 1, 11, 'Pha trà sữa', 0, '', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (102, 1, 11, 'Pha trà chanh', 0, '', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (103, 1, 11, 'Pha trà tắc', 0, '', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (104, 1, 11, 'Luộc trân châu trắng', 0, '', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (105, 1, 11, 'Luộc trân châu đen', 0, '', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (106, 1, 11, 'Bào dừa trắng', 0, '', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (107, 1, 11, 'Cắt mít', 0, '', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (108, 1, 11, 'Nạo thạch dừa trong', 0, '', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (109, 1, 11, 'Luộc báng', 0, '', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (110, 1, 2, 'Milo dầm', 25000, '', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (111, 1, 11, 'Làm thạch 3 màu', 0, '', 1, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (112, 1, 5, 'Gà viên sốt chua ngọt', 50000, '/uploads/5ac24749286f492ea66db5706cd461b4.jpg', 0, 0, 'kitchen');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (113, 1, 2, 'Sữa dâu thăng hoà', 35000, '/uploads/42d031fb1c0447f3b4ef31ff730232f6.jpg', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (114, 1, 12, 'Sen dừa lạnh', 30000, '/uploads/a02ebf03391a4586a72327fb831753ac.jpg', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (115, 1, 1, 'Chè sầu cốm', 40000, '/uploads/52390578616443db94a7750ce8555808.jpg', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (116, 1, 1, 'Chè bưởi cốm', 25000, '/uploads/4bf3c0e19f434edbbc88cc0027149d1b.jpg', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (117, 1, 2, 'Trà sữa cốm', 30000, '/uploads/eba8ad8e176441288e9e9c17aa88037b.png', 1, 0, 'counter');
INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) VALUES (118, 1, 13, 'Coca-cola ', 15000, '', 1, 0, 'counter');

-- Product sizes (17 rows)
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (1, 16, 'M', 30000, 0);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (2, 16, 'L', 40000, 1);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (13, 24, 'M', 25000, 2);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (17, 45, 'Cánh', 30000, 3);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (18, 45, 'Đùi', 30000, 4);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (19, 19, 'M', 25000, 5);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (20, 20, 'M', 25000, 6);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (21, 20, 'L', 32000, 7);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (22, 21, 'M', 25000, 8);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (23, 21, 'L', 32000, 9);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (24, 22, 'M', 25000, 10);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (25, 22, 'L', 32000, 11);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (26, 23, 'M', 25000, 12);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (27, 24, 'L', 32000, 13);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (28, 23, 'L', 32000, 14);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (29, 25, 'M', 25000, 15);
INSERT INTO product_sizes (id, product_id, name, price, sort_order) VALUES (30, 25, 'L', 32000, 16);

-- Category toppings (30 rows)
INSERT INTO category_toppings (category_id, product_id) VALUES (7, 96);
INSERT INTO category_toppings (category_id, product_id) VALUES (2, 73);
INSERT INTO category_toppings (category_id, product_id) VALUES (2, 74);
INSERT INTO category_toppings (category_id, product_id) VALUES (2, 75);
INSERT INTO category_toppings (category_id, product_id) VALUES (2, 76);
INSERT INTO category_toppings (category_id, product_id) VALUES (4, 73);
INSERT INTO category_toppings (category_id, product_id) VALUES (4, 74);
INSERT INTO category_toppings (category_id, product_id) VALUES (4, 75);
INSERT INTO category_toppings (category_id, product_id) VALUES (4, 76);
INSERT INTO category_toppings (category_id, product_id) VALUES (5, 86);
INSERT INTO category_toppings (category_id, product_id) VALUES (5, 87);
INSERT INTO category_toppings (category_id, product_id) VALUES (5, 90);
INSERT INTO category_toppings (category_id, product_id) VALUES (5, 91);
INSERT INTO category_toppings (category_id, product_id) VALUES (7, 87);
INSERT INTO category_toppings (category_id, product_id) VALUES (7, 90);
INSERT INTO category_toppings (category_id, product_id) VALUES (7, 91);
INSERT INTO category_toppings (category_id, product_id) VALUES (8, 86);
INSERT INTO category_toppings (category_id, product_id) VALUES (8, 91);
INSERT INTO category_toppings (category_id, product_id) VALUES (8, 96);
INSERT INTO category_toppings (category_id, product_id) VALUES (7, 92);
INSERT INTO category_toppings (category_id, product_id) VALUES (7, 93);
INSERT INTO category_toppings (category_id, product_id) VALUES (1, 73);
INSERT INTO category_toppings (category_id, product_id) VALUES (1, 74);
INSERT INTO category_toppings (category_id, product_id) VALUES (1, 75);
INSERT INTO category_toppings (category_id, product_id) VALUES (1, 76);
INSERT INTO category_toppings (category_id, product_id) VALUES (5, 92);
INSERT INTO category_toppings (category_id, product_id) VALUES (5, 93);
INSERT INTO category_toppings (category_id, product_id) VALUES (5, 96);
INSERT INTO category_toppings (category_id, product_id) VALUES (8, 92);
INSERT INTO category_toppings (category_id, product_id) VALUES (8, 93);

-- Tables (15 rows)
INSERT INTO tables (id, store_id, name, status) VALUES (1, 1, 'Bàn 1', 'empty');
INSERT INTO tables (id, store_id, name, status) VALUES (2, 1, 'Bàn 2', 'empty');
INSERT INTO tables (id, store_id, name, status) VALUES (3, 1, 'Bàn 3', 'occupied');
INSERT INTO tables (id, store_id, name, status) VALUES (4, 1, 'Bàn 4', 'empty');
INSERT INTO tables (id, store_id, name, status) VALUES (5, 1, 'Bàn 5', 'empty');
INSERT INTO tables (id, store_id, name, status) VALUES (6, 1, 'Bàn 6', 'occupied');
INSERT INTO tables (id, store_id, name, status) VALUES (7, 1, 'Bàn 7', 'empty');
INSERT INTO tables (id, store_id, name, status) VALUES (8, 1, 'Bàn 8', 'empty');
INSERT INTO tables (id, store_id, name, status) VALUES (9, 1, 'Bàn 9', 'occupied');
INSERT INTO tables (id, store_id, name, status) VALUES (10, 1, 'Bàn 10', 'empty');
INSERT INTO tables (id, store_id, name, status) VALUES (11, 1, 'Bàn 11', 'occupied');
INSERT INTO tables (id, store_id, name, status) VALUES (12, 1, 'Bàn 12', 'empty');
INSERT INTO tables (id, store_id, name, status) VALUES (13, 1, 'Bàn 13', 'empty');
INSERT INTO tables (id, store_id, name, status) VALUES (14, 1, 'Bàn 14', 'empty');
INSERT INTO tables (id, store_id, name, status) VALUES (15, 1, 'Bàn 15', 'empty');

-- Users (3 rows)
-- Lưu ý: password_hash từ werkzeug không tương thích D1 (SHA-256). User cần đổi mật khẩu.
INSERT INTO users (id, store_id, username, password_hash, salt, full_name, role) VALUES (1, 1, 'admin', 'scrypt:32768:8:1$jx4Z0DFI1CFie9th$5043b647f816b127a278b9e2c6362b3810361dc9398450c3c4069eb4a2e55f9f5a3de3cacd431e3b75eb37415b87e82f10d0d52dfd51e86304561845c9bd625c', 'clone-placeholder', 'Quản trị viên', 'admin');
INSERT INTO users (id, store_id, username, password_hash, salt, full_name, role) VALUES (2, 1, 'bep', 'scrypt:32768:8:1$k9OpRc92s8cq2mad$2a1412b60a2e28204df641f6b170f251aadad9fa139280290d8408272a56cff419864c524811549bd885969849a756aef3735b5fdc107777505b58201e7cde1f', 'clone-placeholder', '', 'kitchen');
INSERT INTO users (id, store_id, username, password_hash, salt, full_name, role) VALUES (3, 1, 'guest_order', 'scrypt:32768:8:1$cjf967ynMbcbSAC8$d2f0cb529d7241d42135f0cc3f671bed775698dc822d3508eab16244ced2a8ccc049aa6e5cd3d13f0693d4b7747deaed0bb0da3bfc3e7448b517a53b0e75f876', 'clone-placeholder', 'KhÃ¡ch QR', 'staff');

-- Settings
INSERT INTO settings (key, value) VALUES ('facebook_url', 'https://www.facebook.com/kimhue.do.7');
INSERT INTO settings (key, value) VALUES ('ship_enabled', 'true');

-- Reset AUTOINCREMENT counters
INSERT INTO sqlite_sequence (name, seq) VALUES ('categories', 13);
INSERT INTO sqlite_sequence (name, seq) VALUES ('products', 118);
INSERT INTO sqlite_sequence (name, seq) VALUES ('product_sizes', 30);
INSERT INTO sqlite_sequence (name, seq) VALUES ('tables', 15);
INSERT INTO sqlite_sequence (name, seq) VALUES ('users', 3);

-- ✅ Clone hoàn tất!