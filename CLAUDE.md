# Tienda Nací Reina Calzados

Tienda online del local de calzado Nací Reina (Av. de Mayo 1614, Ramos Mejía, CP 1704). La dueña/el dueño no es técnico/a: hablale en español rioplatense, simple y paso a paso. Quiere una tienda que venda sola, estilo Tiendanube/Nike.

## Cómo está armada
- Sitio estático + funciones serverless para **Vercel** (carpeta `api/`, CommonJS, Node 20+, sin dependencias).
- `productos.js`: catálogo (productos, precios, colores con precio y foto propios, talles, cajas para el envío, envío gratis desde $150.000, WhatsApp). Lo usan la página y el servidor.
- `ajustes.js`: aplica los cambios del editor (precios, agotados por modelo, color o talle). Compartido entre página y servidor.
- `index.html` + `estilos.css` + `tienda.js`: tienda (catálogo, página de producto, carrito, checkout en 3 pasos, FAQ, botón de arrepentimiento).
- `admin.html` + `admin.js`: editor con contraseña (`ADMIN_CLAVE`): stock, precios y pedidos.
- Cobros: **Mercado Pago**. Dos formas en el paso 3 del checkout: formulario de tarjeta dentro de la página (Card Payment Brick → `api/pagar-tarjeta.js`, necesita `MP_PUBLIC_KEY`, que la página lee de `api/config.js`) y Checkout Pro (`api/crear-pago.js`). El pedido se arma y recalcula en `api/_pedido.js`; el pago aprobado se procesa en `api/_procesar.js` (lo usan `pagar-tarjeta.js` y `webhook-mp.js`, una sola vez por pago).
- Envíos: **Zipnova**, con los transportes de "servicio completo" (Correo Argentino y OCA; Andreani no está disponible sin contrato propio, que es un plan pago que el dueño NO quiere). `envio.transportista` vacío = se muestran todos. Cotiza por código postal y crea el envío solo cuando entra el pago. El correo retira en el local.
- Base de datos: **Upstash Redis** (stock, precios, pedidos, que un pago no se procese dos veces). Emails: **Resend**.
- Guía para configurar todo: `CONFIGURACION.md`.

## Vista previa local
No hay Node ni Python en las computadoras. `.claude/launch.json` → "tienda" levanta `.claude/servidor.ps1` (PowerShell) en el puerto 8765. Las funciones de `api/` no corren localmente: se probaron con un simulador en el navegador.

