# Tienda Nací Reina Calzados

Tienda online del local de calzado Nací Reina (Av. de Mayo 1614, Ramos Mejía, CP 1704). La dueña/el dueño no es técnico/a: hablale en español rioplatense, simple y paso a paso. Quiere una tienda que venda sola, estilo Tiendanube/Nike.

## Cómo está armada
- Sitio estático + funciones serverless para **Vercel** (carpeta `api/`, CommonJS, Node 20+, sin dependencias).
- `productos.js`: catálogo (productos, precios, colores con precio y foto propios, talles, cajas para el envío, envío gratis desde $150.000, WhatsApp). Lo usan la página y el servidor.
- `ajustes.js`: aplica los cambios del editor (precios, agotados por modelo, color o talle). Compartido entre página y servidor.
- `index.html` + `estilos.css` + `tienda.js`: tienda (catálogo, página de producto, carrito, checkout en 3 pasos, FAQ, botón de arrepentimiento).
- `admin.html` + `admin.js`: editor con contraseña (`ADMIN_CLAVE`): stock, precios y pedidos.
- Cobros: **Mercado Pago Checkout Pro** (`api/crear-pago.js`, `api/webhook-mp.js`). El servidor siempre recalcula precios y envío.
- Envíos: **Zipnova** como intermediario de **Andreani** (el cliente no tiene contrato propio con Andreani). Cotiza por código postal y crea el envío solo cuando entra el pago. Andreani retira en el local.
- Base de datos: **Upstash Redis** (stock, precios, pedidos, que un pago no se procese dos veces). Emails: **Resend**.
- Guía para configurar todo: `CONFIGURACION.md`.

## Vista previa local
No hay Node ni Python en las computadoras. `.claude/launch.json` → "tienda" levanta `.claude/servidor.ps1` (PowerShell) en el puerto 8765. Las funciones de `api/` no corren localmente: se probaron con un simulador en el navegador.

## Estado (2026-09-26)
- Hecho: catálogo con fotos (logos "Todo20" recortados; Todo20 es otra marca del mismo dueño), logo e isotipo (`img/`), checkout, envíos, editor, textos legales.
- Catálogo Pontecomoda (proveedor/socio, se pueden usar sus fotos): ids 15 en adelante, nombres reescritos para clientes. Solo están disponibles los artículos de la "lista de precios verano" (Samba, Emi, Vicky, Ricky, París, Lore, Katy, Aldi, Romi, Vitto, Italia, Moscú, Zahira, Ximena, Cleo/Creo, Lali, India, Ameli, Cruz, Birk, Frida, Lupe, Verona tachas, Verona lisa, Támesis, Umma). El resto tiene `oculto:true` (desactivado, se reactiva borrando esa marca). Precio de venta = costo + $10.000 redondeado hacia abajo al millar (margen $9.000–10.000). No cargar artículos con logos de otras marcas (se descartó la Art. Air por la pipa de Nike).
- Todos los productos activos tienen precio. Zapato acordonado $30.000, zapatillas urbanas gamuza $45.000, Campus y Samba (viejas) $30.000.
- Faltan las fotos de los colores nuevos: negro (punta cuadrada, texana con tachas, corta con tachas, caña fruncida), blanco (caña alta con flecos) y bordó (caña fruncida). Mientras tanto la página avisa "foto de referencia en otro color".
- El código está en GitHub: `tinchoteee/todo20`. Vercel publica la rama `main` en https://nacireina.vercel.app (cada push a `main` se publica solo).
- Configurado en Vercel (2026-09-28): base de datos Upstash, `ADMIN_CLAVE` y `MP_ACCESS_TOKEN` de producción (app "Nací Reina" en MP developers). La tienda ya cobra. Faltan: Resend (emails) y Zipnova (mientras tanto, envío con precios fijos por zona).
- WhatsApp del local: 11 6949 0396 (`5491169490396`), botón flotante abajo a la derecha.
- Falta en `productos.js`: el peso y las medidas reales de las cajas.
- Nunca pedir ni pegar claves ni datos bancarios en el chat: el usuario los carga directo en Vercel y en Mercado Pago.
- Siguiente paso: Resend (`RESEND_API_KEY`, `AVISOS_EMAIL`), compra real de prueba con tarjeta de otra persona y devolución desde MP, después Zipnova.
- Ojo: si en Vercel se hace un "Instant Rollback", los pushes a `main` dejan de publicarse hasta hacer "Promote to Production".
