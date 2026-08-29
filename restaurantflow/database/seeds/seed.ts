import path from 'path';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/restaurantflow';

export async function runSeed(): Promise<void> {
  console.log('🌱 Starting Database Seeding with updated authentic menu...');
  const isLocalDb = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new Pool({
    connectionString,
    ssl: isLocalDb ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🧹 Cleaning existing test seed data...');
    await client.query(`
      TRUNCATE TABLE 
        audit_logs, 
        qr_codes, 
        order_tokens, 
        daily_token_sequences, 
        payments, 
        order_items, 
        orders, 
        inventory_logs, 
        inventory, 
        menu_items, 
        menu_schedules, 
        foods, 
        categories, 
        restaurant_hours, 
        restaurant_managers, 
        restaurants, 
        refresh_tokens, 
        users 
      CASCADE;
    `);

    // 1. Password Hash for Demo Users (Supports Password123! and Manager@123)
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const managerAltHash = await bcrypt.hash('Manager@123', 10);

    // 2. Create Users
    console.log('👤 Creating demo users...');
    const { rows: managerRows } = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role;`,
      ['Rajesh Kumar (Manager)', 'manager@example.com', '+91 9876543210', passwordHash, 'RESTAURANT_MANAGER']
    );
    const managerUser = managerRows[0];

    const { rows: manager2Rows } = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, role;`,
      ['Restaurant Manager', 'manager@restaurantflow.com', '+91 9876543212', managerAltHash, 'RESTAURANT_MANAGER']
    );

    const { rows: customerRows } = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role;`,
      ['Priya Sharma (Customer)', 'customer@example.com', '+91 9876543211', passwordHash, 'CUSTOMER']
    );
    const customerUser = customerRows[0];

    // Additional User Account from User Prompt
    const nandhaHash = await bcrypt.hash('Password123!', 10);
    await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING;`,
      ['Nandhana S K', 'nandhanask26@gmail.com', '+919751502017', nandhaHash, 'CUSTOMER']
    );

    // 3. Create Restaurant
    console.log('🏪 Creating "Spice Garden" restaurant...');
    const { rows: restRows } = await client.query(
      `INSERT INTO restaurants (name, description, address, phone, email, is_open, opening_time, closing_time, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name;`,
      [
        'Spice Garden',
        'Authentic South Indian Meals, Tiffin, Parotta, Dosa, Chaats and Fresh Juices crafted daily with fresh ingredients.',
        '124 Gourmet Boulevard, Koramangala 4th Block, Bengaluru, Karnataka 560034',
        '+91 80 4567 8900',
        'contact@spicegarden.com',
        true,
        '07:00',
        '23:30',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
      ]
    );
    const restaurant = restRows[0];

    // Link Manager to Restaurant
    await client.query(
      `INSERT INTO restaurant_managers (restaurant_id, user_id, is_primary)
       VALUES ($1, $2, TRUE);`,
      [restaurant.id, managerUser.id]
    );

    if (manager2Rows && manager2Rows[0]) {
      await client.query(
        `INSERT INTO restaurant_managers (restaurant_id, user_id, is_primary)
         VALUES ($1, $2, FALSE)
         ON CONFLICT DO NOTHING;`,
        [restaurant.id, manager2Rows[0].id]
      );
    }

    // Create Restaurant Hours
    for (let day = 0; day <= 6; day++) {
      await client.query(
        `INSERT INTO restaurant_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
         VALUES ($1, $2, '07:00', '23:30', FALSE);`,
        [restaurant.id, day]
      );
    }

    // 4. Create Categorized Menu
    console.log('📂 Creating categorized food sections...');
    const categoriesData = [
      { name: 'Meals & Rice Varieties', order: 1 },
      { name: 'Tiffin & Breakfast', order: 2 },
      { name: 'Dosa Corner', order: 3 },
      { name: 'Parotta Corner', order: 4 },
      { name: 'Starters & Non-Veg', order: 5 },
      { name: 'Evening Snacks & Chaat', order: 6 },
      { name: 'Hot Beverages & Fresh Juices', order: 7 },
    ];

    const categoryMap: Record<string, string> = {};
    for (const cat of categoriesData) {
      const { rows } = await client.query(
        `INSERT INTO categories (restaurant_id, name, display_order)
         VALUES ($1, $2, $3)
         RETURNING id, name;`,
        [restaurant.id, cat.name, cat.order]
      );
      categoryMap[cat.name] = rows[0].id;
    }

    // 5. Complete Food Items List
    console.log('🍛 Populating newly requested menu items...');
    const foodsList = [
      // 1. Meals & Rice Varieties
      {
        name: 'Veg Meals',
        category: 'Meals & Rice Varieties',
        description: 'Grand traditional South Indian Meals with Steamed Rice, Sambar, Rasam, Kara Kuzhambu, Poriyal, Kootu, Appalam, Pickle & Thick Curd.',
        price: 100.0,
        prepTime: 10,
        isVeg: true,
        stock: 50,
        img: '/images/veg_meals.png',
      },
      {
        name: 'Curd Rice',
        category: 'Meals & Rice Varieties',
        description: 'Cooling tempered curd rice garnished with mustard, curry leaves, ginger, pomegranate pearls and homemade mango pickle.',
        price: 60.0,
        prepTime: 5,
        isVeg: true,
        stock: 40,
        img: '/images/curd_rice.png',
      },
      {
        name: 'Sambar Sadham',
        category: 'Meals & Rice Varieties',
        description: 'Rich, slow-cooked lentil and garden vegetable spiced rice served piping hot with pure cow ghee and crispy potato chips.',
        price: 70.0,
        prepTime: 8,
        isVeg: true,
        stock: 35,
        img: '/images/sambar_sadham.png',
      },
      {
        name: 'Chicken Rice',
        category: 'Meals & Rice Varieties',
        description: 'Wok-tossed flavorful basmati fried rice loaded with succulent chicken chunks, eggs, and crisp scallions.',
        price: 140.0,
        prepTime: 15,
        isVeg: false,
        stock: 30,
        img: '/images/chicken_rice.png',
      },
      {
        name: 'Chicken Noodles',
        category: 'Meals & Rice Varieties',
        description: 'Wok-tossed hakka noodles loaded with tender spiced chicken strips, crunchy cabbage, carrots and bell peppers.',
        price: 140.0,
        prepTime: 12,
        isVeg: false,
        stock: 30,
        img: '/images/chicken_noodles.png',
      },
      {
        name: 'Egg Rice',
        category: 'Meals & Rice Varieties',
        description: 'Savory street-style egg fried rice spiced with freshly cracked black pepper and garden vegetables.',
        price: 110.0,
        prepTime: 12,
        isVeg: false,
        stock: 30,
        img: '/images/egg_rice.png',
      },
      {
        name: 'Gobi Rice',
        category: 'Meals & Rice Varieties',
        description: 'Wok-fried aromatic rice tossed with crispy golden fried cauliflower florets and Indo-Chinese sauces.',
        price: 120.0,
        prepTime: 15,
        isVeg: true,
        stock: 25,
        img: '/images/gobi_rice.png',
      },

      // 2. Tiffin & Breakfast
      {
        name: 'Idli (2 pcs)',
        category: 'Tiffin & Breakfast',
        description: 'Soft, pillow-fluffy steamed fermented rice cakes served with authentic coconut chutney, tomato chutney and piping hot sambar.',
        price: 40.0,
        prepTime: 5,
        isVeg: true,
        stock: 60,
        img: '/images/idli.png',
      },
      {
        name: 'Pongal',
        category: 'Tiffin & Breakfast',
        description: 'Traditional hot Ghee Ven Pongal prepared with rice and moong dal, tempered with roasted cashews, cumin, and ginger.',
        price: 60.0,
        prepTime: 8,
        isVeg: true,
        stock: 35,
        img: '/images/pongal.png',
      },
      {
        name: 'Medhu Vada (2 pcs)',
        category: 'Tiffin & Breakfast',
        description: 'Crispy golden savory urad dal doughnuts seasoned with black pepper, curry leaves, and ginger.',
        price: 40.0,
        prepTime: 5,
        isVeg: true,
        stock: 45,
        img: '/images/medhu_vada.png',
      },
      {
        name: 'Kadalai Paruppu Vada (2 pcs)',
        category: 'Tiffin & Breakfast',
        description: 'Crunchy South Indian Bengal gram masala vada packed with onions, green chilies, fennel and spices.',
        price: 40.0,
        prepTime: 5,
        isVeg: true,
        stock: 45,
        img: '/images/kadalai_paruppu_vada.png',
      },
      {
        name: 'Poori (2 pcs with Masala)',
        category: 'Tiffin & Breakfast',
        description: 'Golden fluffy deep-fried wheat pooris served with comforting spiced potato-onion masala gravy.',
        price: 60.0,
        prepTime: 10,
        isVeg: true,
        stock: 40,
        img: '/images/poori.png',
      },

      // 3. Dosa Corner
      {
        name: 'Dosa (Roast)',
        category: 'Dosa Corner',
        description: 'Crisp paper-thin golden fermented rice crepe roasted with pure ghee, served with 3 chutneys & sambar.',
        price: 60.0,
        prepTime: 8,
        isVeg: true,
        stock: 50,
        img: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80',
      },
      {
        name: 'Kal Dosa (2 pcs)',
        category: 'Dosa Corner',
        description: 'Soft, spongy homestyle thick dosas cooked gently on the iron tawa, served with coconut chutney & spicy gravy.',
        price: 50.0,
        prepTime: 8,
        isVeg: true,
        stock: 40,
        img: '/images/kal_dosa.png',
      },
      {
        name: 'Masala Dosa',
        category: 'Dosa Corner',
        description: 'Iconic crispy dosa layered with spiced red chutney and filled with delicious potato masala.',
        price: 75.0,
        prepTime: 10,
        isVeg: true,
        stock: 45,
        img: '/images/masala_dosa.png',
      },
      {
        name: 'Podi Dosa',
        category: 'Dosa Corner',
        description: 'Crispy golden dosa generously smeared with fiery aromatic idli podi and cold-pressed gingelly oil.',
        price: 70.0,
        prepTime: 8,
        isVeg: true,
        stock: 40,
        img: '/images/podi_dosa.png',
      },

      // 4. Parotta Corner
      {
        name: 'Parotta (2 pcs with Gravy)',
        category: 'Parotta Corner',
        description: 'Flaky, buttery multi-layered flatbreads grilled on a hot tawa. Choice of Veg Kurma/Salna or Non-Veg Chicken Salna.',
        price: 60.0,
        prepTime: 10,
        isVeg: true,
        stock: 50,
        img: '/images/parotta.png',
      },
      {
        name: 'Egg Kothu Parotta',
        category: 'Parotta Corner',
        description: 'Flaky shredded parotta minced on a hot iron griddle with eggs, onions, green chilies, and aromatic salna spices.',
        price: 110.0,
        prepTime: 12,
        isVeg: false,
        stock: 35,
        img: '/images/egg_kothu.png',
      },
      {
        name: 'Chicken Kothu Parotta',
        category: 'Parotta Corner',
        description: 'Street-style shredded parotta tossed with spiced chicken pieces, egg, curry leaves, and rich chicken salna. Served with raita.',
        price: 150.0,
        prepTime: 15,
        isVeg: false,
        stock: 30,
        img: '/images/chicken_kothu.png',
      },

      // 5. Starters & Non-Veg
      {
        name: 'Chicken Biriyani',
        category: 'Starters & Non-Veg',
        description: 'Fragrant Seeraga Samba rice slow-cooked with succulent chicken pieces and traditional spices. Served with raita and gravy.',
        price: 180.0,
        prepTime: 15,
        isVeg: false,
        stock: 30,
        img: '/images/chicken_biriyani.png',
      },
      {
        name: 'Chicken 65',
        category: 'Starters & Non-Veg',
        description: 'Deep-fried crispy chicken morsels tossed with curry leaves, crushed garlic, and fiery red masala.',
        price: 120.0,
        prepTime: 12,
        isVeg: false,
        stock: 30,
        img: '/images/chicken_65.png',
      },
      {
        name: 'Chicken Lollipop (5 pcs)',
        category: 'Starters & Non-Veg',
        description: 'Crispy fried seasoned chicken winglets tossed in spicy Schezwan masala, garnished with spring onions.',
        price: 160.0,
        prepTime: 15,
        isVeg: false,
        stock: 25,
        img: '/images/chicken_lollipop.png',
      },
      {
        name: 'Pepper Chicken',
        category: 'Starters & Non-Veg',
        description: 'Tender chicken pieces pan-roasted dry with freshly pounded black pepper, caramelized shallots and curry leaves.',
        price: 150.0,
        prepTime: 15,
        isVeg: false,
        stock: 25,
        img: '/images/pepper_chicken.png',
      },

      // 6. Evening Snacks & Chaat
      {
        name: 'Chilli Baji (3 pcs)',
        category: 'Evening Snacks & Chaat',
        description: 'Crispy golden gram-flour battered fresh green chili bajis served with sweet & spicy dipping sauce.',
        price: 40.0,
        prepTime: 5,
        isVeg: true,
        stock: 45,
        img: '/images/chilli_baji.png',
      },
      {
        name: 'Vazhakkai Baji (3 pcs)',
        category: 'Evening Snacks & Chaat',
        description: 'Hot and crispy golden gram-flour battered raw banana fritters served with coconut chutney.',
        price: 40.0,
        prepTime: 5,
        isVeg: true,
        stock: 45,
        img: '/images/vazhakkai_baji.png',
      },
      {
        name: 'Bread Baji (2 pcs)',
        category: 'Evening Snacks & Chaat',
        description: 'Crispy golden triangular battered bread pakoras served with mint chutney and tomato dip.',
        price: 40.0,
        prepTime: 5,
        isVeg: true,
        stock: 45,
        img: '/images/bread_baji.png',
      },
      {
        name: 'Bonda (2 pcs)',
        category: 'Evening Snacks & Chaat',
        description: 'Deep-fried crispy potato bondas with tempered mustard, ginger, and curry leaves.',
        price: 35.0,
        prepTime: 5,
        isVeg: true,
        stock: 45,
        img: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80',
      },
      {
        name: 'Vegetable Cutlet (2 pcs)',
        category: 'Evening Snacks & Chaat',
        description: 'Crispy golden breadcrumb-crusted vegetable patties made with potatoes, carrots, peas and beetroot.',
        price: 40.0,
        prepTime: 8,
        isVeg: true,
        stock: 35,
        img: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=600&auto=format&fit=crop&q=80',
      },
      {
        name: 'Pani Puri (6 pcs)',
        category: 'Evening Snacks & Chaat',
        description: 'Crisp hollow puris stuffed with potato-sprouted moong mix, dunked in zesty spicy mint & sweet tamarind pani.',
        price: 40.0,
        prepTime: 5,
        isVeg: true,
        stock: 50,
        img: '/images/pani_puri.png',
      },
      {
        name: 'Masala Puri',
        category: 'Evening Snacks & Chaat',
        description: 'Crushed crisp puris drenched in steaming spiced green peas gravy, topped with onions, tomatoes, coriander and sev.',
        price: 50.0,
        prepTime: 5,
        isVeg: true,
        stock: 45,
        img: '/images/masala_puri.png',
      },
      {
        name: 'Bhel Puri (Pel Poori)',
        category: 'Evening Snacks & Chaat',
        description: 'Light puffed rice tossed with roasted peanuts, raw mango, onions, sev and tangy-sweet chutneys.',
        price: 45.0,
        prepTime: 5,
        isVeg: true,
        stock: 45,
        img: '/images/bhel_puri.png',
      },

      // 7. Hot Beverages & Fresh Juices
      {
        name: 'Coffee',
        category: 'Hot Beverages & Fresh Juices',
        description: 'Aromatic authentic South Indian filter coffee brewed from freshly roasted beans with thick frothy milk.',
        price: 25.0,
        prepTime: 3,
        isVeg: true,
        stock: 100,
        img: '/images/coffee.png',
      },
      {
        name: 'Tea',
        category: 'Hot Beverages & Fresh Juices',
        description: 'Strong, refreshing highway-style tea infused with crushed ginger and cardamom.',
        price: 20.0,
        prepTime: 3,
        isVeg: true,
        stock: 100,
        img: '/images/tea.png',
      },
      {
        name: 'Watermelon Fresh Juice',
        category: 'Hot Beverages & Fresh Juices',
        description: '100% natural cold-pressed fresh watermelon juice, refreshing and hydrating.',
        price: 50.0,
        prepTime: 5,
        isVeg: true,
        stock: 40,
        img: '/images/watermelon_juice.png',
      },
      {
        name: 'Fresh Lemon Juice',
        category: 'Hot Beverages & Fresh Juices',
        description: 'Freshly squeezed chilled lemon juice with a dash of mint and Himalayan salt / sugar.',
        price: 35.0,
        prepTime: 3,
        isVeg: true,
        stock: 50,
        img: '/images/lemon_juice.png',
      },
      {
        name: 'Pomegranate Juice',
        category: 'Hot Beverages & Fresh Juices',
        description: 'Rich antioxidant ruby red fresh pomegranate juice, cold-pressed with no added preservatives.',
        price: 70.0,
        prepTime: 5,
        isVeg: true,
        stock: 30,
        img: '/images/pomegranate_juice.png',
      },
      {
        name: 'Orange Juice',
        category: 'Hot Beverages & Fresh Juices',
        description: 'Sweet and tangy freshly squeezed vitamin-C rich pure orange juice.',
        price: 60.0,
        prepTime: 5,
        isVeg: true,
        stock: 35,
        img: '/images/orange_juice.png',
      },
      {
        name: 'Pineapple Fresh Juice',
        category: 'Hot Beverages & Fresh Juices',
        description: 'Freshly squeezed tropical pineapple juice with sweet aromatic flavor.',
        price: 60.0,
        prepTime: 5,
        isVeg: true,
        stock: 35,
        img: '/images/pineapple_juice.png',
      },
      {
        name: 'Sathukudi (Sweet Lime) Juice',
        category: 'Hot Beverages & Fresh Juices',
        description: 'Freshly pressed Mosambi sweet lime juice served chilled with a hint of black salt.',
        price: 50.0,
        prepTime: 5,
        isVeg: true,
        stock: 40,
        img: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=600&auto=format&fit=crop&q=80',
      },
      {
        name: 'Apple Juice',
        category: 'Hot Beverages & Fresh Juices',
        description: 'Crisp and sweet pure fresh apple juice made from select Himachal apples.',
        price: 70.0,
        prepTime: 5,
        isVeg: true,
        stock: 30,
        img: '/images/apple_juice.png',
      },
    ];

    const foodMap: Record<string, any> = {};
    for (const food of foodsList) {
      const { rows: foodRows } = await client.query(
        `INSERT INTO foods (restaurant_id, category_id, name, description, price, preparation_time_minutes, is_available, is_vegetarian, image_url)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8)
         RETURNING id, name, price;`,
        [
          restaurant.id,
          categoryMap[food.category],
          food.name,
          food.description,
          food.price,
          food.prepTime,
          food.isVeg,
          food.img,
        ]
      );
      const createdFood = foodRows[0];
      foodMap[food.name] = createdFood;

      // Seed live inventory
      await client.query(
        `INSERT INTO inventory (restaurant_id, food_id, quantity, low_stock_threshold)
         VALUES ($1, $2, $3, 5);`,
        [restaurant.id, createdFood.id, food.stock]
      );
    }

    // 6. Create Daily Menu Schedules for Today
    console.log('📅 Setting up comprehensive daily menu schedules...');
    const today = new Date().toISOString().split('T')[0];
    const mealSchedules = [
      { type: 'BREAKFAST', title: 'Morning Fresh Tiffin & Dosa' },
      { type: 'LUNCH', title: 'Afternoon Meals, Rice & Biriyani Feast' },
      { type: 'SNACKS', title: 'Evening Hot Chaat & Snacks' },
      { type: 'DINNER', title: 'Night Parotta & Dosa Specials' },
      { type: 'ALL_DAY', title: 'All Day Refreshments & Juices' },
    ];

    for (const ms of mealSchedules) {
      const { rows: schedRows } = await client.query(
        `INSERT INTO menu_schedules (restaurant_id, menu_date, meal_type, title, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         RETURNING id;`,
        [restaurant.id, today, ms.type, ms.title]
      );
      const scheduleId = schedRows[0].id;

      // Attach relevant food items
      if (ms.type === 'BREAKFAST') {
        const breakfastItems = [
          'Idli (2 pcs)',
          'Pongal',
          'Medhu Vada (2 pcs)',
          'Kadalai Paruppu Vada (2 pcs)',
          'Poori (2 pcs with Masala)',
          'Dosa (Roast)',
          'Kal Dosa (2 pcs)',
          'Masala Dosa',
          'Podi Dosa',
          'Coffee',
          'Tea',
        ];
        for (const item of breakfastItems) {
          if (foodMap[item]) {
            await client.query(
              `INSERT INTO menu_items (menu_schedule_id, food_id, is_available) VALUES ($1, $2, TRUE);`,
              [scheduleId, foodMap[item].id]
            );
          }
        }
      } else if (ms.type === 'LUNCH') {
        const lunchItems = [
          'Veg Meals',
          'Curd Rice',
          'Sambar Sadham',
          'Chicken Biriyani',
          'Chicken Rice',
          'Chicken Noodles',
          'Egg Rice',
          'Gobi Rice',
          'Egg Kothu Parotta',
          'Chicken Kothu Parotta',
          'Chicken 65',
          'Chicken Lollipop (5 pcs)',
          'Pepper Chicken',
          'Watermelon Fresh Juice',
          'Fresh Lemon Juice',
          'Pomegranate Juice',
          'Orange Juice',
          'Pineapple Fresh Juice',
          'Sathukudi (Sweet Lime) Juice',
          'Apple Juice',
        ];
        for (const item of lunchItems) {
          if (foodMap[item]) {
            await client.query(
              `INSERT INTO menu_items (menu_schedule_id, food_id, is_available) VALUES ($1, $2, TRUE);`,
              [scheduleId, foodMap[item].id]
            );
          }
        }
      } else if (ms.type === 'SNACKS') {
        const snackItems = [
          'Chilli Baji (3 pcs)',
          'Vazhakkai Baji (3 pcs)',
          'Bread Baji (2 pcs)',
          'Bonda (2 pcs)',
          'Vegetable Cutlet (2 pcs)',
          'Pani Puri (6 pcs)',
          'Masala Puri',
          'Bhel Puri (Pel Poori)',
          'Coffee',
          'Tea',
          'Watermelon Fresh Juice',
          'Fresh Lemon Juice',
        ];
        for (const item of snackItems) {
          if (foodMap[item]) {
            await client.query(
              `INSERT INTO menu_items (menu_schedule_id, food_id, is_available) VALUES ($1, $2, TRUE);`,
              [scheduleId, foodMap[item].id]
            );
          }
        }
      } else if (ms.type === 'DINNER') {
        const dinnerItems = [
          'Parotta (2 pcs with Gravy)',
          'Egg Kothu Parotta',
          'Chicken Kothu Parotta',
          'Dosa (Roast)',
          'Kal Dosa (2 pcs)',
          'Masala Dosa',
          'Podi Dosa',
          'Idli (2 pcs)',
          'Chicken Biriyani',
          'Chicken Rice',
          'Chicken Noodles',
          'Egg Rice',
          'Gobi Rice',
          'Chicken 65',
          'Chicken Lollipop (5 pcs)',
          'Pepper Chicken',
          'Coffee',
          'Tea',
        ];
        for (const item of dinnerItems) {
          if (foodMap[item]) {
            await client.query(
              `INSERT INTO menu_items (menu_schedule_id, food_id, is_available) VALUES ($1, $2, TRUE);`,
              [scheduleId, foodMap[item].id]
            );
          }
        }
      } else if (ms.type === 'ALL_DAY') {
        for (const food of foodsList) {
          if (foodMap[food.name]) {
            await client.query(
              `INSERT INTO menu_items (menu_schedule_id, food_id, is_available) VALUES ($1, $2, TRUE) ON CONFLICT DO NOTHING;`,
              [scheduleId, foodMap[food.name].id]
            );
          }
        }
      }
    }

    // 7. Seed Sample Orders with Verified Tokens and Payments
    console.log('🧾 Seeding sample orders with token RF-format and payment states...');
    const dateCode = today.replace(/-/g, '');

    await client.query(
      `INSERT INTO daily_token_sequences (restaurant_id, token_date, current_sequence)
       VALUES ($1, $2, 3);`,
      [restaurant.id, today]
    );

    // Order 1: Completed & Delivered Order
    const token1 = `RF-${dateCode}-001`;
    const { rows: o1Rows } = await client.query(
      `INSERT INTO orders (
        restaurant_id, user_id, order_token, status, preferred_time_type, requested_food_at,
        subtotal, tax, total_amount, confirmed_at, preparing_at, ready_at, delivered_at
      ) VALUES ($1, $2, $3, 'DELIVERED', 'ASAP', NOW() - INTERVAL '45 minutes', 200.00, 10.00, 210.00,
        NOW() - INTERVAL '44 minutes', NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '5 minutes')
      RETURNING id;`,
      [restaurant.id, customerUser.id, token1]
    );
    const o1Id = o1Rows[0].id;

    await client.query(
      `INSERT INTO order_items (order_id, food_id, food_name, unit_price, quantity, total_price)
       VALUES ($1, $2, 'Veg Meals', 100.00, 2, 200.00);`,
      [o1Id, foodMap['Veg Meals'].id]
    );

    await client.query(
      `INSERT INTO payments (order_id, restaurant_id, user_id, amount, payment_method, payment_provider, status, transaction_id, paid_at)
       VALUES ($1, $2, $3, 210.00, 'UPI', 'mock', 'PAID', 'TXN_UPI_SAMPLE_001', NOW() - INTERVAL '44 minutes');`,
      [o1Id, restaurant.id, customerUser.id]
    );

    await client.query(
      `INSERT INTO order_tokens (order_id, restaurant_id, token_string, token_date, sequence_number)
       VALUES ($1, $2, $3, $4, 1);`,
      [o1Id, restaurant.id, token1, today]
    );

    await client.query(
      `INSERT INTO qr_codes (order_id, restaurant_id, verification_code, is_scanned, scanned_at, expires_at)
       VALUES ($1, $2, 'QR_VERIFY_SAMPLE_001_DELIVERED', TRUE, NOW() - INTERVAL '5 minutes', NOW() + INTERVAL '4 hours');`,
      [o1Id, restaurant.id]
    );

    // Order 2: Active PREPARING Order
    const token2 = `RF-${dateCode}-002`;
    const { rows: o2Rows } = await client.query(
      `INSERT INTO orders (
        restaurant_id, user_id, order_token, status, preferred_time_type, requested_food_at,
        subtotal, tax, total_amount, confirmed_at, preparing_at
      ) VALUES ($1, $2, $3, 'PREPARING', 'SCHEDULED', NOW() + INTERVAL '15 minutes', 240.00, 12.00, 252.00,
        NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '5 minutes')
      RETURNING id;`,
      [restaurant.id, customerUser.id, token2]
    );
    const o2Id = o2Rows[0].id;

    await client.query(
      `INSERT INTO order_items (order_id, food_id, food_name, unit_price, quantity, total_price)
       VALUES 
        ($1, $2, 'Parotta (2 pcs with Gravy)', 60.00, 2, 120.00),
        ($1, $3, 'Chicken 65', 120.00, 1, 120.00);`,
      [o2Id, foodMap['Parotta (2 pcs with Gravy)'].id, foodMap['Chicken 65'].id]
    );

    await client.query(
      `INSERT INTO payments (order_id, restaurant_id, user_id, amount, payment_method, payment_provider, status, transaction_id, paid_at)
       VALUES ($1, $2, $3, 252.00, 'CARD', 'mock', 'PAID', 'TXN_CARD_SAMPLE_002', NOW() - INTERVAL '10 minutes');`,
      [o2Id, restaurant.id, customerUser.id]
    );

    await client.query(
      `INSERT INTO order_tokens (order_id, restaurant_id, token_string, token_date, sequence_number)
       VALUES ($1, $2, $3, $4, 2);`,
      [o2Id, restaurant.id, token2, today]
    );

    await client.query(
      `INSERT INTO qr_codes (order_id, restaurant_id, verification_code, is_scanned, expires_at)
       VALUES ($1, $2, 'QR_VERIFY_ACTIVE_002', FALSE, NOW() + INTERVAL '6 hours');`,
      [o2Id, restaurant.id]
    );

    // Order 3: Active READY Order
    const token3 = `RF-${dateCode}-003`;
    const { rows: o3Rows } = await client.query(
      `INSERT INTO orders (
        restaurant_id, user_id, order_token, status, preferred_time_type, requested_food_at,
        subtotal, tax, total_amount, confirmed_at, preparing_at, ready_at
      ) VALUES ($1, $2, $3, 'READY', 'ASAP', NOW() - INTERVAL '5 minutes', 150.00, 7.50, 157.50,
        NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '2 minutes')
      RETURNING id;`,
      [restaurant.id, customerUser.id, token3]
    );
    const o3Id = o3Rows[0].id;

    await client.query(
      `INSERT INTO order_items (order_id, food_id, food_name, unit_price, quantity, total_price)
       VALUES 
        ($1, $2, 'Masala Dosa', 75.00, 1, 75.00),
        ($1, $3, 'Masala Puri', 50.00, 1, 50.00),
        ($1, $4, 'Coffee', 25.00, 1, 25.00);`,
      [o3Id, foodMap['Masala Dosa'].id, foodMap['Masala Puri'].id, foodMap['Coffee'].id]
    );

    await client.query(
      `INSERT INTO payments (order_id, restaurant_id, user_id, amount, payment_method, payment_provider, status, transaction_id)
       VALUES ($1, $2, $3, 157.50, 'CASH_ON_DELIVERY', 'mock', 'UNPAID', 'TXN_COD_SAMPLE_003');`,
      [o3Id, restaurant.id, customerUser.id]
    );

    await client.query(
      `INSERT INTO order_tokens (order_id, restaurant_id, token_string, token_date, sequence_number)
       VALUES ($1, $2, $3, $4, 3);`,
      [o3Id, restaurant.id, token3, today]
    );

    // 8. Audit Log Samples
    await client.query(
      `INSERT INTO audit_logs (user_id, restaurant_id, action, entity_type, entity_id, metadata)
       VALUES 
        ($1::uuid, $2::uuid, 'MANAGER_LOGIN', 'USER', $1::text, '{"client": "web"}'),
        ($1::uuid, $2::uuid, 'RESTAURANT_OPENED', 'RESTAURANT', $2::text, '{"status": "OPEN"}'),
        ($1::uuid, $2::uuid, 'MENU_UPDATED', 'MENU', $2::text, '{"categories": 7, "items": 34}');`,
      [managerUser.id, restaurant.id]
    );

    await client.query('COMMIT');

    console.log('✨ Seed completed successfully with 34 authentic dishes and 7 categories!');
    console.log('----------------------------------------------------');
    console.log('📌 DEMO LOGIN CREDENTIALS:');
    console.log('  👨‍💼 Restaurant Manager: manager@example.com / Password123!');
    console.log('  👤 Customer:           nandhanask26@gmail.com / Password123!');
    console.log('  👤 Demo Customer:      customer@example.com / Password123!');
    console.log('  🏪 Restaurant:         Spice Garden');
    console.log('----------------------------------------------------');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed with error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runSeed();
}
