# Nací Reina · Cómo poner la tienda en funcionamiento

La tienda ya está armada. Para que venda sola faltan crear algunas cuentas (son tuyas, por eso las tenés que crear vos) y pegar sus claves en Vercel. Claude te guía en cada paso: tardás más o menos una hora en total.

---

## Qué hace la tienda sola

1. El cliente elige producto, color y talle, y calcula el envío con su código postal.
2. En el checkout elige: **correo a domicilio**, **correo a sucursal** (Correo Argentino u OCA) o **retiro en el local**.
3. Paga todo junto con **Mercado Pago** (productos + envío).
4. Cuando el pago se aprueba:
   - El pedido aparece en el **editor** (pestaña Pedidos).
   - Se **crea solo el envío en Zipnova**, que genera la etiqueta y coordina el retiro con el correo.
   - Te llega un **email** con todo el pedido.
5. **Vos solo tenés que**: imprimir la etiqueta desde el panel de Zipnova, pegarla en la caja y dársela al correo cuando pase por el local (o llevarla a una sucursal).

---

## Paso 1 · Publicar la página (Vercel)

1. Creá una cuenta gratis en **github.com** y otra en **vercel.com** (entrá a Vercel con tu cuenta de GitHub).
2. Lo más fácil: pedile a Claude que suba la tienda por vos. Para eso instalá Git y GitHub CLI (los comandos están en la conversación) y ejecutá `gh auth login`.
3. En Vercel: **Add New → Project → Import** el repositorio de la tienda → **Deploy**.
4. Vercel te da una dirección tipo `naci-reina.vercel.app`. Más adelante podés comprar un dominio propio (ej: `nacireina.com.ar` en nic.ar) y conectarlo.

## Paso 2 · Base de datos (para el editor y los pedidos)

