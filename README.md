# Rossé · Tienda de regalos

Diseñé y desarrollé el sitio de Rossé, una tienda de regalos en Florida, Valle del Cauca. Desde el catálogo, los clientes pueden explorar desayunos sorpresa, arreglos florales y anchetas y preparar su pedido por WhatsApp.

**[Ver sitio en producción](https://rossetienda.online/)**

## Diseño visual

La portada abre con **«Regala una sonrisa»** y una foto protagonista. La composición asimétrica, la tipografía serif y las fotografías reales de Rossé definen el estilo editorial. La navegación flotante y los bordes redondeados acompañan una interfaz adaptable a celulares.

| Color | Código |
| --- | --- |
| Rosa claro | `#FDE9EF` |
| Rosa pastel | `#F2B8C6` |
| Rosa medio | `#E88CA4` |
| Rosa intenso | `#C23D6B` |
| Borgoña | `#8A1F4B` |

## Funcionalidades

- Catálogo con búsqueda, filtros y páginas por categoría.
- Fichas con fotos, contenido del regalo, precios y descuentos automáticos.
- Galería enlazada a los productos y formulario de WhatsApp con fecha y preferencias.
- Panel privado para gestionar productos, fotos, precios y ofertas.

## Tecnología

HTML, CSS y JavaScript para la tienda. Cloudflare Workers, D1 y R2 para el panel, los datos y las fotos. El código y las instrucciones del panel están en [management/](management/).

Para revisar la tienda estática en local, ejecuta `python3 -m http.server 8000` desde la raíz y abre `http://localhost:8000`.