## Estado (2026-09-29)
- Hecho: catálogo con fotos (logos "Todo20" recortados; Todo20 es otra marca del mismo dueño), logo e isotipo (`img/`), checkout, envíos, editor, textos legales.
- Catálogo Pontecomoda (proveedor/socio, se pueden usar sus fotos): ids 15 en adelante, nombres reescritos para clientes. Solo están disponibles los artículos de la "lista de precios verano" (Samba, Emi, Vicky, Ricky, París, Lore, Katy, Aldi, Romi, Vitto, Italia, Moscú, Zahira, Ximena, Cleo/Creo, Lali, India, Ameli, Cruz, Birk, Frida, Lupe, Verona tachas, Verona lisa, Támesis, Umma). El resto tiene `oculto:true` (desactivado, se reactiva borrando esa marca). Precio de venta = costo + $10.000 redondeado hacia abajo al millar (margen $9.000–10.000). No cargar artículos con logos de otras marcas (se descartó la Art. Air por la pipa de Nike).
- Todos los productos activos tienen precio. Zapato acordonado $30.000, zapatillas urbanas gamuza $45.000, Campus y Samba (viejas) $30.000.
- Faltan las fotos de los colores nuevos: negro (corta con tachas, caña fruncida), blanco (caña alta con flecos) y bordó (caña fruncida). Mientras tanto la página avisa "foto de referencia en otro color".
- El código está en GitHub: `tinchoteee/todo20`. Vercel publica la rama `main` en https://nacireina.vercel.app (cada push a `main` se publica solo). Dominio propio `nacireinacalzados.com` agregado en Vercel (2026-09-29; `www` redirige al dominio sin www). Con el dominio andando se puede verificar en Resend y cargar `RESEND_FROM` para mandarle mail de confirmación al cliente.
- Configurado en Vercel (2026-09-28): base de datos Upstash, `ADMIN_CLAVE` y `MP_ACCESS_TOKEN` de producción (app "Nací Reina" en MP developers). La tienda ya cobra. Después (2026-09-29): Resend (`RESEND_API_KEY`, `AVISOS_EMAIL`) y Zipnova (`ZIPNOVA_API_TOKEN/SECRET/ACCOUNT_ID`, sin `ZIPNOVA_ORIGIN_ID`: usa el origen predeterminado de la cuenta) configurados y probados; compra real de prueba OK.
- Beneficios por monto: envío gratis desde $150.000 (`envio.gratisDesde`, sobre el subtotal sin descuento) y 15% OFF en los productos desde $200.000 (`descuento` en productos.js; la cuenta está en `aplicarAjustes.conDescuento`, la usan página y servidor). El carrito muestra una barra de progreso con las dos metas.
- Se sacó la guía de talles (pedido del dueño). El botón de arrepentimiento se mantiene: es obligatorio por ley en Argentina (Res. 424/2020, Ley 24.240 art. 34).
- SEO: título y descripción para Google, `canonical` y `og:*` con el dominio propio, ficha de negocio (JSON-LD `ShoeStore`), `sitemap.xml` y `robots.txt`. Imagen para compartir el link (WhatsApp/Facebook): `img/compartir.jpg` (1200×630, solo el logo sobre blanco: pedido del dueño, sin fotos ni promos). Si cambia el dominio, actualizarlos.
- Píxel de Meta "Nací Reina" (2157264648210007): cargado en `productos.js` (`metaPixel`); `META_PIXEL_ID` en Vercel lo reemplaza si hiciera falta. Lo entrega `api/config.js`; sin número no carga nada. Eventos en `tienda.js` (`medir`): PageView, ViewContent, AddToCart, InitiateCheckout y Purchase (al volver con `?pago=aprobado`, `eventID` = número de pedido).
- Vercel Web Analytics: script en `index.html` (no en el editor); se activa en Vercel → proyecto → Analytics → Enable.
- WhatsApp del local: 11 6949 0396 (`5491169490396`), botón flotante abajo a la derecha.
- Instagram: https://www.instagram.com/nacireinacalzados/ (link en el pie de página y en `sameAs` del JSON-LD). Facebook no se usa.
- Bota texana corta (id 2): 2026-09-29 se le unió la "Bota texana punta cuadrada" (id 13, ahora `oculto`) a pedido del dueño. Colores: Suela, Marrón (foto de la ex punta cuadrada) y Negro (foto real). Ya no hay foto pendiente del negro punta cuadrada.
- Zapatillas leopardo clásicas (id 69) y con plataforma (id 70): fotos propias del local (2026-09-29), talles 35–40. Precio pendiente (precio:0 → "Consultar precio", no se pueden comprar online hasta cargarlo).
- Bota texana bordada (id 1): color Negro con foto real (2026-09-29), a $45.000 como la blanca (la oreja de atrás se dibujó a mano en la máscara porque la vidriera confundía el recorte).
- Zapato acordonado con tachas (id 6): color Negro agregado con foto real (2026-09-29), mismo precio.
- Bota texana con tachas negra: foto real del local (2026-09-29) sobre el fondo de estudio; reemplazó a la recoloreada.
- Cajas de envío: tamaño caja de Nike, 35 × 24 × 13 cm y 800 g (dato del dueño). Botas de caña alta: 45 × 32 × 14 cm, 800 g.
- Nunca pedir ni pegar claves ni datos bancarios en el chat: el usuario los carga directo en Vercel y en Mercado Pago.
- Nombres sin marcas ajenas (2026-09-29): Campus → "Zapatillas retro de gamuza" (id 7), Samba → "Zapatillas retro suela caramelo" (id 8; después se unió a la id 31 a pedido del dueño: quedó `oculto` y su color marrón pasó a la 31 como "Caramelo y negro" a $30.000; su negro era el mismo que el de la 31), estilo Samba → "Zapatillas retro Reina" (id 31), Samba sin talón → "Zapatillas retro sin talón" (id 15, oculto). No usar Samba, Campus ni "tres tiras" en textos para clientes (los archivos de fotos conservan el nombre viejo).
- Zapatillas retro Reina (id 31), 2026-09-29: el dueño dejó solo los 4 colores que tiene en el local (Negro, Blanco y negro, Blanco y gris, Marrón), todos a $24.000, con fotos propias sobre fondo blanco (`fotos/zapatilla-retro-*.jpg`; `FONDO=blanco` en `.claude/fotos-fondo.py`, recorte con el modelo birefnet-general-lite). Los colores viejos se borraron (no agotados).
- Privacidad: pregunta "¿Qué hacen con mis datos?" (`#privacidad`) en el FAQ + link en el pie (Ley 25.326, Píxel de Meta y Vercel Analytics). Si se agrega otra herramienta de medición, sumarla ahí.
- Siguiente paso: fotos de los colores que faltan (punto 5).
- Vercel plan Hobby: máximo 100 deploys por día. El 2026-09-29 se llegó al límite y los últimos cambios no se publicaron hasta el día siguiente. Por eso `vercel.json` desactiva los deploys de ramas `claude/*` (solo publica `main`); agrupar cambios en pocos pushes a `main`.
- Ojo: si en Vercel se hace un "Instant Rollback", los pushes a `main` dejan de publicarse hasta hacer "Promote to Production".
