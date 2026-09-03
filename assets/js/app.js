/* ===========================================================
   Jornada de Integración · registro de asistencia
   =========================================================== */
(function () {
  "use strict";

  var CFG      = window.APP_CONFIG || {};
  var form     = document.getElementById("form");
  var btn      = document.getElementById("submit");
  var formErr  = document.getElementById("formErr");
  var done     = document.getElementById("done");
  var doneMsg  = document.getElementById("doneMsg");
  var acompVal = document.getElementById("acompVal");
  var acompInp = document.getElementById("acompanantes");
  var secForm  = document.getElementById("registro");

  /* ---------- contador de acompañantes ---------- */
  var acomp = 0;
  document.querySelectorAll("[data-step]").forEach(function (b) {
    b.addEventListener("click", function () {
      acomp = Math.min(10, Math.max(0, acomp + Number(b.dataset.step)));
      acompVal.textContent = acomp;
      acompInp.value = acomp;
    });
  });

  /* ---------- mostrar/ocultar campos según asistencia ---------- */
  var wrapAcomp   = document.getElementById("wrapAcomp");
  var wrapDeporte = document.getElementById("wrapDeporte");
  form.querySelectorAll('input[name="asistencia"]').forEach(function (r) {
    r.addEventListener("change", function () {
      var viene = form.asistencia.value.indexOf("Sí") === 0;
      wrapAcomp.hidden = !viene;
      wrapDeporte.hidden = !viene;
    });
  });

  /* ---------- validación ---------- */
  function setErr(name, msg) {
    var slot = document.querySelector('.f__e[data-for="' + name + '"]');
    var field = form.elements[name];
    if (slot) slot.textContent = msg || "";
    if (field && field.classList) field.classList.toggle("is-bad", !!msg);
  }

  function soloDigitos(v) { return (v || "").replace(/\D+/g, ""); }

  function validar(d) {
    var ok = true;
    ["nombre", "cedula", "telefono", "email", "acepta"].forEach(function (k) { setErr(k, ""); });

    if (d.nombre.length < 6 || d.nombre.indexOf(" ") === -1) {
      setErr("nombre", "Escribe tu nombre y apellido completos."); ok = false;
    }
    if (soloDigitos(d.cedula).length !== 10) {
      setErr("cedula", "La cédula debe tener 10 dígitos."); ok = false;
    }
    if (soloDigitos(d.telefono).length < 9) {
      setErr("telefono", "Ingresa un celular válido (9 o 10 dígitos)."); ok = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.email)) {
      setErr("email", "Ingresa un correo electrónico válido."); ok = false;
    }
    if (!form.elements.acepta.checked) {
      setErr("acepta", "Debes autorizar el uso de tus datos."); ok = false;
    }
    return ok;
  }

  /* ---------- envío ---------- */
  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    formErr.hidden = true;

    var viene = form.asistencia.value.indexOf("Sí") === 0;
    var datos = {
      nombre:       form.nombre.value.trim(),
      cedula:       soloDigitos(form.cedula.value),
      matricula:    form.matricula.value.trim(),
      telefono:     soloDigitos(form.telefono.value),
      email:        form.email.value.trim().toLowerCase(),
      asistencia:   form.asistencia.value,
      acompanantes: viene ? Number(acompInp.value) : 0,
      deporte:      viene ? form.deporte.value : "No aplica",
      comentario:   form.comentario.value.trim(),
      origen:       "web-movil",
      userAgent:    navigator.userAgent
    };

    if (!validar(datos)) {
      var bad = form.querySelector(".is-bad") || form.querySelector('input[name="acepta"]');
      if (bad) bad.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!CFG.ENDPOINT || CFG.ENDPOINT.indexOf("http") !== 0) {
      formErr.textContent = "El registro aún no está conectado a la base de datos. Avisa al administrador (falta configurar assets/js/config.js).";
      formErr.hidden = false;
      return;
    }

    btn.disabled = true;
    btn.classList.add("is-load");
    btn.querySelector(".btn__txt").textContent = "ENVIANDO…";

    fetch(CFG.ENDPOINT, {
      method: "POST",
      redirect: "follow",
      // text/plain evita el preflight CORS que Apps Script no responde
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(datos)
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || res.ok !== true) throw new Error((res && res.error) || "Respuesta inválida");
        mostrarExito(datos, res);
      })
      .catch(function (e) {
        formErr.textContent = "No pudimos guardar tu registro (" + e.message + "). Revisa tu conexión e inténtalo otra vez.";
        formErr.hidden = false;
      })
      .finally(function () {
        btn.disabled = false;
        btn.classList.remove("is-load");
        btn.querySelector(".btn__txt").textContent = "REGISTRAR MI ASISTENCIA";
      });
  });

  /* ---------- pantalla de éxito ---------- */
  function mostrarExito(d, res) {
    var viene = d.asistencia.indexOf("Sí") === 0;
    var nombreCorto = d.nombre.split(" ")[0];

    doneMsg.textContent = viene
      ? "Gracias, " + nombreCorto + ". Tu asistencia quedó registrada" +
        (d.acompanantes > 0 ? " junto a " + d.acompanantes + " acompañante" + (d.acompanantes > 1 ? "s" : "") : "") +
        ". Te enviamos la confirmación a " + d.email + "."
      : "Gracias por avisarnos, " + nombreCorto + ". Registramos que no podrás acompañarnos. ¡Te esperamos en la próxima!";

    if (res && res.registro) doneMsg.textContent += " (Código: " + res.registro + ")";

    document.getElementById("ics").href = crearICS();

    var texto = "Ya confirmé mi asistencia a la Jornada de Integración del Colegio de Abogados de Santo Domingo de los Tsáchilas 🇪🇨⚖️\n\n" +
                "📅 Sábado 05 de septiembre de 2026\n🕙 10h00\n📍 Quinta del Dr. Carlos Vivanco (Quinta Aventino), Km 10 vía Chone.\n\n" +
                "Regístrate aquí: " + location.href.split("#")[0];
    document.getElementById("share").href = "https://wa.me/?text=" + encodeURIComponent(texto);

    secForm.hidden = true;
    done.hidden = false;
    done.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.getElementById("again").addEventListener("click", function () {
    form.reset();
    acomp = 0; acompVal.textContent = "0"; acompInp.value = "0";
    wrapAcomp.hidden = false; wrapDeporte.hidden = false;
    ["nombre", "cedula", "telefono", "email", "acepta"].forEach(function (k) { setErr(k, ""); });
    done.hidden = true;
    secForm.hidden = false;
    secForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------- .ics para el calendario (10h00 a 18h00, UTC-5) ---------- */
  function crearICS() {
    var ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CASDT//Jornada Integracion//ES",
      "BEGIN:VEVENT",
      "UID:jornada-integracion-2026@casdt.ec",
      "DTSTAMP:20260901T120000Z",
      "DTSTART:20260905T150000Z",
      "DTEND:20260905T230000Z",
      "SUMMARY:Jornada de Integración - Colegio de Abogados SDT",
      "LOCATION:Quinta del Dr. Carlos Vivanco (Quinta Aventino), Km 10 vía Chone, Santo Domingo de los Tsáchilas",
      "DESCRIPTION:Actividades deportivas, recreativas y bailables. Se brindará un plato de fritada.",
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
  }
})();
