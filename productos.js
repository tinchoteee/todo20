// Catálogo de Nací Reina Calzados.
// Lo usan la página (para mostrar los productos) y el servidor (para cobrar el precio correcto).
// precio: 0 = "Consultar precio" (no se puede pagar online hasta que tenga precio).
// Un color puede tener su propio precio (precio dentro del color); si no, usa el del modelo.
// foto: archivo dentro de la carpeta fotos/. Un color puede tener su propia foto.
(function (catalogo) {
  if (typeof module !== "undefined" && module.exports) module.exports = catalogo;
  else window.CATALOGO = catalogo;
})({
  // WhatsApp del local: 549 + código de área sin 0 + número sin 15. Ej: 5491123456789
  whatsapp: "",

  local: { direccion: "Av. de Mayo 1614, Ramos Mejía", cp: "1704" },

  envio: {
    // Envío gratis cuando los productos suman este monto o más. 0 = sin envío gratis.
    gratisDesde: 150000,
    // Transportista preferido: si Andreani cotiza, se muestran solo sus opciones.
    transportista: "andreani",
    // Caja de cada par (peso en gramos, medidas en cm). Andreani cobra según peso y tamaño.
    // Un producto puede usar otra caja con  caja: "bota-alta".
    cajas: {
      "botas":      { peso: 1500, alto: 13, ancho: 30, largo: 35 },
      "bota-alta":  { peso: 2000, alto: 14, ancho: 32, largo: 45 },
      "zapatos":    { peso: 1100, alto: 12, ancho: 21, largo: 32 },
      "zapatillas": { peso: 1100, alto: 13, ancho: 22, largo: 33 },
      "sandalias":  { peso: 900,  alto: 12, ancho: 21, largo: 32 },
      "suecos":     { peso: 900,  alto: 12, ancho: 21, largo: 32 }
    },
    // Solo se usa mientras Zipnova no esté configurado: costo fijo por zona.
    zonasDeRespaldo: { "CABA": 5000, "Buenos Aires": 6500, "resto": 9500 }
  },

  productos: [
    {id:1,cat:"botas",caja:"bota-alta",nombre:"Bota texana bordada",desc:"Caña alta, bordado western, taco de madera.",precio:45000,talles:[35,36,37,38,39,40],colores:[{id:"marron",nombre:"Chocolate",hex:"#5A2A1E",precio:48000,foto:"fotos/bota-texana-bordada-marron.jpg"},{id:"blanco",nombre:"Blanco",hex:"#F2EFEA",precio:45000,foto:"fotos/bota-texana-bordada-blanca.webp"}]},
    {id:2,cat:"botas",nombre:"Bota texana corta",desc:"Caña corta, cierre lateral, puntera bordada.",precio:28000,talles:[35,36,37,38,39,40],colores:[{id:"suela",nombre:"Suela",hex:"#7B3F1E",foto:"fotos/bota-texana-corta-marron.webp"}]},
    {id:13,cat:"botas",nombre:"Bota texana punta cuadrada",desc:"Caña media, cierre lateral, taco ancho.",precio:28000,talles:[35,36,37,38,39,40],colores:[{id:"marron",nombre:"Marrón",hex:"#7A4A2A",foto:"fotos/bota-texana-punta-cuadrada-marron.jpg"},{id:"negro",nombre:"Negro",hex:"#1C1C1C"}]},
    {id:14,cat:"botas",nombre:"Bota texana con tachas",desc:"Tachas doradas y plateadas, cierre lateral.",precio:45000,talles:[35,36,37,38,39,40],colores:[{id:"blanco",nombre:"Blanco",hex:"#F2EFEA",foto:"fotos/bota-texana-tachas-blanca.jpg"},{id:"negro",nombre:"Negro",hex:"#1C1C1C"}]},
    {id:9,cat:"botas",nombre:"Bota corta con tachas",desc:"Elásticos laterales, tachas, taco de madera.",precio:30000,talles:[35,36,37,38,39,40],colores:[{id:"marron",nombre:"Marrón",hex:"#4E2E1E",foto:"fotos/bota-corta-tachas-marron.jpg"},{id:"negro",nombre:"Negro",hex:"#1C1C1C"}]},
    {id:3,cat:"botas",caja:"bota-alta",nombre:"Bota texana con flecos",desc:"Gamuza, flecos laterales y tachas.",precio:55000,talles:[35,36,37,38,39,40],colores:[{id:"marron",nombre:"Marrón",hex:"#3E2418",foto:"fotos/bota-flecos-tachas-marron.jpg"},{id:"negro",nombre:"Negro",hex:"#1C1C1C",foto:"fotos/bota-flecos-tachas-negra.jpg"}]},
    {id:12,cat:"botas",caja:"bota-alta",nombre:"Bota caña alta con flecos",desc:"Caña fruncida, tiras con argollas, punta fina.",precio:50000,talles:[35,36,37,38,39,40],colores:[{id:"negro",nombre:"Negro",hex:"#1C1C1C",foto:"fotos/bota-cana-alta-flecos-negra.webp"},{id:"blanco",nombre:"Blanco",hex:"#F2EFEA"}]},
    {id:4,cat:"botas",nombre:"Bota caña fruncida",desc:"Caña ancha fruncida, punta fina, taco bajo.",precio:40000,talles:[35,36,37,38,39,40],colores:[{id:"marron",nombre:"Marrón",hex:"#5C3A26",foto:"fotos/bota-fruncida-marron.webp"},{id:"blanco",nombre:"Blanco",hex:"#F2EFEA",foto:"fotos/bota-fruncida-blanca.jpg"},{id:"negro",nombre:"Negro",hex:"#1C1C1C"},{id:"bordo",nombre:"Bordó",hex:"#5E1A22"}]},
    {id:5,cat:"botas",nombre:"Bota fruncida con hebillas",desc:"Caña fruncida, dos hebillas, taco chino.",precio:40000,talles:[35,36,37,38,39,40],colores:[{id:"negro",nombre:"Negro",hex:"#1C1C1C",foto:"fotos/bota-hebillas-negra.jpg"}]},
    {id:6,cat:"zapatos",nombre:"Zapato acordonado con tachas",desc:"Plataforma dentada, tachas plateadas.",precio:0,talles:[35,36,37,38,39,40],foto:"fotos/zapato-acordonado-bordo.webp",colores:[{id:"bordo",nombre:"Bordó",hex:"#5E1A22"}]},
    {id:7,cat:"zapatillas",nombre:"Zapatillas Campus",desc:"Gamuza, cordones anchos, suela de goma.",precio:30000,talles:[35,36,37,38,39,40,41,42,43,44],colores:[{id:"verde",nombre:"Verde",hex:"#095D13",foto:"fotos/zapatilla-campus-verde.webp"},{id:"negro",nombre:"Negro",hex:"#000000",foto:"fotos/zapatilla-campus-negra.jpg"}]},
    {id:8,cat:"zapatillas",nombre:"Zapatillas Samba",desc:"Tiras laterales, suela caramelo.",precio:30000,talles:[37,38,39,40,41,42,43,44,45],colores:[{id:"negro",nombre:"Negro",hex:"#1C1C1C",foto:"fotos/zapatilla-samba-negra.jpg"},{id:"marron",nombre:"Marrón",hex:"#9A5A32",foto:"fotos/zapatilla-samba-marron.jpg"}]},
    {id:10,cat:"zapatillas",nombre:"Zapatillas urbanas gamuza",desc:"Gamuza, cordones beige, suela caramelo.",precio:0,talles:[35,36,37,38,39,40],foto:"fotos/zapatilla-gamuza-marron.jpg",colores:[{id:"marron",nombre:"Marrón",hex:"#3F2E22"}]},
    // Catálogo Pontecomoda (sin precio todavía)
    {id:15,cat:"zapatillas",nombre:"Zapatillas Samba sin talón",desc:"Estilo Samba abierta atrás, se calza como un sueco. Suela caramelo.",precio:0,talles:[35,36,37,38,39,40,41],colores:[{id:"blanco",nombre:"Blanco y negro",hex:"#F2EFEA",foto:"fotos/zapatilla-samba-sueco-blanca.jpg"}]},
    {id:16,cat:"sandalias",nombre:"Sandalia plataforma con ojalillos",desc:"Dos tiras con ojalillos plateados, hebilla al tobillo, base alta.",precio:0,talles:[35,36,37,38,39,40],colores:[{id:"negro",nombre:"Negro",hex:"#1C1C1C",foto:"fotos/sandalia-plataforma-ojalillos-negra.jpg"}]},
    {id:17,cat:"suecos",nombre:"Sueco de rafia con hebilla",desc:"Tejido de rafia, tira con hebilla y plantilla de corcho.",precio:0,talles:[35,36,37,38,39,40],colores:[{id:"marron",nombre:"Marrón",hex:"#6B4A34",foto:"fotos/sueco-rafia-hebilla-marron.jpg"}]},
    {id:18,cat:"sandalias",nombre:"Sandalia de tiras cruzadas",desc:"Chinela de tiras anchas cruzadas, suela liviana.",precio:0,talles:[35,36,37,38,39,40],colores:[{id:"negro",nombre:"Negro",hex:"#1C1C1C",foto:"fotos/sandalia-tiras-cruzadas-negra.jpg"}]},
    {id:19,cat:"sandalias",nombre:"Sandalia con abrojo",desc:"Dos tiras con abrojo y tira al talón. Viene en varias combinaciones.",precio:0,talles:[35,36,37,38,39,40],colores:[{id:"negro",nombre:"Negro",hex:"#1C1C1C",foto:"fotos/sandalia-abrojo-negra.jpg"}]}
  ]
});
