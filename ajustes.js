// Aplica al catálogo los cambios hechos desde el editor (admin.html): precios y productos agotados.
// Lo usan la página y el servidor, así los dos ven exactamente lo mismo.
//
// Forma de los ajustes guardados:
// { productos: { "7": { precio: 32000, agotado: false,
//                       colores: { "verde": { precio: 34000, agotado: false, sinTalle: [35, 44] } } } },
//   pares: { "7|verde|38": 3 } }   ← pares que hay de cada talle (se descuentan solos con cada venta).
//                                   Un talle sin número no lleva la cuenta; con 0 queda agotado.
(function (fn) {
  if (typeof module !== "undefined" && module.exports) module.exports = fn;
  else window.aplicarAjustes = fn;
})((function () {
  function aplicarAjustes(productos, ajustes) {
    const aj = (ajustes && ajustes.productos) || {};
    const pares = (ajustes && ajustes.pares) || {};
    // Los productos o colores con oculto:true están desactivados: no se muestran ni se pueden comprar
    return productos.filter(p => !p.oculto).map(original => {
      const a = aj[original.id] || {};
      const p = { ...original, colores: (original.colores || []).filter(c => !c.oculto).map(c => ({ ...c })) };
      if (a.precio > 0) p.precio = a.precio;
      p.agotado = Boolean(a.agotado);
      for (const c of p.colores) {
        const ac = (a.colores && a.colores[c.id]) || {};
        if (ac.precio > 0) c.precio = ac.precio;
        c.agotado = Boolean(ac.agotado);
        c.sinTalle = Array.isArray(ac.sinTalle) ? ac.sinTalle.map(Number) : [];
        c.pares = {};
        for (const t of p.talles) {
          const n = pares[`${p.id}|${c.id}|${t}`];
          if (n == null || n === "") continue;
          c.pares[t] = Math.max(0, parseInt(n, 10) || 0);
          if (c.pares[t] === 0 && !c.sinTalle.includes(t)) c.sinTalle.push(t);
        }
      }
      // Si todos los colores están agotados, o todos sus talles, el modelo queda agotado
      if (p.colores.length && p.colores.every(c => c.agotado || p.talles.every(t => c.sinTalle.includes(t)))) p.agotado = true;
      return p;
    });
  }
  // Precio de un producto en un color (el del color si tiene uno propio; si no, el del modelo). 0 = a consultar.
  aplicarAjustes.precioDe = function (p, colorId) {
    const c = (p.colores || []).find(x => x.id === colorId);
    return (c && c.precio > 0 ? c.precio : p.precio) || 0;
  };
  // Pares que quedan de un talle en un color (null = no se lleva la cuenta)
  aplicarAjustes.paresDe = function (p, colorId, talle) {
    const c = (p.colores || []).find(x => x.id === colorId);
    return c && c.pares && c.pares[talle] != null ? c.pares[talle] : null;
  };
  // Rango de precios del modelo (para mostrar "Desde $X" cuando los colores tienen precios distintos)
  aplicarAjustes.rangoDe = function (p) {
    const lista = (p.colores && p.colores.length ? p.colores.map(c => aplicarAjustes.precioDe(p, c.id)) : [p.precio || 0]).filter(n => n > 0);
    return lista.length ? { min: Math.min(...lista), max: Math.max(...lista) } : null;
  };
  // Descuento por monto de compra (ver "descuento" en productos.js). Recibe [{ precio, cant }] y devuelve
  // el precio con descuento de cada línea (redondeado a centavos) y los totales. Página y servidor usan esta misma cuenta.
  // extra: porcentaje de descuento por pagar con transferencia (se aplica después del de monto, solo a los productos).
  aplicarAjustes.conDescuento = function (lineas, cfg, extra) {
    const subtotal = lineas.reduce((a, l) => a + l.precio * l.cant, 0);
    const pct = cfg && cfg.desde > 0 && subtotal >= cfg.desde ? Number(cfg.porcentaje) || 0 : 0;
    const suma = ps => Math.round(ps.reduce((a, p, i) => a + p * lineas[i].cant, 0) * 100) / 100;
    const conMonto = lineas.map(l => Math.round(l.precio * (100 - pct)) / 100);
    const totalMonto = suma(conMonto);
    const pctT = Number(extra) > 0 ? Number(extra) : 0;
    const precios = pctT ? conMonto.map(p => Math.round(p * (100 - pctT)) / 100) : conMonto;
    const total = suma(precios);
    return { subtotal, porcentaje: pct, descuento: Math.round((subtotal - totalMonto) * 100) / 100,
      porcentajeTransferencia: pctT, descuentoTransferencia: Math.round((totalMonto - total) * 100) / 100, total, precios };
  };
  return aplicarAjustes;
})());
