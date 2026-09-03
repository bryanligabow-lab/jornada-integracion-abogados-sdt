# Jornada de Integración · Colegio de Abogados de Santo Domingo de los Tsáchilas

Página web **exclusivamente móvil** con la invitación al evento y un formulario que
registra la asistencia en una **base de datos (Google Sheets)** y envía un
**correo de notificación** al organizador más una **confirmación al colega**.

| Pieza | Tecnología | Costo |
|---|---|---|
| Página (invitación + formulario) | HTML/CSS/JS estático en **GitHub Pages** | $0 |
| Base de datos | **Google Sheets** | $0 |
| Backend + correos | **Google Apps Script** (`MailApp`) | $0 |

---

## Estructura

```
index.html              Invitación + formulario de registro (móvil)
lista.html              Panel privado: ver registros y descargar CSV
assets/css/style.css    Estilos
assets/js/config.js     ← AQUÍ se pega la URL del backend
assets/js/app.js        Validación y envío
assets/img/escudo.jpg   Escudo institucional
backend/Code.gs         Código para Google Apps Script
```

---

## Paso 1 · Crear la base de datos (2 min)

1. Entra a <https://sheets.google.com> con la cuenta **ab.lenincarrion21@gmail.com**.
2. Crea una hoja nueva y nómbrala `Asistencia Jornada Integración 2026`.

> El código crea sola la pestaña `Asistencia` con sus cabeceras la primera vez que
> recibe un registro.

## Paso 2 · Publicar el backend (5 min)

1. En esa misma hoja: menú **Extensiones → Apps Script**.
2. Borra el contenido de `Código.gs` y pega **todo** el archivo [`backend/Code.gs`](backend/Code.gs).
3. Guarda (💾). Ejecuta la función `prueba` una vez y **autoriza los permisos**
   (Google mostrará "Esta app no está verificada" → *Configuración avanzada* →
   *Ir a … (no seguro)* → **Permitir**). Es tu propio script, es normal.
4. Botón **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo (ab.lenincarrion21@gmail.com)**
   - Quién tiene acceso: **Cualquier persona**
5. Copia la **URL de la app web** (termina en `/exec`).

## Paso 3 · Conectar la página

Abre `assets/js/config.js` y reemplaza el marcador por tu URL:

```js
window.APP_CONFIG = {
  ENDPOINT: "https://script.google.com/macros/s/AKfy...../exec",
  ...
};
```

Guarda, haz commit y sube el cambio. En 1–2 minutos GitHub Pages se actualiza.

## Paso 4 · Verificar

- `https://<usuario>.github.io/<repo>/` → invitación y formulario.
- `https://<usuario>.github.io/<repo>/lista.html` → clave `casdt2026` (cámbiala en
  `CONFIG.ADMIN_KEY` dentro de `Code.gs`).
- Prueba de humo del backend: abre `TU_URL/exec?ping=1` → debe responder
  `{"ok":true,...}`.

---

## Qué se guarda por registro

`Fecha de registro · Código · Nombres y apellidos · Cédula · Matrícula · Celular ·
Correo · Asistencia · Actividades deportivas · Comentario · Origen`

Si una **cédula ya existe**, el registro se **actualiza** en lugar de duplicarse.

## Correos

- **Al organizador** (`CONFIG.NOTIFICAR`): aviso por cada registro con todos los
  datos y el acumulado (confirmados / no asisten / total de registros).
- **Al colega**: confirmación con fecha, hora y lugar (se puede desactivar con
  `CONFIG.CONFIRMAR_AL_COLEGA = false`).

Límite de Gmail gratuito: ~100 correos/día (2 por registro ⇒ ~50 registros diarios).
Si esperas más, pon `CONFIRMAR_AL_COLEGA = false`.

## Cambiar el correo de notificación

Edita `CONFIG.NOTIFICAR` en `backend/Code.gs` y vuelve a implementar
(**Implementar → Administrar implementaciones → editar ✏️ → Versión: Nueva → Implementar**).
La misma URL sigue funcionando.

---

### Nota de seguridad

Este repositorio **no contiene contraseñas ni claves de Google**. La única clave
presente es `ADMIN_KEY` (acceso de lectura al listado); cámbiala si el repositorio
es público.
