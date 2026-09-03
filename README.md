# Jornada de Integración · Colegio de Abogados de Santo Domingo de los Tsáchilas

Página web **exclusivamente móvil** con la invitación al evento y un formulario que
registra la asistencia en una base de datos y la deja visible en un panel privado.

| Pieza | Dónde vive | Enlace |
|---|---|---|
| Invitación + formulario | GitHub Pages | https://bryanligabow-lab.github.io/jornada-integracion-abogados-sdt/ |
| Panel de inscritos | GitHub Pages | [`/lista.html`](https://bryanligabow-lab.github.io/jornada-integracion-abogados-sdt/lista.html) · clave `casdt2026` |
| Base de datos + API | Netlify (función `registro`) | https://registro-jornada-abogados-sdt.netlify.app/registro |
| Respaldo y correo | Netlify Forms | https://app.netlify.com/projects/registro-jornada-abogados-sdt/forms |

Todo en planes gratuitos. Cuenta de Netlify: `bryanligabow@gmail.com`.

---

## Cómo funciona

1. El colega llena el formulario en GitHub Pages.
2. La página hace `POST` a la función `registro` en Netlify.
3. La función valida, guarda el registro en **Netlify Blobs** (un registro por
   cédula: si la cédula ya existe **actualiza**, no duplica) y lo reenvía a
   **Netlify Forms**, que es lo que dispara el correo de notificación.
4. `lista.html` lee esa misma función con la clave de administrador.

## Estructura

```
index.html                          Invitación + formulario (móvil)
lista.html                          Panel privado: KPIs, listado y CSV
assets/css/style.css                Estilos
assets/js/config.js                 URL del backend
assets/js/app.js                    Validación y envío
assets/img/escudo.jpg               Escudo institucional
backend-netlify/                    Backend desplegado en Netlify
  netlify/functions/registro.mts      La función completa
  public/index.html                   Formulario estático que Netlify Forms detecta
backend/Code.gs                     Alternativa en Google Apps Script (ver abajo)
```

## Endpoints

| Petición | Qué hace |
|---|---|
| `POST /registro` | Guarda el registro (JSON en el cuerpo) |
| `GET /registro?ping=1` | Prueba de vida |
| `GET /registro?admin=casdt2026` | Lista completa en JSON |
| `GET /registro?admin=casdt2026&formato=csv` | Descarga CSV |
| `GET /registro?admin=casdt2026&borrar=CEDULA` | Elimina un registro |

La clave está en `CLAVE_ADMIN`, dentro de `backend-netlify/netlify/functions/registro.mts`.

## Volver a desplegar el backend

Pide el comando al MCP de Netlify (`deploy-site` con
`siteId a7ce1320-981d-4201-a723-b16051ee6930`) y **ejecútalo dentro de
`backend-netlify/`**, no en la raíz del repo.

## Falta un paso: activar el correo

Netlify guarda cada registro, pero el aviso por correo hay que encenderlo una vez:

1. Entra a **https://app.netlify.com/projects/registro-jornada-abogados-sdt/configuration/notifications**
2. *Add notification* → **Email notification**
3. Event: *New form submission* · Form: **asistencia**
4. Email to notify: **ab.lenincarrion21@gmail.com** → *Save*

### Limitación conocida

Netlify Forms avisa **al organizador**, pero no envía una confirmación al colega
que se inscribe. Por eso la página ya no promete ese correo: muestra el código de
registro en pantalla.

Si hace falta que cada colega reciba su confirmación por correo, usa la
alternativa en `backend/Code.gs` (Google Apps Script + Google Sheets): envía los
dos correos desde la cuenta de Gmail del Colegio. Requiere instalarlo desde esa
cuenta de Google; los pasos están comentados dentro del archivo.

---

### Nota de seguridad

El repositorio no contiene contraseñas ni tokens. La única clave es la de lectura
del panel (`casdt2026`); cámbiala si el repositorio queda público.
