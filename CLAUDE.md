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
- Botas con precio. Faltan los precios del zapato acordonado y de las zapatillas gamuza. Campus y Samba: $30.000.
- Faltan las fotos de los colores nuevos: negro (punta cuadrada, texana con tachas, corta con tachas, caña fruncida), blanco (caña alta con flecos) y bordó (caña fruncida). Mientras tanto la página avisa "foto de referencia en otro color".
- El código está en GitHub: `tinchoteee/todo20` (rama `claude/webpage-editing-odsc8k`).
- **Nada está publicado todavía.** Faltan las cuentas: Vercel, Mercado Pago developers, Zipnova, Resend, Upstash. Git y gh no están instalados.
- Falta en `productos.js`: el WhatsApp del local, y el peso y las medidas reales de las cajas.
- Nunca pedir ni pegar claves ni datos bancarios en el chat: el usuario los carga directo en Vercel y en Mercado Pago.
- Siguiente paso: publicar en Vercel y hacer una compra de prueba con las credenciales de prueba de Mercado Pago.
