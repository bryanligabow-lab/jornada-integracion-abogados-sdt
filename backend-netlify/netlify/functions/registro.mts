import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

/**
 * Registro de asistencia · Jornada de Integración (Colegio de Abogados de SDT)
 *
 *  POST /registro              → guarda el registro y notifica por correo
 *  GET  /registro?ping=1       → prueba de vida
 *  GET  /registro?admin=CLAVE  → lista completa (la usa lista.html)
 *  GET  /registro?admin=CLAVE&borrar=CEDULA → elimina un registro
 *  GET  /registro?admin=CLAVE&formato=csv → descarga CSV
 *
 *  Base de datos: Netlify Blobs (un blob por cédula).
 *  Correo:        se reenvía a Netlify Forms, que envía la notificación.
 */

const CLAVE_ADMIN = "casdt2026";
const STORE = "asistencia-jornada-2026";
const FORM = "asistencia";

// La página vive en GitHub Pages, así que el navegador llama a otro dominio:
// estas cabeceras son imprescindibles para que el formulario funcione.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type Registro = {
  fecha: string;
  codigo: string;
  nombre: string;
  cedula: string;
  matricula: string;
  telefono: string;
  email: string;
  asistencia: string;
  deporte: string;
  comentario: string;
  origen: string;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });

const limpiar = (v: unknown) =>
  String(v ?? "").replace(/[<>]/g, "").trim().slice(0, 500);

const digitos = (v: unknown) => String(v ?? "").replace(/\D+/g, "");

const tienda = () => getStore({ name: STORE, consistency: "strong" });

async function leerTodos(): Promise<Registro[]> {
  const store = tienda();
  const { blobs } = await store.list();
  const filas = await Promise.all(
    blobs.map((b) => store.get(b.key, { type: "json" }) as Promise<Registro | null>)
  );
  return filas
    .filter((r): r is Registro => !!r)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

const totales = (rs: Registro[]) => ({
  total: rs.length,
  si: rs.filter((r) => r.asistencia.startsWith("Sí")).length,
  no: rs.filter((r) => !r.asistencia.startsWith("Sí")).length,
});

/** Reenvía el registro a Netlify Forms: eso es lo que dispara el correo. */
async function notificar(req: Request, r: Registro) {
  const cuerpo = new URLSearchParams({
    "form-name": FORM,
    nombre: r.nombre,
    cedula: r.cedula,
    matricula: r.matricula || "—",
    telefono: r.telefono,
    email: r.email,
    asistencia: r.asistencia,
    deporte: r.deporte,
    comentario: r.comentario || "—",
    codigo: r.codigo,
  });

  const res = await fetch(new URL(req.url).origin + "/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: cuerpo.toString(),
  });
  if (!res.ok) throw new Error("Netlify Forms respondió " + res.status);
}

export default async (req: Request, _context: Context) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  /* ------------------------------ LECTURA ------------------------------ */
  if (req.method === "GET") {
    const p = new URL(req.url).searchParams;

    if (p.get("ping")) {
      return json({ ok: true, servicio: "registro-asistencia", evento: "Jornada de Integración 2026" });
    }
    if (p.get("admin") !== CLAVE_ADMIN) {
      return json({ ok: false, error: "No autorizado" }, 401);
    }

    const borrar = digitos(p.get("borrar"));
    if (borrar) {
      await tienda().delete(borrar);
      return json({ ok: true, borrado: borrar, totales: totales(await leerTodos()) });
    }

    const registros = await leerTodos();

    if (p.get("formato") === "csv") {
      const cab = ["Fecha", "Código", "Nombres y apellidos", "Cédula", "Matrícula",
                   "Celular", "Correo", "Asistencia", "Actividades deportivas", "Comentario"];
      const filas = registros.map((r) => [
        r.fecha, r.codigo, r.nombre, r.cedula, r.matricula,
        r.telefono, r.email, r.asistencia, r.deporte, r.comentario,
      ]);
      const csv = [cab, ...filas]
        .map((f) => f.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(","))
        .join("\n");
      return new Response("﻿" + csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="asistencia-jornada-2026.csv"',
          ...CORS,
        },
      });
    }

    return json({
      ok: true,
      totales: totales(registros),
      registros: registros.map((r) => ({
        "Fecha de registro": r.fecha,
        "Código": r.codigo,
        "Nombres y apellidos": r.nombre,
        "Cédula": r.cedula,
        "Matrícula": r.matricula,
        "Celular": r.telefono,
        "Correo": r.email,
        "Asistencia": r.asistencia,
        "Actividades deportivas": r.deporte,
        "Comentario": r.comentario,
      })),
    });
  }

  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido" }, 405);

  /* ------------------------------ ESCRITURA ---------------------------- */
  try {
    const d = JSON.parse(await req.text());

    const nombre = limpiar(d.nombre);
    const cedula = digitos(d.cedula);
    const email = limpiar(d.email).toLowerCase();

    if (!nombre || cedula.length !== 10 || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
      return json({ ok: false, error: "Datos incompletos o inválidos" }, 400);
    }

    const store = tienda();
    const previo = (await store.get(cedula, { type: "json" })) as Registro | null;

    const registro: Registro = {
      fecha: new Date().toISOString(),
      codigo: "JI26-" + cedula.slice(-4),
      nombre,
      cedula,
      matricula: limpiar(d.matricula),
      telefono: digitos(d.telefono),
      email,
      asistencia: limpiar(d.asistencia),
      deporte: limpiar(d.deporte),
      comentario: limpiar(d.comentario),
      origen: limpiar(d.origen) || "web",
    };

    await store.setJSON(cedula, registro);

    // Si el correo falla, el registro YA quedó guardado: no lo perdemos.
    let correo = "enviado";
    try {
      await notificar(req, registro);
    } catch (e) {
      correo = "pendiente: " + (e as Error).message;
      console.error("Fallo la notificación:", e);
    }

    return json({
      ok: true,
      registro: registro.codigo,
      actualizado: !!previo,
      correo,
      totales: totales(await leerTodos()),
    });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
};

export const config: Config = { path: "/registro" };
