# 🔗 Link Tracker — Microservicio de rastreo de clicks

Microservicio minimalista para medir cuántas veces se hace click en tus links, estilo Bitly pero propio.

---

## ⚡ Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env con tu API Key y URL base

# 3. Iniciar el servidor
node index.js
```

---

## 🚀 Uso

### Crear un link rastreable
```bash
curl -X POST http://localhost:3000/links \
  -H "Content-Type: application/json" \
  -H "x-api-key: mi-clave-secreta-123" \
  -d '{"url": "https://tusitioweb.com/producto", "nombre": "Landing Producto A"}'
```
**Respuesta:**
```json
{
  "id": "abc12345",
  "nombre": "Landing Producto A",
  "url": "https://tusitioweb.com/producto",
  "clicks": 0,
  "link_corto": "http://localhost:3000/r/abc12345"
}
```

➡️ En tu app, usa `http://localhost:3000/r/abc12345` como link. Cada click se contará automáticamente.

---

### Ver todos los links y sus clicks
```bash
curl http://localhost:3000/links \
  -H "x-api-key: mi-clave-secreta-123"
```

### Ver un link específico
```bash
curl http://localhost:3000/links/abc12345 \
  -H "x-api-key: mi-clave-secreta-123"
```

### Eliminar un link
```bash
curl -X DELETE http://localhost:3000/links/abc12345 \
  -H "x-api-key: mi-clave-secreta-123"
```

---

## 🌐 Deploy recomendado (gratis)

| Plataforma | Pasos |
|---|---|
| **Railway** | Conecta tu repo de GitHub, agrega las variables de entorno y listo |
| **Render** | Igual que Railway, plan gratuito disponible |
| **Fly.io** | `fly launch` desde la carpeta del proyecto |

---

## 📁 Estructura de archivos

```
link-tracker/
├── index.js        # Servidor principal
├── links.json      # Base de datos (se crea automáticamente)
├── .env.example    # Variables de entorno de ejemplo
└── package.json
```

---

## 🔒 Seguridad

- Todas las rutas de administración requieren el header `x-api-key`
- Cambia el valor de `API_KEY` en tu `.env` por algo seguro
- La ruta de redirección `/r/:id` es pública (necesaria para que funcione el click)