En Vercel, dentro del proyecto: **Storage → Create Database → Upstash (Redis) → plan Free → Connect**.
Eso crea solo las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`. No hay que copiar nada.

## Paso 3 · Mercado Pago (para cobrar)

1. Entrá a **mercadopago.com.ar/developers** con tu cuenta de Mercado Pago → **Tus integraciones → Crear aplicación**.
2. Tipo de pago: **pagos online** con **Checkout Pro**.
3. Primero usá las **credenciales de prueba** para hacer una compra de prueba. Después cambiás a las **credenciales de producción**.
4. Copiá el **Access Token** (empieza con `APP_USR-`) y pegalo en Vercel como `MP_ACCESS_TOKEN`.
5. Copiá también la **Public Key** (también empieza con `APP_USR-`, es otra distinta) y pegala en Vercel como `MP_PUBLIC_KEY`. Con esa, el cliente puede cargar su tarjeta sin salir de la tienda.

## Paso 4 · Zipnova (envíos por correo)

1. Creá una cuenta en **zipnova.com.ar** (no necesitás contrato con ningún correo).
2. Cargá la dirección del local como **origen**: Av. de Mayo 1614, Ramos Mejía (CP 1704). Elegí que **retiren en el local**.
3. En **Configuración → Transportes → Transportes con servicio completo** activá **Correo Argentino** y **OCA**. (Andreani solo está con *contrato propio*, que es un plan pago: no hace falta.)
4. En **Configuración → API** generá un token y copiá:
   - API Token → `ZIPNOVA_API_TOKEN`
   - API Secret → `ZIPNOVA_API_SECRET`
   - Número de cuenta → `ZIPNOVA_ACCOUNT_ID`
   - (opcional) id de la dirección de origen → `ZIPNOVA_ORIGIN_ID`

Mientras no esté Zipnova, la tienda cobra el envío con precios fijos por zona (se cambian en `productos.js`).

## Paso 5 · Emails de aviso (Resend)

1. Creá una cuenta gratis en **resend.com**, con el email donde querés recibir las ventas.
2. **API Keys → Create API Key** → pegala en Vercel como `RESEND_API_KEY`.
3. En Vercel agregá `AVISOS_EMAIL` con ese mismo email.
4. (Más adelante, con dominio propio) verificá el dominio en Resend y agregá `RESEND_FROM`, por ejemplo `Nací Reina <ventas@nacireina.com.ar>`. Así también le llega un email de confirmación a cada cliente.

## Paso 6 · Contraseña del editor

En Vercel agregá `ADMIN_CLAVE` con una contraseña larga que solo sepas vos (por ejemplo, tres palabras y un número).

## Paso 6 bis · Pago por transferencia (10% OFF)

En Vercel → Settings → Environment Variables agregá (los escribís vos, no los pegues en ningún chat):
- `TRANSFERENCIA_ALIAS`: tu alias (ej. nacireina.calzados). Si preferís, o además, `TRANSFERENCIA_CBU` con el CBU/CVU.
- `TRANSFERENCIA_TITULAR`: el nombre del titular de la cuenta, para que el cliente vea a quién le transfiere.
- (opcional) `TRANSFERENCIA_BANCO`: el banco o billetera (ej. Mercado Pago).
Después, Redeploy. Recién ahí aparece la opción en el checkout. El porcentaje se cambia en `productos.js` → `transferencia`.

Cómo funciona: el cliente confirma, ve tus datos y el monto, y te manda el comprobante por WhatsApp. El pedido aparece en el editor como **Esperando transferencia** (y los pares quedan reservados). Cuando veas la plata, pasalo a **Pagado** (se crea el envío en Zipnova). Si no paga, pasalo a **Cancelado** y los pares vuelven solos al stock.

## Paso 7 · Píxel de Meta (medir ventas de Instagram) · opcional

1. Entrá a **business.facebook.com/events_manager** con la cuenta que maneja el Instagram de la tienda.
2. **Conectar orígenes de datos → Web → Conectar** y ponele de nombre "Nací Reina".
3. Cuando pregunte cómo instalarlo, elegí **"Instalar el código manualmente"** o cerrá esa ventana: no hace falta copiar el código.
4. Ya está cargado en la tienda (`metaPixel` en `productos.js`, píxel 804847412723249). Si algún día cambia, pasale el número nuevo a Claude o cargalo en Vercel como `META_PIXEL_ID`.

La tienda le avisa a Meta cuando alguien: entra, mira un producto, agrega al carrito, empieza a pagar y compra (con el monto).

---

## Dónde se pegan las claves en Vercel

Proyecto → **Settings → Environment Variables**. Después de agregarlas: **Deployments → ⋯ → Redeploy**.

| Variable | Para qué | Obligatoria |
|---|---|---|
| `MP_ACCESS_TOKEN` | Cobrar con Mercado Pago | Sí |
| `MP_PUBLIC_KEY` | Formulario de tarjeta dentro de la tienda | Recomendado |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Base de datos (se crean solas en el paso 2) | Sí |
| `ADMIN_CLAVE` | Entrar al editor | Sí |
| `ZIPNOVA_API_TOKEN`, `ZIPNOVA_API_SECRET`, `ZIPNOVA_ACCOUNT_ID` | Cotizar y crear envíos por correo | Sí, para envíos automáticos |
| `ZIPNOVA_ORIGIN_ID` | Dirección de origen en Zipnova | No |
| `ZIPNOVA_CREAR_ENVIOS` | Poné `no` si preferís crear los envíos a mano | No |
| `RESEND_API_KEY`, `AVISOS_EMAIL` | Email con cada venta | Recomendado |
| `META_PIXEL_ID` | Píxel de Meta: medir visitas y ventas que vienen de Instagram | No |
| `TRANSFERENCIA_ALIAS` / `TRANSFERENCIA_CBU`, `TRANSFERENCIA_TITULAR` | Pago por transferencia con 10% OFF | No |
| `RESEND_FROM` | Email de confirmación al cliente (dominio propio) | No |

**Nunca** compartas estas claves por WhatsApp ni las pegues en la página: solo van en Vercel.

---

## Antes de abrir: compra de prueba

1. Con las credenciales de **prueba** de Mercado Pago, hacé una compra con envío a domicilio.
2. Revisá que: te llegue el email, el pedido aparezca en el editor y el envío aparezca en Zipnova (cancelalo desde Zipnova si era de prueba).
3. Cambiá a las credenciales de **producción** y listo.

---

## Uso diario

**Editor:** entrá a `tu-tienda.vercel.app/admin.html` con tu contraseña.

- **Stock y precios**: tocá un talle para marcarlo agotado (queda tachado) o disponible (verde). También podés marcar un color agotado, el modelo entero agotado, o cambiar el precio. Tocá **Guardar**: la tienda se actualiza en segundos.
- **Pedidos**: todas las ventas, con el seguimiento del correo. Cambiá el estado (despachado, entregado…) y usá **Avisar al cliente** para mandarle un WhatsApp armado.
- **Estado**: muestra qué está configurado y qué falta.

**Cuando entra una venta con envío:** imprimí la etiqueta desde el panel de Zipnova → pegala en la caja → entregala al correo.
**Cuando entra una venta con retiro:** prepará el pedido y avisale al cliente desde el editor.
**Si alguien usa el botón de arrepentimiento:** te llega un email. Coordiná la devolución y devolvé el dinero desde Mercado Pago.

## Cosas que se cambian en `productos.js` (pedíselas a Claude)

- Tu número de **WhatsApp** (hoy está vacío: el botón de consultas no aparece hasta cargarlo).
- El monto de **envío gratis** (hoy $165.000).
- El **peso y tamaño de las cajas**: El correo cobra según eso. Pesá y medí una caja de cada tipo.
- Productos nuevos, fotos, nombres y descripciones.

## Asistente de WhatsApp (IA que contesta sola)

El código está en `api/whatsapp.js`. No hace nada hasta que estén cargadas las claves en Vercel.

1. **YCloud** (conecta el número; plan Free, sin abono): crear la cuenta en https://www.ycloud.com → WhatsApp → conectar el número con la opción **"WhatsApp Business App" (coexistencia)**: se escanea un código desde el WhatsApp Business del celular, que sigue andando igual. Hay que abrir la app al menos una vez cada 13 días.
2. En YCloud → Developers → **API Keys**: crear una clave → en Vercel: `YCLOUD_API_KEY`.
3. En YCloud → Developers → **Webhooks**: agregar `https://nacireinacalzados.com/api/whatsapp` con los eventos `whatsapp.inbound_message.received` y `whatsapp.smb.message.echoes` → copiar el secreto (`whsec_…`) → en Vercel: `YCLOUD_WEBHOOK_SECRET`.
4. **IA**: crear la cuenta en https://console.anthropic.com, cargar saldo y crear una clave → en Vercel: `ANTHROPIC_API_KEY`.
5. En Vercel: `WHATSAPP_AVISOS_NUMERO` = el celular que recibe los avisos, con 549 adelante (ej. `5491123456789`).
6. Redeploy (o cualquier push a `main`) para que tome las variables.

