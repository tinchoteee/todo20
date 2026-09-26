// Aplica al catálogo los cambios hechos desde el editor (admin.html): precios y productos agotados.
// Lo usan la página y el servidor, así los dos ven exactamente lo mismo.
//
// Forma de los ajustes guardados:
// { productos: { "7": { precio: 32000, agotado: false,
//                       colores: { "verde": { precio: 34000, agotado: false, sinTalle: [35, 44] } } } } }
(function (fn) {
  if (typeof module !== "undefined" && module.exports) module.exports = fn;
  else window.aplicarAjustes = fn;
})((function () {
  function aplicarAjustes(productos, ajustes) {
    const aj = (ajustes && ajustes.productos) || {};
    return productos.map(original => {
      const a = aj[original.id] || {};
      const p = { ...original, colores: (original.colores || []).map(c => ({ ...c })) };
      if (a.precio > 0) p.precio = a.precio;
      p.agotado = Boolean(a.agotado);
      for (const c of p.colores) {
        const ac = (a.colores && a.colores[c.id]) || {};
        if (ac.precio > 0) c.precio = ac.precio;
        c.agotado = Boolean(ac.agotado);
        c.sinTalle = Array.isArray(ac.sinTalle) ? ac.sinTalle.map(Number) : [];
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
  // Rango de precios del modelo (para mostrar "Desde $X" cuando los colores tienen precios distintos)
  aplicarAjustes.rangoDe = function (p) {
    const lista = (p.colores && p.colores.length ? p.colores.map(c => aplicarAjustes.precioDe(p, c.id)) : [p.precio || 0]).filter(n => n > 0);
    return lista.length ? { min: Math.min(...lista), max: Math.max(...lista) } : null;
  };
  return aplicarAjustes;
})());
