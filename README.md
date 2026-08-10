# Personal Lyrics Scroller

App web personal para auto-scroll de letras de canciones durante presentaciones en vivo.

## Problema que resuelve

Soy cantante en un grupo versátil y necesito ver las letras mientras canto, pero no quiero estar manipulando el iPad visiblemente en el escenario. Esta app hace scroll automático de las letras para que solo necesite un vistazo rápido.

## Features

- **Auto-scroll ajustable** - Las letras se desplazan solas a velocidad configurable
- **Control de velocidad** - Botones para acelerar o desacelerar el scroll
- **Scroll manual sin perder el ritmo** - Si hago scroll con el mouse, el auto-scroll continúa desde donde quedé
- **Menú de canciones** - Lista alfabética para saltar a cualquier canción con un click
- **Setlists** - Armar listas de canciones en orden específico para cada evento
- **Modo offline** - Funciona sin internet gracias a PWA/Service Worker
- **Pantalla completa** - Se instala como app desde Safari en iPad

## Tech Stack

- HTML5 + CSS3 + JavaScript vanilla
- Progressive Web App (PWA)
- Sin frameworks, sin build tools
- Hosting en GitHub Pages (gratis)

## Uso

1. Abre la app en Safari en tu iPad
2. Toca "Compartir" → "Agregar a pantalla de inicio"
3. Abre la app desde el ícono en tu home screen (se abre sin barra de Safari)
4. Selecciona un setlist o busca una canción en el menú
5. Presiona play y las letras se desplazan solas

## Desarrollo local

```bash
# Cualquier servidor estático funciona
npx serve .

# O con Python
python -m http.server 8000
```

## Agregar canciones

Crea un archivo JSON en `songs/` con este formato:

```json
{
  "id": "nombre-de-cancion",
  "title": "Nombre de Canción",
  "artist": "Artista",
  "lyrics": "Primera línea\nSegunda línea\nTercera línea..."
}
```

Luego agrega el ID al archivo `songs/index.json`.

## Agregar setlists

Crea un archivo JSON en `setlists/` con este formato:

```json
{
  "id": "mi-evento",
  "name": "Boda García - 15 Ago",
  "songs": ["cancion-1", "cancion-2", "cancion-3"]
}
```

## Deploy a GitHub Pages

1. Ve a Settings → Pages en tu repositorio
2. Source: "Deploy from a branch"
3. Branch: `main` / `root`
4. Tu app estará en `https://tu-usuario.github.io/personal-lyrics-scroller/`
