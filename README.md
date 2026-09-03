# Jornada de Integración · Colegio de Abogados de Santo Domingo de los Tsáchilas

Página web **exclusivamente móvil** con la invitación al evento y un formulario que
registra la asistencia en una base de datos, avisa por correo al organizador y
envía una confirmación al colega que se inscribe.

**Sábado 05 de septiembre de 2026 · 10h00 · Quinta del Dr. Carlos Vivanco**

## Enlaces

| Pieza | Enlace |
|---|---|
| Invitación + formulario | https://bryanligabow-lab.github.io/jornada-integracion-abogados-sdt/ |
| Panel de inscritos | [`/lista.html`](https://bryanligabow-lab.github.io/jornada-integracion-abogados-sdt/lista.html) · clave `casdt2026` |
| Base de datos (Hoja de Google) | https://docs.google.com/spreadsheets/d/1bnORsaQ_-YEZ_59dnWrznqVoAC7FbzgRa4-AKK-IZ-Y/edit |
| Editor del backend | https://script.google.com/home/projects/1qxf_7HSDDtRorywDXKZFClCBZk1-yADlb4Zi4N7LItvYt7U1ceinIYPV/edit |

Todo en planes gratuitos. Cuenta de Google del backend: `bryanligabow@gmail.com`.

## Cómo funciona

1. El colega llena el formulario (GitHub Pages).
2. La página hace `POST` a la app web de **Google Apps Script**.
3. El script valida, guarda una fila en la hoja `Asistencia` y envía dos correos:
   - **aviso al organizador** → `ab.lenincarrion21@gmail.com`
   - **confirmación al colega**, firmada como el Colegio, con respuesta dirigida
     a ese mismo correo.
4. `lista.html` lee la misma app web con la clave de administrador.

Si una **cédula ya existe**, el registro se **actualiza** en lugar de duplicarse.
Las filas sin cédula (por ejemplo, las que quedan al borrar a mano en la hoja)
se ignoran en el listado y en los totales.

## Estructura

```
index.html                       Invitación + formulario (móvil)
lista.html                       Panel privado: KPIs, listado y CSV
assets/css/style.css             Estilos
assets/js/config.js              URL del backend  ← lo único que se cambia
assets/js/app.js                 Validación y envío
assets/img/escudo.jpg            Escudo institucional
backend/Code.gs                  Backend en producción (Google Apps Script)
backend-netlify/                 Backend de respaldo (Netlify + Blobs)
```

## Endpoints

| Petición | Qué hace |
|---|---|
| `POST /exec` | Guarda el registro (JSON en el cuerpo) |
| `GET /exec?ping=1` | Prueba de vida |
| `GET /exec?admin=casdt2026` | Lista completa en JSON |
| `GET /exec?admin=casdt2026&formato=csv` | Descarga CSV |

La clave está en `CONFIG.ADMIN_KEY`, dentro de `backend/Code.gs`.

## Tareas del organizador

- **Ver quién se inscribió:** abre `lista.html` o la Hoja de Google.
- **Borrar un registro:** elimina la fila en la hoja (clic derecho → *Eliminar fila*).
- **Borrar todas las pruebas:** en el editor del script, ejecuta `limpiarPruebas`.
- **Cambiar el correo que recibe los avisos:** edita `CONFIG.NOTIFICAR` y vuelve a
  implementar (*Implementar → Administrar las implementaciones → ✏️ → Versión:
  Nueva versión → Implementar*). La URL no cambia.

## Cómo publicar cambios

**Página:** `git push` y GitHub Pages se actualiza en 1–2 minutos. Los assets van
versionados (`style.css?v=4`); si cambias CSS o JS, sube el número para que nadie
quede con la versión vieja en caché.

**Backend:** pega `backend/Code.gs` en el editor, guarda, y vuelve a implementar
como se indica arriba. **Guardar no basta**: la app web sigue sirviendo la última
versión implementada.

## Respaldo

`backend-netlify/` está desplegado y funcionando en
`https://registro-jornada-abogados-sdt.netlify.app/registro` (Netlify Blobs como
base de datos). Si Google falla, cambia `ENDPOINT` en `assets/js/config.js` por esa
URL y sube el cambio. Ojo: ese respaldo **no envía la confirmación al colega**.

## Límites

Gmail gratuito permite ~100 correos al día y aquí se envían 2 por registro, así que
el techo son ~50 inscripciones diarias. Si esperas más, pon
`CONFIG.CONFIRMAR_AL_COLEGA = false` y vuelve a implementar.

### Nota de seguridad

El repositorio no contiene contraseñas ni tokens. La única clave es la de lectura
del panel (`casdt2026`); cámbiala si el repositorio queda público.