Opcional:
- `WHATSAPP_PLANTILLA_AVISO`: WhatsApp solo deja mandarle un mensaje libre al dueño si él le escribió al número del local en las últimas 24 hs. Para que el aviso llegue siempre, crear en YCloud una plantilla de tipo *Utilidad*, idioma *Español (ARG)*, con el texto `Un cliente necesita que lo atiendas. Cliente: {{1}}. Motivo: {{2}}. Resumen: {{3}}` y poner acá su nombre. Sin plantilla, el aviso llega igual por email (`AVISOS_EMAIL`).
- `WHATSAPP_BOT` = `no`: apaga el asistente.
- `asistente.extra` en `productos.js`: texto libre con información extra para la IA (horarios, etc.).

Cómo se comporta: contesta solo mensajes de texto; con audios, fotos, reclamos, pedidos ya hechos o dudas le avisa al dueño y se calla 12 horas en ese chat. Si el dueño contesta desde el celular, también se calla 12 horas en ese chat.

## Recordatorio de carrito abandonado

`api/carrito.js`: cuando alguien completa el paso 1 del checkout (email) y no compra, a las 2 horas le llega un email con su carrito y un botón para retomarlo. Si compra antes, se cancela solo. Un recordatorio por persona cada 7 días; cada email tiene link de baja.

Solo funciona si en Vercel están `RESEND_API_KEY` y **`RESEND_FROM`** (ej. `Nací Reina <ventas@nacireinacalzados.com>`, con el dominio verificado en Resend). Para apagarlo: `CARRITO_RECORDATORIO` = `no`.

## Opiniones de compradores

`api/_opiniones.js`: 10 días después de cada compra pagada (con Mercado Pago, o por transferencia cuando se marca Pagado en el editor; 3 días si retira en el local) al cliente le llega un email para puntuar su compra. Las opiniones aparecen en la página de cada producto. Al local le llega cada opinión por email (`AVISOS_EMAIL`) con un link para ocultarla si es spam o un insulto. Necesita `RESEND_FROM`. Para no pedir opiniones: `OPINIONES_PEDIR` = `no`.
