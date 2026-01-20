const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../public/images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Database setup
const dbPath = path.join(__dirname, '../data/hotel.db');
const db = new Database(dbPath);

// Initialize database
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title_es TEXT,
      title_en TEXT,
      title_de TEXT,
      content_es TEXT,
      content_en TEXT,
      content_de TEXT,
      icon TEXT,
      display_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS schedule_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_es TEXT,
      name_en TEXT,
      name_de TEXT,
      time_start TEXT,
      time_end TEXT,
      icon TEXT,
      image TEXT,
      is_closed INTEGER DEFAULT 0,
      closed_from TEXT,
      closed_to TEXT,
      display_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_es TEXT,
      name_en TEXT,
      name_de TEXT,
      description_es TEXT,
      description_en TEXT,
      description_de TEXT,
      icon TEXT,
      image TEXT,
      display_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    );
  `);

  // Add new columns if they don't exist (migration)
  try {
    db.exec(`ALTER TABLE schedule_items ADD COLUMN image TEXT`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE schedule_items ADD COLUMN is_closed INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE schedule_items ADD COLUMN closed_from TEXT`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE schedule_items ADD COLUMN closed_to TEXT`);
  } catch (e) {}
  try {
    db.exec(`ALTER TABLE services ADD COLUMN image TEXT`);
  } catch (e) {}

  // Insert default settings if not exist
  const defaultSettings = {
    hotel_name: 'Hotel Can Quetglas',
    hotel_address: 'Calle Santa Rita, 13 - 07014 - Palma de Mallorca',
    hotel_phone: '+34 971 XXX XXX',
    hotel_email: 'info@canquetglas.com',
    wifi_network: 'Hotel Can Quetglas',
    wifi_password: 'XXXXXXXX',
    welcome_message_es: '¡Bienvenidos a Hotel Can Quetglas!',
    welcome_message_en: 'Welcome to Hotel Can Quetglas!',
    welcome_message_de: 'Willkommen im Hotel Can Quetglas!',
    slide_duration: '12000',
    weather_lat: '39.5696',
    weather_lon: '2.6502',
    weather_api_key: '',
    primary_color: '#1a365d',
    accent_color: '#c9a227'
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value);
  }

  // Insert default schedule if empty
  const scheduleCount = db.prepare('SELECT COUNT(*) as count FROM schedule_items').get();
  if (scheduleCount.count === 0) {
    const insertSchedule = db.prepare(`
      INSERT INTO schedule_items (name_es, name_en, name_de, time_start, time_end, icon, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const defaultSchedule = [
      ['Desayuno', 'Breakfast', 'Frühstück', '08:00', '10:30', 'coffee', 1],
      ['Check-out', 'Check-out', 'Check-out', '11:00', '', 'log-out', 2],
      ['Piscina', 'Pool', 'Pool', '09:00', '20:00', 'waves', 3],
      ['Recepción', 'Reception', 'Rezeption', '08:00', '22:00', 'concierge-bell', 4]
    ];

    for (const item of defaultSchedule) {
      insertSchedule.run(...item);
    }
  }

  // Insert default services if empty
  const servicesCount = db.prepare('SELECT COUNT(*) as count FROM services').get();
  if (servicesCount.count === 0) {
    const insertService = db.prepare(`
      INSERT INTO services (name_es, name_en, name_de, description_es, description_en, description_de, icon, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const defaultServices = [
      ['Piscina', 'Swimming Pool', 'Schwimmbad', 'Disfrute de nuestra piscina exterior', 'Enjoy our outdoor pool', 'Genießen Sie unseren Außenpool', 'waves', 1],
      ['WiFi Gratis', 'Free WiFi', 'Kostenloses WLAN', 'Conexión de alta velocidad en todo el hotel', 'High-speed connection throughout the hotel', 'Highspeed-Verbindung im gesamten Hotel', 'wifi', 2],
      ['Parking', 'Parking', 'Parkplatz', 'Aparcamiento privado disponible', 'Private parking available', 'Privater Parkplatz verfügbar', 'car', 3],
      ['Terraza', 'Terrace', 'Terrasse', 'Relájese en nuestra terraza con vistas', 'Relax on our terrace with views', 'Entspannen Sie auf unserer Terrasse mit Aussicht', 'sun', 4]
    ];

    for (const item of defaultServices) {
      insertService.run(...item);
    }
  }
}

initDatabase();

// API Routes

// Get all settings
app.get('/api/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsObj = {};
  for (const row of settings) {
    settingsObj[row.key] = row.value;
  }
  res.json(settingsObj);
});

// Update settings
app.post('/api/settings', (req, res) => {
  const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const transaction = db.transaction((settings) => {
    for (const [key, value] of Object.entries(settings)) {
      update.run(key, value);
    }
  });

  try {
    transaction(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Image upload endpoint
app.post('/api/upload', (req, res) => {
  try {
    const { image, filename } = req.body;

    if (!image || !filename) {
      return res.status(400).json({ error: 'Missing image or filename' });
    }

    // Extract base64 data
    const matches = image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image format' });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    // Generate unique filename
    const uniqueFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.]/g, '')}.${ext}`;
    const filepath = path.join(uploadsDir, uniqueFilename);

    fs.writeFileSync(filepath, buffer);

    res.json({
      success: true,
      path: `/images/${uniqueFilename}`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schedule items
app.get('/api/schedule', (req, res) => {
  const items = db.prepare('SELECT * FROM schedule_items WHERE active = 1 ORDER BY display_order').all();
  res.json(items);
});

app.post('/api/schedule', (req, res) => {
  const { name_es, name_en, name_de, time_start, time_end, icon, image, is_closed, closed_from, closed_to, display_order } = req.body;
  const result = db.prepare(`
    INSERT INTO schedule_items (name_es, name_en, name_de, time_start, time_end, icon, image, is_closed, closed_from, closed_to, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name_es, name_en, name_de, time_start, time_end, icon, image || null, is_closed || 0, closed_from || null, closed_to || null, display_order || 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/schedule/:id', (req, res) => {
  const { name_es, name_en, name_de, time_start, time_end, icon, image, is_closed, closed_from, closed_to, display_order, active } = req.body;
  db.prepare(`
    UPDATE schedule_items
    SET name_es = ?, name_en = ?, name_de = ?, time_start = ?, time_end = ?, icon = ?, image = ?, is_closed = ?, closed_from = ?, closed_to = ?, display_order = ?, active = ?
    WHERE id = ?
  `).run(name_es, name_en, name_de, time_start, time_end, icon, image || null, is_closed || 0, closed_from || null, closed_to || null, display_order, active, req.params.id);
  res.json({ success: true });
});

app.delete('/api/schedule/:id', (req, res) => {
  db.prepare('DELETE FROM schedule_items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Services
app.get('/api/services', (req, res) => {
  const items = db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY display_order').all();
  res.json(items);
});

app.post('/api/services', (req, res) => {
  const { name_es, name_en, name_de, description_es, description_en, description_de, icon, image, display_order } = req.body;
  const result = db.prepare(`
    INSERT INTO services (name_es, name_en, name_de, description_es, description_en, description_de, icon, image, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name_es, name_en, name_de, description_es, description_en, description_de, icon, image || null, display_order || 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/services/:id', (req, res) => {
  const { name_es, name_en, name_de, description_es, description_en, description_de, icon, image, display_order, active } = req.body;
  db.prepare(`
    UPDATE services
    SET name_es = ?, name_en = ?, name_de = ?, description_es = ?, description_en = ?, description_de = ?, icon = ?, image = ?, display_order = ?, active = ?
    WHERE id = ?
  `).run(name_es, name_en, name_de, description_es, description_en, description_de, icon, image || null, display_order, active, req.params.id);
  res.json({ success: true });
});

app.delete('/api/services/:id', (req, res) => {
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Get all display data (for TV display)
app.get('/api/display', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings').all();
  const settingsObj = {};
  for (const row of settings) {
    settingsObj[row.key] = row.value;
  }

  const schedule = db.prepare('SELECT * FROM schedule_items WHERE active = 1 ORDER BY display_order').all();
  const services = db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY display_order').all();

  res.json({
    settings: settingsObj,
    schedule,
    services
  });
});

// Serve display page
app.get('/display', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/display/index.html'));
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/index.html'));
});

// Root redirect to display
app.get('/', (req, res) => {
  res.redirect('/display');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         Hotel Can Quetglas - Info Display System           ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  📺 TV Display:    http://localhost:${PORT}/display           ║
║  ⚙️  Admin Panel:   http://localhost:${PORT}/admin             ║
║                                                            ║
║  Para acceder desde otras máquinas en la red:              ║
║  http://<IP-de-la-Pi>:${PORT}/display                         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
