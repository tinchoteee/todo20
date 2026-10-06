# Publicidad Nací Reina — textos y pasos

## Textos para los anuncios (probá 2 o 3 a la vez y Meta muestra más el que mejor funciona)

**Texto principal**
1. 👑 Botas, zapatillas, sandalias y más, al mejor precio. Envío gratis a todo el país desde $165.000. Comprá online en 2 minutos.
2. ¿Buscás calzado con onda y que dure? Pisá fuerte 👟 Pagá con tarjeta, Mercado Pago o transferencia con 5% OFF.
3. Nuevos ingresos todas las semanas 🔥 Botas texanas, zapatillas urbanas y sandalias. 10% OFF comprando desde $220.000.
4. Comprá desde tu casa y recibilo donde estés 📦 O retiralo gratis por nuestro local en Ramos Mejía.

**Títulos (cortos)**
- Envío gratis desde $165.000
- 10% OFF desde $220.000
- 5% OFF con transferencia
- Pisá fuerte. Para todos.
- Calzado con actitud

**Botón:** "Comprar" (campañas A y B) · "Enviar mensaje" (campaña C, WhatsApp)

**Link:** https://nacireinacalzados.com/?utm_source=meta&utm_medium=ads
(el `utm` sirve para ver en Vercel Analytics cuántas visitas vienen de la publicidad)

## Catálogo (se actualiza solo)
Link del catálogo: **https://nacireinacalzados.com/api/catalogo**
Tiene todos los productos activos con foto, precio, link y si están agotados. Cuando cambiás algo en el editor o se suma un producto nuevo, el catálogo cambia solo.

### Cargarlo en Meta (para anuncios de catálogo y etiquetar productos en Instagram)
1. Entrá a **business.facebook.com/commerce** → **Agregar catálogo** → tipo **Comercio electrónico** → "Subir información de productos".
2. Dentro del catálogo: **Orígenes de datos** → **Agregar artículos** → **Feed de datos** → **Feed programado**.
3. Pegá el link del catálogo, frecuencia **Diaria**, moneda **ARS**.
4. En **Orígenes de datos → Eventos**, conectá el Píxel "Nací Reina" (1313393520818430). Así el anuncio le muestra a cada persona el producto que miró.

### Cargarlo en Google (aparecés gratis en Google Shopping)
1. Entrá a **merchants.google.com** con tu cuenta de Google y creá la cuenta "Nací Reina" (país Argentina, moneda ARS).
2. Verificá el sitio `nacireinacalzados.com` (Google te da un código: pasáselo a Claude y lo pone en la página).
3. **Productos → Agregar productos → Archivo desde una URL** → pegá el link del catálogo, que se lea todos los días.
4. Envíos: "Envío a todo el país", costo según código postal (o gratis desde $165.000).

## Las 3 campañas (Administrador de anuncios → Crear)
| | Objetivo | Público | Presupuesto inicial |
|---|---|---|---|
| A | Ventas → sitio web (Advantage+) | Argentina, 18–55, sin intereses (que Meta busque) | ~$6.000/día |
| B | Ventas → **catálogo** | Personas que vieron productos o agregaron al carrito en los últimos 14 días | ~$2.000/día |
| C | Mensajes → WhatsApp | Radio de 12 km alrededor del local, 18–55 | ~$2.000/día |

Dejá 7 días sin tocar. Después: subir la plata a la que traiga ventas más baratas y apagar la peor.
