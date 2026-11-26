export function instalarABM({db, navegar, mensaje}) {

    const $ = id => document.getElementById(id);

    let seccion = "";
    let registros = [];
    let empresas = [];
    let planes = [];
    let empresaSeleccionada = "";
    let ocupado = false;
    let version = 0;

    const css = document.createElement("style");

    css.textContent = `

        .abm-barra {
            display:flex;
            align-items:center;
            gap:10px;
            flex-wrap:wrap;
            margin-bottom:20px;
        }

        .abm-nuevo {
            margin-left:auto;
            background:#087ff5;
            color:white;
            border:0;
            padding:12px 18px;
            border-radius:9px;
            font-weight:bold;
        }

        .abm-accion {
            border:0;
            border-radius:7px;
            padding:8px 11px;
            margin:3px;
            background:#e8f2ff;
            color:#1367b5;
            font-size:13px;
            font-weight:bold;
        }

        .abm-accion.rojo {
            background:#fde8e8;
            color:#b42323;
        }

        .abm-accion.verde {
            background:#e2f5e8;
            color:#16803c;
        }

        .abm-accion.naranja {
            background:#fff0d6;
            color:#a65a00;
        }

        .abm-modal {
            border:0;
            border-radius:18px;
            padding:0;
            width:min(720px,94vw);
            max-height:92vh;
            color:#102c45;
            box-shadow:0 25px 90px #0005;
        }

        .abm-modal::backdrop {
            background:#061d3588;
            backdrop-filter:blur(5px);
        }

        .abm-cabecera {
            display:flex;
            align-items:center;
            justify-content:space-between;
            padding:22px;
            color:white;
            background:linear-gradient(120deg,#082744,#145280);
        }

        .abm-cabecera h3 {
            margin:0;
            font-size:21px;
        }

        .abm-cerrar {
            border:0;
            background:#ffffff20;
            color:white;
            border-radius:8px;
            padding:8px 13px;
        }

        .abm-form {
            padding:22px;
        }

        .abm-campos {
            display:grid;
            grid-template-columns:1fr 1fr;
            gap:18px;
        }

        .abm-campo label {
            display:block;
            font-size:13px;
            font-weight:bold;
            margin-bottom:8px;
        }

        .abm-campo input,
        .abm-campo select,
        .abm-campo textarea {
            width:100%;
            min-width:0;
            padding:12px;
            border:1px solid #ccd9e7;
            border-radius:8px;
            color:#102c45;
            background:white;
            font:inherit;
        }

        .abm-campo textarea {
            min-height:90px;
            resize:vertical;
        }

        .abm-ancho {
            grid-column:1/-1;
        }

        .abm-pie {
            display:flex;
            justify-content:flex-end;
            gap:12px;
            margin-top:24px;
            padding-top:18px;
            border-top:1px solid #e5edf6;
        }

        .abm-error {
            background:#fde8e8;
            color:#a51e24;
            padding:12px;
            border-radius:8px;
            margin-top:15px;
            white-space:pre-wrap;
        }

        .abm-detalle {
            white-space:pre-wrap;
            word-break:break-word;
            background:#edf4fa;
            padding:15px;
            border-radius:9px;
            max-height:55vh;
            overflow:auto;
            font-size:13px;
        }

        .abm-ayuda {
            margin:0 0 18px;
            color:#64748b;
            font-size:14px;
            line-height:1.5;
        }

        @media(max-width:600px) {

            .abm-campos {
                grid-template-columns:1fr;
            }

            .abm-nuevo {
                margin-left:0;
            }

            .abm-form {
                padding:15px;
            }

        }

    `;

    document.head.appendChild(css);

    const modal = document.createElement("dialog");

    modal.className = "abm-modal";

    modal.innerHTML = `

        <div class="abm-cabecera">

            <h3 id="abmTitulo"></h3>

            <button id="abmCerrar"
                    class="abm-cerrar"
                    type="button">✕</button>

        </div>

        <form id="abmFormulario" class="abm-form">

            <p id="abmAyuda"
               class="abm-ayuda"
               hidden></p>

            <div id="abmCampos"
                 class="abm-campos"></div>

            <div id="abmError"
                 class="abm-error"
                 hidden></div>

            <div class="abm-pie">

                <button id="abmCancelar"
                        class="boton secundario"
                        type="button">
                    Cancelar
                </button>

                <button id="abmGuardar"
                        class="boton"
                        type="submit">
                    GUARDAR
                </button>

            </div>

        </form>

    `;

    document.body.appendChild(modal);

    function cerrar() {

        if (!ocupado) modal.close();

    }

    $("abmCerrar").onclick = cerrar;
    $("abmCancelar").onclick = cerrar;

    modal.addEventListener("cancel", e => {

        if (ocupado) e.preventDefault();

    });

    function esc(valor) {

        return String(valor ?? "")
            .replace(/[&<>"']/g, c => ({
                "&":"&amp;",
                "<":"&lt;",
                ">":"&gt;",
                '"':"&quot;",
                "'":"&#39;"
            })[c]);

    }

    function fecha(valor) {

        if (!valor) return "Sin vencimiento";

        const texto = String(valor);

        const d = new Date(
            /^\d{4}-\d{2}-\d{2}$/.test(texto)
                ? texto + "T12:00:00"
                : texto
        );

        return d.toLocaleDateString("es-AR");

    }

    function moneda(valor, codigo = "ARS") {

        if (valor === null || valor === undefined)
            return "—";

        return Number(valor).toLocaleString("es-AR", {
            style:"currency",
            currency:codigo || "ARS"
        });

    }

    function estado(valor) {

        const texto = valor === true
            ? "Activo"
            : valor === false
                ? "Inactivo"
                : String(valor ?? "—");

        const clase = [

            "inactivo",
            "suspendido",
            "cancelado",
            "cancelada",
            "vencido",
            "vencida"

        ].includes(texto.toLowerCase())

            ? " rojo"

            : ["pendiente","mantenimiento"]
                .includes(texto.toLowerCase())

                ? " alerta"
                : "";

        return '<span class="estado' + clase + '">' +
            esc(texto) + '</span>';

    }

    function boton(texto, accion, id, clase = "") {

        return '<button type="button" ' +
            'class="abm-accion ' + clase + '" ' +
            'data-abm="' + esc(accion) + '" ' +
            'data-id="' + esc(id) + '">' +
            esc(texto) +
            '</button>';

    }

    async function rpc(nombre, parametros = {}) {

        const {data,error} =
            await db.rpc(nombre,parametros);

        if (error) throw error;

        return data;

    }

    async function consultar(tabla, columnas = "*") {

        let resultado = [];
        let desde = 0;
        const cantidad = 500;

        while (true) {

            const {data,error} = await db
                .from(tabla)
                .select(columnas)
                .order("id", {ascending:true})
                .range(desde, desde + cantidad - 1);

            if (error) throw error;

            resultado.push(...(data || []));

            if (!data || data.length < cantidad)
                break;

            desde += cantidad;

        }

        return resultado;

    }

    function empresaNombre(id) {

        return empresas.find(e => e.id === id)
            ?.razon_social || "—";

    }

    function planNombre(id) {

        return planes.find(p => p.id === id)
            ?.nombre || "—";

    }

    function opcionEmpresa() {

        return empresas.map(e => [

            e.id,

            e.razon_social +
                (e.estado !== "activo"
                    ? " (" + e.estado + ")"
                    : "")

        ]);

    }

    function opcionPlan() {

        return planes
            .filter(p => p.activo)
            .map(p => [

                p.id,

                p.nombre +
                    " · " +
                    p.max_vehiculos +
                    " vehículos"

            ]);

    }

    const roles = [

        ["administrador","Administrador"],
        ["operador","Operador"],
        ["supervisor","Supervisor"],
        ["chofer","Chofer"]

    ];

    function campo(
        nombre,
        etiqueta,
        valor = "",
        tipo = "text",
        obligatorio = false,
        opciones = [],
        ancho = false,
        atributos = ""
    ) {

        let control;

        if (tipo === "select") {

            control =

                '<select name="' + esc(nombre) + '"' +
                (obligatorio ? " required" : "") + '>' +

                '<option value="">Seleccionar...</option>' +

                opciones.map(([v,t]) =>

                    '<option value="' + esc(v) + '"' +

                    (String(v) === String(valor)
                        ? " selected"
                        : "") +

                    '>' + esc(t) + '</option>'

                ).join("") +

                '</select>';

        } else if (tipo === "textarea") {

            control =

                '<textarea name="' +
                esc(nombre) + '"' +

                (obligatorio ? " required" : "") +

                '>' + esc(valor) + '</textarea>';

        } else {

            control =

                '<input name="' + esc(nombre) + '" ' +

                'type="' + tipo + '" ' +

                'value="' + esc(valor) + '"' +

                (obligatorio ? " required" : "") +

                " " + atributos + ">";

        }

        return '<div class="abm-campo ' +

            (ancho ? "abm-ancho" : "") + '">' +

            '<label>' + esc(etiqueta) +

            (obligatorio ? " *" : "") +

            '</label>' + control + '</div>';

    }

    function formulario(
        titulo,
        campos,
        guardar,
        ayuda = "",
        textoBoton = "GUARDAR"
    ) {

        $("abmTitulo").textContent = titulo;

        $("abmCampos").innerHTML = campos.join("");

        $("abmAyuda").textContent = ayuda;
        $("abmAyuda").hidden = !ayuda;

        $("abmError").hidden = true;

        $("abmGuardar").textContent = textoBoton;
        $("abmGuardar").hidden = false;
        $("abmGuardar").disabled = false;

        $("abmCancelar").textContent = "Cancelar";

        $("abmFormulario").onsubmit = async e => {

            e.preventDefault();

            if (ocupado) return;

            ocupado = true;

            $("abmGuardar").disabled = true;
            $("abmGuardar").textContent = "PROCESANDO...";
            $("abmError").hidden = true;

            const datos = Object.fromEntries(
                new FormData(e.target).entries()
            );

            try {

                const respuesta = await guardar(datos);

                modal.close();

                await navegar(seccion);

                mensaje(
                    typeof respuesta === "string"
                        ? respuesta
                        : "Operación realizada correctamente."
                );

            } catch (error) {

                $("abmError").textContent =
                    error.message || String(error);

                $("abmError").hidden = false;

            } finally {

                ocupado = false;

                $("abmGuardar").disabled = false;
                $("abmGuardar").textContent = textoBoton;

            }

        };

        if (!modal.open) modal.showModal();

    }

    function texto(v) {

        return String(v ?? "").trim() || null;

    }

    function numero(v) {

        if (v === "" || v === null || v === undefined)
            return null;

        const n = Number(v);

        if (!Number.isFinite(n))
            throw new Error("Ingresá un número válido.");

        return n;

    }

    function confirmar(
        titulo,
        descripcion,
        guardar
    ) {

        formulario(

            titulo,

            [

                campo(
                    "motivo",
                    "Motivo de la operación",
                    "",
                    "textarea",
                    true,
                    [],
                    true
                )

            ],

            async d => {

                const motivo = texto(d.motivo);

                if (!motivo)
                    throw new Error("Ingresá el motivo.");

                return guardar(motivo);

            },

            descripcion,

            "CONFIRMAR"

        );

    }

    // =========================================
    // EMPRESAS
    // =========================================

    function editarEmpresa(r = {}) {

        formulario(

            r.id ? "Modificar empresa" : "Nueva empresa",

            [

                campo(
                    "razon_social",
                    "Razón social",
                    r.razon_social,
                    "text",
                    true,
                    [],
                    true
                ),

                campo(
                    "nombre_comercial",
                    "Nombre comercial",
                    r.nombre_comercial
                ),

                campo("cuit","CUIT",r.cuit),

                campo("email","Correo electrónico",r.email,"email"),

                campo("telefono","Teléfono",r.telefono),

                campo("domicilio","Domicilio",r.domicilio),

                campo("localidad","Localidad",r.localidad),

                campo("provincia","Provincia",r.provincia),

                campo("pais","País",r.pais || "Argentina","text",true),

                campo(
                    "observaciones",
                    "Observaciones",
                    r.observaciones,
                    "textarea",
                    false,
                    [],
                    true
                )

            ],

            async d => {

                const p = {

                    p_razon_social:texto(d.razon_social),

                    p_nombre_comercial:texto(d.nombre_comercial),

                    p_cuit:texto(d.cuit),

                    p_email:texto(d.email),

                    p_telefono:texto(d.telefono),

                    p_domicilio:texto(d.domicilio),

                    p_localidad:texto(d.localidad),

                    p_provincia:texto(d.provincia),

                    p_pais:texto(d.pais),

                    p_observaciones:texto(d.observaciones)

                };

                if (r.id) {

                    p.p_empresa_id = r.id;

                    return rpc(
                        "tracking_modificar_empresa",
                        p
                    );

                }

                return rpc("tracking_crear_empresa",p);

            }

        );

    }

    function cambiarEmpresa(r,nuevo) {

        confirmar(

            "Cambiar estado de empresa",

            r.razon_social +
                " pasará al estado: " + nuevo + ".",

            motivo => rpc(

                "tracking_cambiar_estado_empresa",

                {

                    p_empresa_id:r.id,

                    p_nuevo_estado:nuevo,

                    p_motivo:motivo

                }

            )

        );

    }

    // =========================================
    // PLANES COMERCIALES
    // =========================================

    function editarPlan(r = {}) {

        formulario(

            r.id ? "Modificar plan" : "Nuevo plan comercial",

            [

                campo("nombre","Nombre del plan",r.nombre,"text",true),

                campo(
                    "max_vehiculos",
                    "Cantidad máxima de vehículos",
                    r.max_vehiculos,
                    "number",
                    true,
                    [],
                    false,
                    'min="1" step="1"'
                ),

                campo(
                    "max_usuarios",
                    "Usuarios administrativos",
                    r.max_usuarios_administrativos,
                    "number",
                    true,
                    [],
                    false,
                    'min="1" step="1"'
                ),

                campo(
                    "precio",
                    "Abono mensual",
                    r.precio_mensual,
                    "number",
                    false,
                    [],
                    false,
                    'min="0" step="0.01"'
                ),

                campo(
                    "moneda",
                    "Moneda",
                    r.moneda || "ARS",
                    "select",
                    true,
                    [["ARS","Pesos argentinos"],["USD","Dólares"]]
                ),

                campo(
                    "descripcion",
                    "Descripción",
                    r.descripcion,
                    "textarea",
                    false,
                    [],
                    true
                )

            ],

            async d => {

                const p = {

                    p_nombre:texto(d.nombre),

                    p_max_vehiculos:numero(d.max_vehiculos),

                    p_max_usuarios_administrativos:numero(d.max_usuarios),

                    p_precio_mensual:numero(d.precio),

                    p_moneda:d.moneda,

                    p_descripcion:texto(d.descripcion)

                };

                if (r.id) {

                    p.p_plan_id = r.id;

                    return rpc(
                        "tracking_modificar_plan",
                        p
                    );

                }

                return rpc("tracking_crear_plan",p);

            },

            "Los cambios del plan no modifican automáticamente las suscripciones existentes."

        );

    }

    function cambiarPlan(r,activo) {

        confirmar(

            activo ? "Activar plan" : "Desactivar plan",

            r.nombre +
                ". Las suscripciones existentes conservarán sus condiciones.",

            motivo => rpc(

                "tracking_cambiar_estado_plan",

                {

                    p_plan_id:r.id,

                    p_activo:activo,

                    p_motivo:motivo

                }

            )

        );

    }

    // =========================================
    // SUSCRIPCIONES
    // =========================================

    function nuevaSuscripcion() {

        formulario(

            "Nueva suscripción",

            [

                campo(
                    "empresa",
                    "Empresa",
                    empresaSeleccionada,
                    "select",
                    true,
                    opcionEmpresa()
                ),

                campo(
                    "plan",
                    "Plan contratado",
                    "",
                    "select",
                    true,
                    opcionPlan()
                ),

                campo("inicio","Fecha de inicio","","date"),

                campo("vencimiento","Fecha de vencimiento","","date"),

                campo(
                    "vehiculos",
                    "Cupo especial de vehículos",
                    "",
                    "number",
                    false,
                    [],
                    false,
                    'min="1" step="1"'
                ),

                campo(
                    "usuarios",
                    "Cupo especial de usuarios administrativos",
                    "",
                    "number",
                    false,
                    [],
                    false,
                    'min="1" step="1"'
                ),

                campo(
                    "importe",
                    "Abono mensual especial",
                    "",
                    "number",
                    false,
                    [],
                    false,
                    'min="0" step="0.01"'
                ),

                campo(
                    "observaciones",
                    "Observaciones",
                    "",
                    "textarea",
                    false,
                    [],
                    true
                )

            ],

            d => rpc(

                "tracking_crear_suscripcion",

                {

                    p_empresa_id:d.empresa,

                    p_plan_id:d.plan,

                    p_fecha_inicio:texto(d.inicio),

                    p_fecha_vencimiento:texto(d.vencimiento),

                    p_max_vehiculos:numero(d.vehiculos),

                    p_max_usuarios_administrativos:numero(d.usuarios),

                    p_importe_mensual:numero(d.importe),

                    p_observaciones:texto(d.observaciones)

                }

            ),

            "Si dejás vacíos los cupos y el importe, se utilizarán los valores del plan. Una fecha de vencimiento vacía significa vigencia sin vencimiento."

        );

    }

    function modificarSuscripcion(r) {

        formulario(

            "Modificar suscripción",

            [

                campo(
                    "vehiculos",
                    "Cupo de vehículos",
                    r.max_vehiculos,
                    "number",
                    true,
                    [],
                    false,
                    'min="1" step="1"'
                ),

                campo(
                    "usuarios",
                    "Cupo de usuarios administrativos",
                    r.max_usuarios_administrativos,
                    "number",
                    true,
                    [],
                    false,
                    'min="1" step="1"'
                ),

                campo(
                    "importe",
                    "Abono mensual",
                    r.importe_mensual,
                    "number",
                    false,
                    [],
                    false,
                    'min="0" step="0.01"'
                ),

                campo(
                    "vencimiento",
                    "Fecha de vencimiento",
                    r.fecha_vencimiento,
                    "date"
                ),

                campo(
                    "motivo",
                    "Motivo del cambio",
                    "",
                    "textarea",
                    true,
                    [],
                    true
                )

            ],

            d => rpc(

                "tracking_modificar_suscripcion",

                {

                    p_suscripcion_id:r.id,

                    p_max_vehiculos:numero(d.vehiculos),

                    p_max_usuarios_administrativos:numero(d.usuarios),

                    p_importe_mensual:numero(d.importe),

                    p_fecha_vencimiento:texto(d.vencimiento),

                    p_motivo:texto(d.motivo)

                }

            ),

            empresaNombre(r.empresa_id) +
                " · " + planNombre(r.plan_id)

        );

    }

    function renovarSuscripcion(r) {

        formulario(

            "Renovar suscripción",

            [

                campo(
                    "vencimiento",
                    "Nueva fecha de vencimiento",
                    "",
                    "date"
                ),

                campo(
                    "motivo",
                    "Motivo de renovación",
                    "",
                    "textarea",
                    true,
                    [],
                    true
                )

            ],

            d => rpc(

                "tracking_renovar_suscripcion",

                {

                    p_suscripcion_id:r.id,

                    p_fecha_vencimiento:texto(d.vencimiento),

                    p_motivo:texto(d.motivo)

                }

            ),

            "La renovación conserva el plan, los cupos y el importe vigente. Dejar la fecha vacía establece vigencia sin vencimiento.",

            "RENOVAR"

        );

    }

    function estadoSuscripcion(r,nuevo) {

        confirmar(

            "Cambiar estado de suscripción",

            empresaNombre(r.empresa_id) +
                " · Nuevo estado: " + nuevo +
                (nuevo === "cancelado"
                    ? ". La cancelación es definitiva."
                    : "."),

            motivo => rpc(

                "tracking_cambiar_estado_suscripcion",

                {

                    p_suscripcion_id:r.id,

                    p_nuevo_estado:nuevo,

                    p_motivo:motivo

                }

            )

        );

    }

    // =========================================
    // VEHÍCULOS
    // =========================================

    function editarVehiculo(r = {}) {

        const campos = [];

        if (!r.id) {

            campos.push(

                campo(
                    "empresa",
                    "Empresa",
                    empresaSeleccionada,
                    "select",
                    true,
                    opcionEmpresa(),
                    true
                )

            );

        }

        campos.push(

            campo("patente","Patente",r.patente,"text",true),

            campo("nombre","Identificación del vehículo",r.nombre,"text",true),

            campo("marca","Marca",r.marca),

            campo("modelo","Modelo",r.modelo),

            campo(
                "anio",
                "Año",
                r.anio,
                "number",
                false,
                [],
                false,
                'min="1900" step="1"'
            ),

            campo("tipo","Tipo de vehículo",r.tipo),

            campo(
                "capacidad_kg",
                "Capacidad en kg",
                r.capacidad_kg,
                "number",
                false,
                [],
                false,
                'min="0" step="0.01"'
            ),

            campo(
                "capacidad_bultos",
                "Capacidad de bultos",
                r.capacidad_bultos,
                "number",
                false,
                [],
                false,
                'min="0" step="1"'
            ),

            campo(
                "observaciones",
                "Observaciones",
                r.observaciones,
                "textarea",
                false,
                [],
                true
            )

        );

        formulario(

            r.id ? "Modificar vehículo" : "Nuevo vehículo",

            campos,

            async d => {

                const p = {

                    p_patente:texto(d.patente),

                    p_nombre:texto(d.nombre),

                    p_marca:texto(d.marca),

                    p_modelo:texto(d.modelo),

                    p_anio:numero(d.anio),

                    p_tipo:texto(d.tipo),

                    p_capacidad_kg:numero(d.capacidad_kg),

                    p_capacidad_bultos:numero(d.capacidad_bultos),

                    p_observaciones:texto(d.observaciones)

                };

                if (r.id) {

                    p.p_vehiculo_id = r.id;

                    return rpc(
                        "tracking_modificar_vehiculo",
                        p
                    );

                }

                p.p_empresa_id = d.empresa;

                return rpc(
                    "tracking_crear_vehiculo",
                    p
                );

            },

            "El alta está sujeta al cupo contratado por la empresa."

        );

    }

    function estadoVehiculo(r,nuevo) {

        confirmar(

            "Cambiar estado de vehículo",

            r.nombre + " — " + r.patente +
                ". Nuevo estado: " + nuevo +
                ". Verificá que no tenga un reparto en curso.",

            motivo => rpc(

                "tracking_cambiar_estado_vehiculo",

                {

                    p_vehiculo_id:r.id,

                    p_nuevo_estado:nuevo,

                    p_motivo:motivo

                }

            )

        );

    }

    // =========================================
    // USUARIOS
    // =========================================

    function editarUsuario(r) {

        formulario(

            "Modificar usuario",

            [

                campo("nombre","Nombre completo",r.nombre,"text",true),

                campo(
                    "rol",
                    "Perfil",
                    r.rol,
                    "select",
                    true,
                    roles
                ),

                campo("telefono","Teléfono",r.telefono)

            ],

            d => rpc(

                "tracking_modificar_usuario",

                {

                    p_usuario_id:r.id,

                    p_nombre:texto(d.nombre),

                    p_rol:d.rol,

                    p_telefono:texto(d.telefono)

                }

            ),

            empresaNombre(r.empresa_id)

        );

    }

    function estadoUsuario(r,activo) {

        confirmar(

            activo ? "Habilitar usuario" : "Deshabilitar usuario",

            r.nombre +
                " · " + empresaNombre(r.empresa_id) +
                ". Verificá que no tenga un reparto en curso.",

            motivo => rpc(

                "tracking_cambiar_estado_usuario",

                {

                    p_usuario_id:r.id,

                    p_activo:activo,

                    p_motivo:motivo

                }

            )

        );

    }

    // =========================================
    // INVITACIONES POR CORREO
    // =========================================

    async function enviarInvitacion(datos) {

        const {data,error} = await db.functions.invoke(

            "tracking-enviar-invitacion",

            {body:datos}

        );

        if (error) {

            let detalle = error.message;

            try {

                const info = await error.context.json();

                detalle =
                    info.error ||
                    info.mensaje ||
                    detalle;

            } catch (_) {}

            throw new Error(

                detalle +
                "\nConsultá el listado antes de volver a intentar. La invitación podría haber quedado creada aunque el correo no se haya enviado."

            );

        }

        if (data?.ok !== true) {

            throw new Error(
                data?.mensaje ||
                data?.error ||
                "No se confirmó el envío de la invitación."
            );

        }

        return data.mensaje ||
            "Invitación enviada correctamente.";

    }

    function nuevaInvitacion() {

        formulario(

            "Invitar nuevo usuario",

            [

                campo(
                    "empresa",
                    "Empresa",
                    empresaSeleccionada,
                    "select",
                    true,
                    opcionEmpresa(),
                    true
                ),

                campo(
                    "nombre",
                    "Nombre completo",
                    "",
                    "text",
                    true
                ),

                campo(
                    "email",
                    "Correo electrónico",
                    "",
                    "email",
                    true
                ),

                campo("telefono","Teléfono"),

                campo(
                    "rol",
                    "Perfil del usuario",
                    "",
                    "select",
                    true,
                    roles
                )

            ],

            async d => {

                empresaSeleccionada = d.empresa;

                return enviarInvitacion({

                    accion:"crear",

                    empresa_id:d.empresa,

                    nombre:texto(d.nombre),

                    email:texto(d.email),

                    telefono:texto(d.telefono),

                    rol:d.rol

                });

            },

            "El usuario recibirá un correo con un enlace personal para registrarse o acceder a su cuenta. La invitación tiene una vigencia de 72 horas.",

            "ENVIAR INVITACIÓN"

        );

    }

    function reenviarInvitacion(r) {

        formulario(

            "Reenviar invitación",

            [],

            () => enviarInvitacion({

                accion:"reenviar",

                empresa_id:r.empresa_id ||
                    empresaSeleccionada,

                invitacion_id:r.invitacion_id

            }),

            "Se enviará una nueva invitación a " +
                r.email +
                ". El enlace anterior dejará de ser válido.",

            "REENVIAR"

        );

    }

    function cancelarInvitacion(r) {

        confirmar(

            "Cancelar invitación",

            "Se invalidará la invitación enviada a " +
                r.email + ".",

            motivo => rpc(

                "tracking_cancelar_invitacion",

                {

                    p_invitacion_id:r.invitacion_id,

                    p_motivo:motivo

                }

            )

        );

    }

    // =========================================
    // AUDITORÍA
    // =========================================

    function detalleAuditoria(r) {

        formulario(

            "Detalle de auditoría",

            [

                '<div class="abm-ancho">' +

                '<p><strong>Operación: </strong>' +
                    esc(r.accion) + '</p>' +

                '<p><strong>Entidad: </strong>' +
                    esc(r.entidad) + '</p>' +

                '<p><strong>Empresa: </strong>' +
                    esc(empresaNombre(r.empresa_id)) + '</p>' +

                '<p><strong>Fecha: </strong>' +

                    esc(new Date(r.fecha)
                        .toLocaleString("es-AR")) +

                    '</p>' +

                '<h4>Datos anteriores</h4>' +

                '<pre class="abm-detalle">' +

                    esc(JSON.stringify(
                        r.datos_anteriores,null,2
                    )) +

                    '</pre>' +

                '<h4>Datos nuevos</h4>' +

                '<pre class="abm-detalle">' +

                    esc(JSON.stringify(
                        r.datos_nuevos,null,2
                    )) +

                    '</pre>' +

                '</div>'

            ],

            async () => {},

            "La auditoría es de solo lectura."

        );

        $("abmGuardar").hidden = true;
        $("abmCancelar").textContent = "Cerrar";

        $("abmFormulario").onsubmit =
            e => e.preventDefault();

    }

    // =========================================
    // TÍTULOS Y COLUMNAS
    // =========================================

    const configuracion = {

        empresas: {

            tabla:"tracking_empresas",

            nuevo:"Nueva empresa",

            columnas:[
                "Razón social",
                "CUIT",
                "Correo",
                "Teléfono",
                "Estado",
                "Acciones"
            ]

        },

        planes: {

            tabla:"tracking_planes",

            nuevo:"Nuevo plan",

            columnas:[
                "Plan",
                "Vehículos",
                "Usuarios",
                "Abono mensual",
                "Estado",
                "Acciones"
            ]

        },

        suscripciones: {

            tabla:"tracking_suscripciones",

            nuevo:"Nueva suscripción",

            columnas:[
                "Empresa",
                "Plan",
                "Vehículos",
                "Usuarios",
                "Abono",
                "Vencimiento",
                "Estado",
                "Acciones"
            ]

        },

        vehiculos: {

            tabla:"tracking_vehiculos",

            nuevo:"Nuevo vehículo",

            columnas:[
                "Empresa",
                "Patente",
                "Vehículo",
                "Marca",
                "Modelo",
                "Estado",
                "Acciones"
            ]

        },

        usuarios: {

            tabla:"tracking_usuarios",

            nuevo:"Invitar usuario",

            columnas:[
                "Empresa",
                "Nombre",
                "Perfil",
                "Teléfono",
                "Estado",
                "Acciones"
            ]

        },

        invitaciones: {

            nuevo:"Nueva invitación",

            columnas:[
                "Nombre",
                "Correo",
                "Perfil",
                "Vencimiento",
                "Estado",
                "Acciones"
            ]

        },

        auditoria: {

            tabla:"tracking_auditoria",

            columnas:[
                "Fecha y hora",
                "Empresa",
                "Operación",
                "Entidad",
                "Detalle"
            ]

        }

    };

    function fila(r) {

        switch (seccion) {

            case "empresas":

                return [

                    esc(r.razon_social),

                    esc(r.cuit),

                    esc(r.email),

                    esc(r.telefono),

                    estado(r.estado),

                    boton("✎ Editar","editar",r.id) +

                    (r.estado === "activo"

                        ? boton(
                            "Suspender",
                            "empresa-suspendido",
                            r.id,
                            "naranja"
                        )

                        : boton(
                            "Activar",
                            "empresa-activo",
                            r.id,
                            "verde"
                        )

                    ) +

                    (r.estado !== "cancelado"

                        ? boton(
                            "Cancelar",
                            "empresa-cancelado",
                            r.id,
                            "rojo"
                        )

                        : ""

                    )

                ];

            case "planes":

                return [

                    esc(r.nombre),

                    esc(r.max_vehiculos),

                    esc(r.max_usuarios_administrativos),

                    esc(moneda(r.precio_mensual,r.moneda)),

                    estado(r.activo),

                    boton("✎ Editar","editar",r.id) +

                    boton(

                        r.activo ? "Desactivar" : "Activar",

                        "plan-estado",

                        r.id,

                        r.activo ? "rojo" : "verde"

                    )

                ];

            case "suscripciones":

                return [

                    esc(empresaNombre(r.empresa_id)),

                    esc(planNombre(r.plan_id)),

                    esc(r.max_vehiculos),

                    esc(r.max_usuarios_administrativos),

                    esc(moneda(r.importe_mensual,r.moneda)),

                    esc(fecha(r.fecha_vencimiento)),

                    estado(r.estado),

                    (

                        r.estado === "activo"

                            ? boton("✎ Editar","editar",r.id) +

                              boton(
                                  "Suspender",
                                  "sus-suspendido",
                                  r.id,
                                  "naranja"
                              )

                            : ""

                    ) +

                    (

                        r.estado !== "cancelado"

                            ? boton(
                                "Renovar",
                                "renovar",
                                r.id,
                                "verde"
                            ) +

                              boton(
                                "Cancelar",
                                "sus-cancelado",
                                r.id,
                                "rojo"
                              )

                            : ""

                    ) +

                    (

                        ["suspendido","vencido"]
                            .includes(r.estado)

                            ? boton(
                                "Reactivar",
                                "sus-activo",
                                r.id,
                                "verde"
                            )

                            : ""

                    )

                ];

            case "vehiculos":

                return [

                    esc(empresaNombre(r.empresa_id)),

                    esc(r.patente),

                    esc(r.nombre),

                    esc(r.marca),

                    esc(r.modelo),

                    estado(r.estado),

                    boton("✎ Editar","editar",r.id) +

                    (

                        r.estado !== "activo"

                            ? boton(
                                "Activar",
                                "veh-activo",
                                r.id,
                                "verde"
                            )

                            : ""

                    ) +

                    (

                        r.estado !== "mantenimiento"

                            ? boton(
                                "Mantenimiento",
                                "veh-mantenimiento",
                                r.id,
                                "naranja"
                            )

                            : ""

                    ) +

                    (

                        r.estado !== "inactivo"

                            ? boton(
                                "Desactivar",
                                "veh-inactivo",
                                r.id,
                                "rojo"
                            )

                            : ""

                    )

                ];

            case "usuarios":

                return [

                    esc(empresaNombre(r.empresa_id)),

                    esc(r.nombre),

                    esc(r.rol),

                    esc(r.telefono),

                    estado(r.activo),

                    boton("✎ Editar","editar",r.id) +

                    boton(

                        r.activo
                            ? "Deshabilitar"
                            : "Habilitar",

                        "usuario-estado",

                        r.id,

                        r.activo ? "rojo" : "verde"

                    )

                ];

            case "invitaciones":

                return [

                    esc(r.nombre),

                    esc(r.email),

                    esc(r.rol),

                    esc(fecha(r.vence)),

                    estado(r.estado),

                    (

                        ["pendiente","vencida"].includes(r.estado)

                            ? boton(
                                "Reenviar",
                                "reenviar",
                                r.invitacion_id
                            )

                            : ""

                    ) +

                    (

                        r.estado === "pendiente"

                            ? boton(
                                "Cancelar",
                                "cancelar-invitacion",
                                r.invitacion_id,
                                "rojo"
                            )

                            : ""

                    )

                ];

            case "auditoria":

                return [

                    esc(new Date(r.fecha)
                        .toLocaleString("es-AR")),

                    esc(empresaNombre(r.empresa_id)),

                    esc(r.accion),

                    esc(r.entidad),

                    boton("Ver detalle","detalle",r.id)

                ];

        }

        return [];

    }

    function nuevo() {

        switch (seccion) {

            case "empresas":
                return editarEmpresa();

            case "planes":
                return editarPlan();

            case "suscripciones":
                return nuevaSuscripcion();

            case "vehiculos":
                return editarVehiculo();

            case "usuarios":
            case "invitaciones":
                return nuevaInvitacion();

        }

    }

    function accion(nombre,id) {

        const r = registros.find(

            x => String(x.id || x.invitacion_id) === id

        );

        if (!r) return;

        if (nombre === "editar") {

            switch (seccion) {

                case "empresas":
                    return editarEmpresa(r);

                case "planes":
                    return editarPlan(r);

                case "suscripciones":
                    return modificarSuscripcion(r);

                case "vehiculos":
                    return editarVehiculo(r);

                case "usuarios":
                    return editarUsuario(r);

            }

        }

        if (nombre.startsWith("empresa-"))

            return cambiarEmpresa(
                r,nombre.replace("empresa-","")
            );

        if (nombre === "plan-estado")

            return cambiarPlan(r,!r.activo);

        if (nombre.startsWith("sus-"))

            return estadoSuscripcion(
                r,nombre.replace("sus-","")
            );

        if (nombre === "renovar")

            return renovarSuscripcion(r);

        if (nombre.startsWith("veh-"))

            return estadoVehiculo(
                r,nombre.replace("veh-","")
            );

        if (nombre === "usuario-estado")

            return estadoUsuario(r,!r.activo);

        if (nombre === "reenviar")

            return reenviarInvitacion(r);

        if (nombre === "cancelar-invitacion")

            return cancelarInvitacion(r);

        if (nombre === "detalle")

            return detalleAuditoria(r);

    }

    // =========================================
    // BUSCADORES Y FILTROS
    // =========================================

    function dibujarTabla() {

        const zona = $("abmTabla");

        if (!zona) return;

        const buscar = $("abmBuscar")
            ?.value.toLowerCase().trim() || "";

        const filtroEstado = $("abmEstado")
            ?.value || "";

        const lista = registros.filter(r => {

            if (

                empresaSeleccionada &&

                seccion !== "invitaciones" &&

                r.empresa_id !== empresaSeleccionada &&

                ["suscripciones","vehiculos","usuarios","auditoria"]
                    .includes(seccion)

            ) return false;

            if (filtroEstado) {

                const valor = r.estado !== undefined

                    ? String(r.estado)

                    : String(r.activo);

                if (valor !== filtroEstado)

                    return false;

            }

            if (buscar) {

                const texto = fila(r)
                    .join(" ")
                    .replace(/<[^>]*>/g," ")
                    .toLowerCase();

                if (!texto.includes(buscar))

                    return false;

            }

            return true;

        });

        if (!lista.length) {

            zona.innerHTML =

                '<div class="vacio">' +

                'No hay registros para mostrar.' +

                '</div>';

            return;

        }

        zona.innerHTML = `

            <div class="tabla-contenedor">

                <table>

                    <thead>

                        <tr>

                            ${configuracion[seccion]
                                .columnas.map(c =>

                                    '<th>' + esc(c) + '</th>'

                                ).join("")}

                        </tr>

                    </thead>

                    <tbody>

                        ${lista.map(r =>

                            '<tr>' +

                            fila(r).map(c =>

                                '<td>' + c + '</td>'

                            ).join("") +

                            '</tr>'

                        ).join("")}

                    </tbody>

                </table>

            </div>

            <div class="vacio">

                ${lista.length} de ${registros.length} registros

            </div>

        `;

        zona.onclick = e => {

            const b = e.target.closest("[data-abm]");

            if (!b) return;

            accion(b.dataset.abm,b.dataset.id);

        };

    }

    function opcionesEstado() {

        const opciones = {

            empresas:["activo","suspendido","cancelado"],

            planes:["true","false"],

            suscripciones:[
                "activo","suspendido","cancelado","vencido"
            ],

            vehiculos:["activo","mantenimiento","inactivo"],

            usuarios:["true","false"],

            invitaciones:[
                "pendiente","aceptada","cancelada","vencida"
            ]

        };

        return (opciones[seccion] || []).map(s =>

            '<option value="' + esc(s) + '">' +

            esc(

                s === "true" ? "Activo" :

                s === "false" ? "Inactivo" :

                s.charAt(0).toUpperCase() + s.slice(1)

            ) +

            '</option>'

        ).join("");

    }

    async function cargarInvitaciones() {

        const consulta = ++version;

        const empresa = empresaSeleccionada;

        registros = [];

        if (!empresa) {

            dibujarTabla();

            if ($("abmTabla"))

                $("abmTabla").innerHTML =

                    '<div class="vacio">' +

                    'Seleccioná una empresa para consultar sus invitaciones.' +

                    '</div>';

            return;

        }

        try {

            const datos = await rpc(

                "tracking_listar_invitaciones",

                {p_empresa_id:empresa}

            );

            if (consulta !== version) return;

            registros = datos || [];

            dibujarTabla();

        } catch (error) {

            if (consulta === version)

                mensaje(error.message,true);

        }

    }

    // =========================================
    // CARGA DEL MÓDULO
    // =========================================

    async function mostrar(id) {

        if (!configuracion[id]) {

            version++;

            return false;

        }

        const consulta = ++version;

        seccion = id;

        const tareas = [

            consultar("tracking_empresas"),

            consultar("tracking_planes")

        ];

        if (id === "invitaciones") {

            tareas.push(Promise.resolve([]));

        } else if (id === "auditoria") {

            tareas.push(

                db.from("tracking_auditoria")

                    .select("*")

                    .order("fecha",{ascending:false})

                    .limit(500)

                    .then(r => {

                        if (r.error) throw r.error;

                        return r.data || [];

                    })

            );

        } else {

            tareas.push(

                consultar(configuracion[id].tabla)

            );

        }

        const datos = await Promise.all(tareas);

        if (consulta !== version) return true;

        empresas = datos[0];

        planes = datos[1];

        registros = datos[2];

        const filtrarEmpresa = [

            "suscripciones",

            "vehiculos",

            "usuarios",

            "invitaciones",

            "auditoria"

        ].includes(id);

        if (!filtrarEmpresa)

            empresaSeleccionada = "";

        if (

            empresaSeleccionada &&

            !empresas.some(e => e.id === empresaSeleccionada)

        ) empresaSeleccionada = "";

        $("contenidoPagina").innerHTML = `

            <section class="panel">

                <div class="abm-barra">

                    <input id="abmBuscar"

                           type="search"

                           placeholder="Buscar registros...">

                    ${filtrarEmpresa ? `

                        <select id="abmEmpresa">

                            <option value="">

                                ${id === "invitaciones"
                                    ? "Seleccionar empresa"
                                    : "Todas las empresas"}

                            </option>

                            ${empresas.map(e => `

                                <option value="${esc(e.id)}"

                                    ${empresaSeleccionada === e.id
                                        ? "selected"
                                        : ""}>

                                    ${esc(e.razon_social)}

                                </option>

                            `).join("")}

                        </select>

                    ` : ""}

                    ${opcionesEstado() ? `

                        <select id="abmEstado">

                            <option value="">
                                Todos los estados
                            </option>

                            ${opcionesEstado()}

                        </select>

                    ` : ""}

                    ${configuracion[id].nuevo ? `

                        <button id="abmNuevo"
                                class="abm-nuevo"
                                type="button">

                            ＋ ${esc(configuracion[id].nuevo)}

                        </button>

                    ` : ""}

                </div>

                <div id="abmTabla"></div>

                ${id === "auditoria"
                    ? '<p class="abm-ayuda">Últimas 500 operaciones como máximo. Registro de solo lectura.</p>'
                    : ""}

            </section>

        `;

        if ($("abmNuevo"))

            $("abmNuevo").onclick = nuevo;

        $("abmBuscar").oninput = dibujarTabla;

        if ($("abmEstado"))

            $("abmEstado").onchange = dibujarTabla;

        if ($("abmEmpresa"))

            $("abmEmpresa").onchange = async e => {

                empresaSeleccionada = e.target.value;

                if (seccion === "invitaciones")

                    await cargarInvitaciones();

                else

                    dibujarTabla();

            };

        if (id === "invitaciones")

            await cargarInvitaciones();

        else

            dibujarTabla();

        return true;

    }

    return {

        mostrar,

        invalidar() {

            version++;

        }

    };

}
