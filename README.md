# Hotel Can Quetglas - Info Display System

Sistema de digital signage para mostrar información del hotel en las TVs.

## Características

- 📺 **Display para TVs** - Slides rotativas con información del hotel
- 🌍 **Multiidioma** - Español, Inglés y Alemán con rotación automática
- ⚙️ **Panel Admin** - Edita contenido sin tocar código
- 🌤️ **Clima en tiempo real** - Integración con OpenWeatherMap
- 💾 **Base de datos SQLite** - Ligera y sin servidor externo

## Instalación en Raspberry Pi

### 1. Clonar el repositorio

```bash
cd ~
git clone https://github.com/TU_USUARIO/hotel-info.git
cd hotel-info
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Iniciar el servidor

```bash
npm start
```

El servidor se iniciará en el puerto 3000.

## URLs

- **Display (TVs)**: `http://IP-DE-LA-PI:3000/display`
- **Panel Admin**: `http://IP-DE-LA-PI:3000/admin`

## Configuración

### Clima (OpenWeatherMap)

1. Crea una cuenta gratuita en [OpenWeatherMap](https://openweathermap.org/api)
2. Obtén tu API Key
3. En el Panel Admin → Display → introduce tu API Key
4. Las coordenadas de Palma de Mallorca ya están configuradas (39.5696, 2.6502)

### Iniciar automáticamente con la Pi

Crea un servicio systemd:

```bash
sudo nano /etc/systemd/system/hotel-info.service
```

Contenido del archivo:

```ini
[Unit]
Description=Hotel Info Display
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/hotel-info
ExecStart=/usr/bin/node server/app.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Activar el servicio:

```bash
sudo systemctl daemon-reload
sudo systemctl enable hotel-info
sudo systemctl start hotel-info
```

Comprobar estado:

```bash
sudo systemctl status hotel-info
```

## Estructura del proyecto

```
hotel-info/
├── server/
│   └── app.js           # Servidor Express + API
├── public/
│   ├── display/
│   │   └── index.html   # Pantalla para TVs
│   └── admin/
│       └── index.html   # Panel de administración
├── data/
│   └── hotel.db         # Base de datos SQLite (se crea automáticamente)
├── package.json
└── README.md
```

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/settings` | Obtener configuración |
| POST | `/api/settings` | Guardar configuración |
| GET | `/api/schedule` | Obtener horarios |
| POST | `/api/schedule` | Crear horario |
| PUT | `/api/schedule/:id` | Actualizar horario |
| DELETE | `/api/schedule/:id` | Eliminar horario |
| GET | `/api/services` | Obtener servicios |
| POST | `/api/services` | Crear servicio |
| PUT | `/api/services/:id` | Actualizar servicio |
| DELETE | `/api/services/:id` | Eliminar servicio |
| GET | `/api/display` | Datos completos para el display |

## Actualizar contenido

1. Accede al panel admin desde cualquier dispositivo en la red: `http://IP-PI:3000/admin`
2. Modifica horarios, servicios o configuración
3. Guarda los cambios
4. El display se actualiza automáticamente cada 5 minutos

## Solución de problemas

### El clima no se muestra
- Verifica que la API Key de OpenWeatherMap sea correcta
- Comprueba que la Pi tenga conexión a internet

### El display no carga
- Verifica que el servidor esté corriendo: `sudo systemctl status hotel-info`
- Revisa los logs: `sudo journalctl -u hotel-info -f`

### Reiniciar el servidor
```bash
sudo systemctl restart hotel-info
```

## Licencia

MIT - Hotel Can Quetglas
