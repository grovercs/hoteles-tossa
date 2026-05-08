# Hoteles Tossa · Hotel Daily Control

App interna responsive para recepción, jefa de recepción y dirección.

## Qué incluye ahora

- Dashboard de dirección.
- Parte diario de recepción.
- Checklist operativo.
- Registro de incidencias.
- Estado de habitaciones.
- Informe diario copiable.
- Configuración básica del hotel y canales.
- Persistencia demo en `localStorage`.
- Preparado para Supabase + Netlify.

## Requisitos

- Node.js 20 o superior recomendado.
- Cuenta de GitHub.
- Cuenta de Netlify.
- Cuenta de Supabase para la fase de base de datos.

## Instalación local

```bash
npm install
npm run dev
```

Abrir la URL local que muestre Vite, normalmente:

```text
http://localhost:5173
```

## Build para producción

```bash
npm run build
```

La carpeta final será:

```text
dist
```

## Netlify

Configuración recomendada:

```text
Build command: npm run build
Publish directory: dist
```

También se incluye `netlify.toml`.

## Supabase

El esquema inicial está en:

```text
src/database/schema.sql
```

Ejecutar ese SQL en Supabase SQL Editor cuando se quiera crear la base de datos.

Crear un archivo `.env.local` a partir de `.env.example`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_publica
```

Importante: `.env.local` no debe subirse a GitHub.

## Siguiente fase

- Conectar lectura/escritura con Supabase.
- Añadir login por roles.
- Añadir filtros por fecha.
- Añadir exportación PDF.
- Añadir envío automático del informe diario.
- Integrar Cloudbeds API si el hotel dispone de acceso.
