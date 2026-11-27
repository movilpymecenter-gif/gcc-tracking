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
                    typeof respuesta === "string" &&
                    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(respuesta)
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


    const etiquetasAuditoria = {
        razon_social: "Razón social",
        nombre_comercial: "Nombre comercial",
        nombre: "Nombre",
        cuit: "CUIT",
        email: "Correo electrónico",
        telefono: "Teléfono",
        domicilio: "Domicilio",
        localidad: "Localidad",
        provincia: "Provincia",
        pais: "País",
        estado: "Estado",
        activo: "Habilitado",
        empresa_id: "Empresa",
        plan_id: "Plan comercial",
        max_vehiculos: "Vehículos autorizados",
        max_usuarios_administrativos: "Usuarios autorizados",
        importe_mensual: "Abono contratado",
        precio_mensual: "Precio mensual del plan",
        moneda: "Moneda",
        fecha_inicio: "Fecha de inicio",
        fecha_vencimiento: "Vencimiento",
        descripcion: "Descripción",
        observaciones: "Observaciones",
        patente: "Patente",
        marca: "Marca",
        modelo: "Modelo",
        anio: "Año",
        tipo: "Tipo",
        capacidad_kg: "Capacidad en kg",
        capacidad_bultos: "Capacidad en bultos",
        rol: "Perfil de usuario"
    };

    function entidadAuditoria(valor) {

        return ({
            empresas: "Empresa",
            planes: "Plan comercial",
            suscripciones: "Suscripción",
            vehiculos: "Vehículo",
            usuarios: "Usuario",
            invitaciones: "Invitación",
            superadministradores: "Superadministrador"
        })[String(valor || "").replace(/^tracking_/, "")]
            || String(valor || "Sin identificar");
    }

    function accionAuditoria(valor) {

        const a = String(valor || "").toLowerCase();

        return ({
            insert: "Alta de registro",
            update: "Modificación",
            delete: "Eliminación",
            crear: "Alta de registro",
            modificar: "Modificación",
            renovar: "Renovación",
            suspender: "Suspensión",
            activar: "Activación",
            cancelar: "Cancelación"
        })[a] || a.replaceAll("_", " ");
    }

    function valorAuditoria(campo, valor, datos) {

        if (valor === null || valor === undefined || valor === "")
            return "Sin dato";

        if (campo === "empresa_id")
            return empresaNombre(valor) || "Empresa no disponible";

        if (campo === "plan_id")
            return planNombre(valor) || "Plan no disponible";

        if (["importe_mensual", "precio_mensual"].includes(campo))
            return moneda(valor, datos.moneda || "ARS");

        if (["fecha_inicio", "fecha_vencimiento"].includes(campo))
            return fecha(valor);

        if (typeof valor === "boolean")
            return valor ? "Sí" : "No";

        if (typeof valor === "object")
            return JSON.stringify(valor);

        const estados = {
            activo: "Activo",
            suspendido: "Suspendido",
            cancelado: "Cancelado",
            vencido: "Vencido",
            pendiente: "Pendiente",
            administrador: "Administrador",
            operador: "Operador",
            supervisor: "Supervisor",
            chofer: "Chofer",
            inactivo: "Inactivo",
            mantenimiento: "Mantenimiento"
        };

        if (["estado", "rol"].includes(campo))
            return estados[valor] || String(valor);

        return String(valor);
    }

    function detalleAuditoria(r) {

        const antes = r.datos_anteriores || {};
        const despues = r.datos_nuevos || {};

        const motivo =
            despues.motivo ||
            despues.motivo_cancelacion ||
            antes.motivo ||
            "";

        const campos = [...new Set([
            ...Object.keys(antes),
            ...Object.keys(despues)
        ])];

        const tecnicos = new Set([
            "id", "user_id", "creado", "creado_por",
            "actualizado", "motivo", "motivo_cancelacion",
            "token", "token_hash", "aceptado_por",
            "cancelado_por"
        ]);

        const cambios = campos.filter(c =>
            !tecnicos.has(c) &&
            JSON.stringify(antes[c]) !== JSON.stringify(despues[c])
        );

        const filas = cambios.map(c => `
            <tr>
                <td><strong>${esc(
                    etiquetasAuditoria[c] || c.replaceAll("_", " ")
                )}</strong></td>
                <td class="audit-anterior">${esc(
                    valorAuditoria(c, antes[c], antes)
                )}</td>
                <td class="audit-nuevo">${esc(
                    valorAuditoria(c, despues[c], despues)
                )}</td>
            </tr>
        `).join("");

        const fechaHora = new Date(r.fecha).toLocaleString("es-AR", {
            timeZone: "America/Argentina/Buenos_Aires"
        });

        const html = `
            <div class="abm-ancho">

                <div class="audit-resumen">

                    <strong>${esc(accionAuditoria(r.accion))}</strong>
                    <p>Entidad: ${esc(entidadAuditoria(r.entidad))}</p>
                    <p>Empresa: ${esc(empresaNombre(r.empresa_id))}</p>
                    <p>Fecha y hora: ${esc(fechaHora)}</p>
                    <p>Responsable:
                        <span id="auditResponsable">Consultando...</span>
                    </p>

                </div>

                <div class="audit-motivo">
                    <strong>Motivo de la operación</strong>
                    <p>${esc(motivo || "No se registró un motivo.")}</p>
                </div>

                <h4>Detalle de los cambios</h4>

                ${cambios.length ? `
                    <div class="tabla-contenedor">
                        <table>
                            <thead>
                                <tr>
                                    <th>Concepto</th>
                                    <th>Anterior</th>
                                    <th>Nuevo</th>
                                </tr>
                            </thead>
                            <tbody>${filas}</tbody>
                        </table>
                    </div>
                ` : "<p>No se registraron cambios comerciales en este evento.</p>"}

                <details class="audit-tecnico">
                    <summary>Ver información técnica</summary>

                    <p>Identificador del responsable:
                        ${esc(r.user_id || "No registrado")}
                    </p>

                    <h4>Datos anteriores</h4>
                    <pre class="abm-detalle">${
                        esc(JSON.stringify(r.datos_anteriores, null, 2))
                    }</pre>

                    <h4>Datos nuevos</h4>
                    <pre class="abm-detalle">${
                        esc(JSON.stringify(r.datos_nuevos, null, 2))
                    }</pre>
                </details>

            </div>
        `;

        formulario(
            "Historial de auditoría",
            [html],
            async () => {},
            "Registro histórico de solo lectura."
        );

        $("abmGuardar").hidden = true;
        $("abmCancelar").textContent = "Cerrar";
        $("abmFormulario").onsubmit = e => e.preventDefault();

        const destino = $("auditResponsable");

        (async () => {

            let nombre = "";

            try {

                if (r.user_id) {

                    const admin = await db
                        .from("tracking_superadministradores")
                        .select("nombre")
                        .eq("user_id", r.user_id)
                        .maybeSingle();

                    nombre = admin.data?.nombre || "";

                    if (!nombre && r.empresa_id) {

                        const usuario = await db
                            .from("tracking_usuarios")
                            .select("nombre")
                            .eq("user_id", r.user_id)
                            .eq("empresa_id", r.empresa_id)
                            .maybeSingle();

                        nombre = usuario.data?.nombre || "";
                    }
                }

            } catch {}

            if (destino.isConnected) {
                destino.textContent = nombre ||
                    "Responsable no identificado";
            }

        })();

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
                "Empresas vigentes",
                "Abonos proyectados",
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

        if (nombre === "comercial-plan")
            return detalleComercialPlan(r);

        if (nombre === "historial")
            return historialRegistro(r);

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



    let comercialSuscripciones = [];
    let comercialVehiculos = [];
    let comercialUsuarios = [];

    function hoyComercial() {

        const partes = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Argentina/Buenos_Aires",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date());

        const d = Object.fromEntries(
            partes.map(p => [p.type, p.value])
        );

        return `${d.year}-${d.month}-${d.day}`;
    }

    function suscripcionVigente(r) {

        const hoy = hoyComercial();

        return r.estado === "activo" &&
            (!r.fecha_inicio || r.fecha_inicio <= hoy) &&
            (!r.fecha_vencimiento || r.fecha_vencimiento >= hoy) &&
            empresas.some(e =>
                e.id === r.empresa_id && e.estado === "activo"
            );
    }

    function personalizada(r, plan) {

        if (!plan) return false;

        const distintos = (a, b) =>
            a == null || b == null
                ? a !== b
                : Number(a) !== Number(b);

        return distintos(r.max_vehiculos, plan.max_vehiculos) ||
            distintos(
                r.max_usuarios_administrativos,
                plan.max_usuarios_administrativos
            ) ||
            distintos(r.importe_mensual, plan.precio_mensual) ||
            r.moneda !== plan.moneda;
    }

    function ocupacionEmpresa(id) {

        return {

            vehiculos: comercialVehiculos.filter(v =>
                v.empresa_id === id &&
                ["activo", "mantenimiento"].includes(v.estado)
            ).length,

            usuarios: comercialUsuarios.filter(u =>
                u.empresa_id === id &&
                u.activo &&
                ["administrador", "operador", "supervisor"]
                    .includes(u.rol)
            ).length
        };
    }

    function resumenPlan(plan) {

        const lista = comercialSuscripciones.filter(s =>
            s.plan_id === plan.id && suscripcionVigente(s)
        );

        const resultado = {
            lista,
            empresas: new Set(lista.map(s => s.empresa_id)).size,
            vehiculos: 0,
            vehiculosUsados: 0,
            usuarios: 0,
            usuariosUsados: 0,
            importes: {},
            sinImporte: 0
        };

        for (const r of lista) {

            const ocupacion = ocupacionEmpresa(r.empresa_id);

            resultado.vehiculos += Number(r.max_vehiculos || 0);
            resultado.usuarios += Number(r.max_usuarios_administrativos || 0);

            resultado.vehiculosUsados += ocupacion.vehiculos;
            resultado.usuariosUsados += ocupacion.usuarios;

            if (r.importe_mensual == null) {
                resultado.sinImporte++;
            } else {

                const m = r.moneda || "ARS";

                resultado.importes[m] =
                    (resultado.importes[m] || 0) +
                    Number(r.importe_mensual);
            }
        }

        return resultado;
    }

    function importeProyectado(resumen) {

        return Object.entries(resumen.importes)
            .map(([m, importe]) =>
                m + " " + moneda(importe, m)
            ).join(" · ") || "Sin importe informado";
    }

    function porcentajeOcupacion(usados, autorizados) {

        return autorizados
            ? (usados / autorizados * 100).toLocaleString(
                "es-AR", {maximumFractionDigits: 1}
            ) + "%"
            : "—";
    }

    function detalleComercialPlan(plan) {

        const resumen = resumenPlan(plan);

        const filas = resumen.lista.map(r => {

            const o = ocupacionEmpresa(r.empresa_id);

            const tipo = personalizada(r, plan)
                ? '<span class="comercial-personalizado">Difiere del plan</span>'
                : '<span class="comercial-estandar">Estándar</span>';

            return `
                <tr>
                    <td>${esc(empresaNombre(r.empresa_id))}</td>

                    <td>${esc(moneda(r.importe_mensual, r.moneda))}</td>

                    <td>${esc(fecha(r.fecha_vencimiento))}</td>

                    <td>${o.vehiculos} / ${Number(r.max_vehiculos || 0)}</td>

                    <td>${o.usuarios} / ${Number(r.max_usuarios_administrativos || 0)}</td>

                    <td>${tipo}</td>

                    <td>
                        <button type="button"
                                class="abm-accion historial"
                                data-suscripcion="${esc(r.id)}">
                            Ver suscripción
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        formulario(
            "Análisis comercial · " + plan.nombre,
            [`
                <div class="abm-ancho">

                    <div class="comercial-tarjetas">

                        <div>
                            <small>Empresas vigentes</small>
                            <strong>${resumen.empresas}</strong>
                        </div>

                        <div>
                            <small>Vehículos utilizados / autorizados</small>
                            <strong>${resumen.vehiculosUsados} / ${resumen.vehiculos}</strong>
                        </div>

                        <div>
                            <small>Cupos de vehículos disponibles</small>
                            <strong>${resumen.vehiculos - resumen.vehiculosUsados}</strong>
                        </div>

                        <div>
                            <small>Ocupación de vehículos</small>
                            <strong>${porcentajeOcupacion(
                                resumen.vehiculosUsados,
                                resumen.vehiculos
                            )}</strong>
                        </div>

                        <div>
                            <small>Usuarios administrativos</small>
                            <strong>${resumen.usuariosUsados} / ${resumen.usuarios}</strong>
                        </div>

                        <div>
                            <small>Cupos administrativos disponibles</small>
                            <strong>${resumen.usuarios - resumen.usuariosUsados}</strong>
                        </div>

                    </div>

                    <div class="comercial-proyeccion">

                        <small>Abonos mensuales proyectados</small>

                        <strong>${esc(importeProyectado(resumen))}</strong>

                        ${resumen.sinImporte
                            ? `<p>${resumen.sinImporte} suscripciones sin importe informado.</p>`
                            : ""}

                    </div>

                    <h3>Empresas con suscripción vigente</h3>

                    ${filas ? `
                    <div class="tabla-contenedor">
                        <table>
                            <thead>
                                <tr>
                                    <th>Empresa</th>
                                    <th>Abono</th>
                                    <th>Vencimiento</th>
                                    <th>Vehículos</th>
                                    <th>Usuarios</th>
                                    <th>Condiciones</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>${filas}</tbody>
                        </table>
                    </div>
                    ` : "<p>No hay empresas vigentes con este plan.</p>"}

                    <p class="abm-ayuda">
                        Los importes son proyecciones comerciales,
                        no cobranzas efectivas.
                        Las condiciones se comparan con el catálogo actual.
                    </p>

                </div>
            `],
            async () => {},
            "Indicadores de suscripciones actualmente vigentes."
        );

        $("abmGuardar").hidden = true;
        $("abmCancelar").textContent = "Cerrar";
        $("abmFormulario").onsubmit = e => e.preventDefault();

        $("abmCampos").querySelectorAll("[data-suscripcion]")
            .forEach(b => {

                b.onclick = async () => {

                    const id = b.dataset.suscripcion;

                    modal.close();

                    await abrirSuscripcion(id);
                };
            });
    }

    async function abrirSuscripcion(id) {

        const {data, error} = await db
            .from("tracking_suscripciones")
            .select("id,empresa_id")
            .eq("id", id)
            .maybeSingle();

        if (error || !data) {

            mensaje("No se pudo localizar la suscripción.", true);
            return;
        }

        empresaSeleccionada = data.empresa_id;

        await navegar("suscripciones");

        if (seccion !== "suscripciones") return;

        const r = registros.find(s => s.id === id);

        if (r && r.estado === "activo") {

            modificarSuscripcion(r);

        } else if (r) {

            mensaje(
                "Suscripción localizada. Seleccioná una acción disponible según su estado."
            );

        }
    }

    const seccionesConHistorial = [
        "empresas",
        "planes",
        "suscripciones",
        "vehiculos",
        "usuarios"
    ];

    function filaConHistorial(r) {


        const celdas = fila(r);

        if (seccion === "planes") {

            const resumen = resumenPlan(r);

            celdas.splice(celdas.length - 1, 0,

                boton(
                    String(resumen.empresas) + " empresas",
                    "comercial-plan",
                    r.id,
                    "historial"
                ),

                esc(importeProyectado(resumen))
            );
        }

        if (seccion === "suscripciones") {

            const plan = planes.find(p => p.id === r.plan_id);

            if (plan) {

                celdas[1] += personalizada(r, plan)
                    ? '<br><span class="comercial-personalizado">Difiere del plan</span>'
                    : '<br><span class="comercial-estandar">Estándar</span>';
            }
        }

        if (seccionesConHistorial.includes(seccion)) {

            celdas[celdas.length - 1] += boton(
                "◷ Historial",
                "historial",
                r.id,
                "historial"
            );
        }

        return celdas;
    }

    async function historialRegistro(r) {

        if (ocupado) return;

        const origen = seccion;
        const versionInicial = version;

        let nombre = r.razon_social ||
                     r.nombre ||
                     r.patente ||
                     empresaNombre(r.empresa_id);

        if (origen === "suscripciones") {
            nombre = empresaNombre(r.empresa_id) +
                     " / " + planNombre(r.plan_id);
        }

        formulario(
            "Historial · " + nombre,
            ['<div id="auditHistorial" class="abm-ancho">Consultando historial...</div>'],
            async () => {},
            "Operaciones registradas sobre este elemento."
        );

        $("abmGuardar").hidden = true;
        $("abmCancelar").textContent = "Cerrar";
        $("abmFormulario").onsubmit = e => e.preventDefault();

        const destino = $("auditHistorial");

        try {

            const eventos = [];
            const cantidad = 200;

            for (let desde = 0; ; desde += cantidad) {

                const {data, error} = await db
                    .from("tracking_auditoria")
                    .select("*")
                    .eq("entidad_id", r.id)
                    .order("fecha", {ascending: false})
                    .order("id", {ascending: false})
                    .range(desde, desde + cantidad - 1);

                if (error) throw error;

                if (!destino.isConnected ||
                    !modal.open ||
                    origen !== seccion ||
                    versionInicial !== version) return;

                eventos.push(...(data || []));

                if (!data || data.length < cantidad) break;
            }

            if (!eventos.length) {

                destino.textContent =
                    "No hay operaciones históricas registradas.";

                return;
            }

            const tarjetas = eventos.map((evento, i) => {

                const fechaHora = new Date(evento.fecha)
                    .toLocaleString("es-AR", {
                        timeZone: "America/Argentina/Buenos_Aires"
                    });

                const motivo =
                    evento.datos_nuevos?.motivo ||
                    evento.datos_nuevos?.motivo_cancelacion ||
                    evento.datos_anteriores?.motivo ||
                    "";

                return `
                    <article class="historial-evento">

                        <small>${esc(fechaHora)}</small>

                        <h4>${esc(
                            accionAuditoria(evento.accion)
                        )}</h4>

                        <p>${esc(
                            entidadAuditoria(evento.entidad)
                        )}</p>

                        ${motivo
                            ? `<p class="historial-motivo">${esc(motivo)}</p>`
                            : ""}

                        <button type="button"
                                class="abm-accion historial"
                                data-evento="${i}">
                            Ver detalle
                        </button>

                    </article>
                `;
            }).join("");

            destino.innerHTML = `
                <div class="historial-total">
                    ${eventos.length} operaciones registradas
                </div>

                <div class="historial-linea">
                    ${tarjetas}
                </div>
            `;

            destino.onclick = e => {

                const b = e.target.closest("[data-evento]");

                if (!b) return;

                const evento = eventos[Number(b.dataset.evento)];

                if (!evento) return;

                detalleAuditoria(evento);

                const volver = document.createElement("button");

                volver.type = "button";
                volver.className = "abm-accion historial";
                volver.textContent = "← Volver al historial";

                volver.onclick = () => historialRegistro(r);

                $("abmCampos").appendChild(volver);
            };

        } catch (error) {

            if (destino.isConnected && modal.open) {
                destino.textContent =
                    "No se pudo consultar el historial: " +
                    (error.message || "Error de conexión");
            }
        }
    }

    function dibujarTabla() {

        const zona = $("abmTabla");

        if (!zona) return;

        const buscar = $("abmBuscar")
            ?.value.toLowerCase().trim() || "";

        const filtroEstado = $("abmEstado")
            ?.value || "";

        // GCC V3 - FILTROS INTELIGENTES

        const tipoUsuario = $("abmTipoUsuario")?.value || "";

        const lista = registros.filter(r => {

            if (seccion === "usuarios") {

                if (tipoUsuario === "administrativos" &&
                    !["administrador","operador","supervisor"]
                        .includes(r.rol))
                    return false;

                if (tipoUsuario === "choferes" &&
                    r.rol !== "chofer")
                    return false;
            }


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

                if (seccion === "vehiculos" &&
                    filtroEstado === "habilitados") {

                    if (!["activo","mantenimiento"].includes(r.estado))
                        return false;

                } else if (seccion === "suscripciones" &&
                           filtroEstado === "vigentes") {

                    if (!suscripcionVigente(r))
                        return false;

                } else if (valor !== filtroEstado)

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

                            filaConHistorial(r).map(c =>

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


    // GCC V3 - INFORME DE ABONOS

    async function mostrarAbonos() {

        const consulta = ++version;
        seccion = "abonos";

        const datos = await Promise.all([
            consultar("tracking_empresas"),
            consultar("tracking_planes"),
            consultar("tracking_suscripciones")
        ]);

        if (consulta !== version) return;

        empresas = datos[0];
        planes = datos[1];

        const lista = datos[2]
            .filter(suscripcionVigente)
            .sort((a,b) =>
                empresaNombre(a.empresa_id).localeCompare(
                    empresaNombre(b.empresa_id), "es"
                )
            );

        const resumen = {
            empresas: new Set(
                lista.map(r => r.empresa_id)
            ).size,
            vehiculos: 0,
            usuarios: 0,
            importes: Object.create(null),
            sinImporte: 0
        };

        for (const r of lista) {

            resumen.vehiculos += Number(r.max_vehiculos || 0);

            resumen.usuarios +=
                Number(r.max_usuarios_administrativos || 0);

            if (r.importe_mensual == null) {

                resumen.sinImporte++;

            } else {

                const m = r.moneda || "ARS";

                resumen.importes[m] =
                    (resumen.importes[m] || 0) +
                    Number(r.importe_mensual);
            }
        }

        const filas = lista.map(r => `

            <tr>
                <td><strong>${esc(empresaNombre(r.empresa_id))}</strong></td>

                <td>${esc(planNombre(r.plan_id))}</td>

                <td>${Number(r.max_vehiculos || 0)}</td>

                <td>${Number(r.max_usuarios_administrativos || 0)}</td>

                <td class="abono-importe">
                    ${r.importe_mensual == null
                        ? "Sin informar"
                        : esc((r.moneda || "ARS") + " " +
                            moneda(r.importe_mensual, r.moneda || "ARS"))}
                </td>

                <td>${esc(fecha(r.fecha_vencimiento))}</td>

                <td>
                    <button type="button"
                            class="abm-accion historial"
                            data-abono-suscripcion="${esc(r.id)}">
                        Ver suscripción
                    </button>
                </td>
            </tr>

        `).join("");

        $("contenidoPagina").innerHTML = `

            <section class="panel">

                <div class="abonos-cabecera">

                    <div>
                        <h3>Proyección mensual de ingresos</h3>
                        <p>Suscripciones vigentes de empresas autorizadas</p>
                    </div>

                    <button type="button"
                            id="abonosVolver"
                            class="abm-accion historial">
                        ← Volver al inicio
                    </button>

                </div>

                <div class="abonos-indicadores">

                    <div class="abono-indicador">
                        <small>Empresas autorizadas</small>
                        <strong>${resumen.empresas}</strong>
                    </div>

                    <div class="abono-indicador">
                        <small>Vehículos contratados</small>
                        <strong>${resumen.vehiculos}</strong>
                    </div>

                    <div class="abono-indicador">
                        <small>Usuarios contratados</small>
                        <strong>${resumen.usuarios}</strong>
                    </div>

                    <div class="abono-indicador destacado">
                        <small>Total mensual proyectado</small>
                        <strong>${esc(importeProyectado(resumen))}</strong>
                    </div>

                </div>

                <h3>Detalle de abonos por empresa</h3>

                ${filas ? `

                    <div class="tabla-contenedor">
                        <table>
                            <thead>
                                <tr>
                                    <th>Empresa</th>
                                    <th>Plan</th>
                                    <th>Vehículos</th>
                                    <th>Usuarios</th>
                                    <th>Abono mensual</th>
                                    <th>Vencimiento</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>

                            <tbody>${filas}</tbody>

                        </table>
                    </div>

                ` : '<div class="vacio">No hay suscripciones vigentes.</div>'}

                <div class="abonos-total">

                    <span>TOTAL MENSUAL PROYECTADO</span>

                    <strong>${esc(importeProyectado(resumen))}</strong>

                </div>

                ${resumen.sinImporte
                    ? `<p class="abm-ayuda">
                        Atención: ${resumen.sinImporte} suscripciones
                        sin importe informado.
                       </p>`
                    : ""}

                <p class="abm-ayuda">
                    Los importes corresponden a abonos contratados,
                    no a cobranzas efectivas.
                    Los totales se expresan por moneda.
                </p>

            </section>
        `;

        $("abonosVolver").onclick = () => navegar("inicio");

        $("contenidoPagina")
            .querySelectorAll("[data-abono-suscripcion]")
            .forEach(b => {

                b.onclick = async () => {

                    if (b.disabled) return;

                    b.disabled = true;

                    try {

                        await abrirSuscripcion(
                            b.dataset.abonoSuscripcion
                        );

                    } catch (error) {

                        mensaje(
                            "No se pudo abrir la suscripción.",
                            true
                        );

                    } finally {

                        b.disabled = false;
                    }
                };
            });
    }

    async function mostrar(id, indicador = "") {

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

        if (id === "planes") {

            tareas.push(
                consultar("tracking_suscripciones"),
                consultar("tracking_vehiculos"),
                consultar("tracking_usuarios")
            );
        }

        const datos = await Promise.all(tareas);

        if (consulta !== version) return true;

        empresas = datos[0];

        planes = datos[1];

        registros = datos[2];

        comercialSuscripciones = datos[3] || [];
        comercialVehiculos = datos[4] || [];
        comercialUsuarios = datos[5] || [];

        const filtrarEmpresa = [

            "suscripciones",

            "vehiculos",

            "usuarios",

            "invitaciones",

            "auditoria"

        ].includes(id);

        if (indicador || id === "usuarios")
            empresaSeleccionada = "";

        if (!filtrarEmpresa)

            empresaSeleccionada = "";

        if (

            empresaSeleccionada &&

            !empresas.some(e => e.id === empresaSeleccionada)

        ) empresaSeleccionada = "";

        $("contenidoPagina").innerHTML = `

            <section class="panel">

                <!-- GCC V3 - REGRESO UNIVERSAL -->

                <div class="abonos-cabecera">

                    <div></div>

                    <button type="button"
                            id="abmVolverInicio"
                            class="abm-accion historial">
                        ← Volver al inicio
                    </button>

                </div>

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

                            ${id === "vehiculos"
        ? '<option value="habilitados">Habilitados</option>'
        : ""}

    ${id === "suscripciones"
        ? '<option value="vigentes">Vigentes y autorizadas</option>'
        : ""}

    ${opcionesEstado()}

                        </select>

                    ` : ""}

                    ${id === "usuarios" ? `

        <select id="abmTipoUsuario"
                aria-label="Tipo de usuario">

            <option value="">Todos los usuarios</option>
            <option value="administrativos">Administrativos</option>
            <option value="choferes">Choferes</option>

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

        $("abmVolverInicio").onclick =
            () => navegar("inicio");

        $("abmBuscar").oninput = dibujarTabla;

        if ($("abmTipoUsuario")) {

            $("abmTipoUsuario").onchange = dibujarTabla;

            if (indicador === "usuarios")
                $("abmTipoUsuario").value = "administrativos";
        }

        if ($("abmEstado")) {

            const filtrosIniciales = {
                usuarios: "true",
                vehiculos: "habilitados",
                suscripciones: "vigentes"
            };

            $("abmEstado").value =
                filtrosIniciales[indicador] || "";
        }


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

        abrirSuscripcion,
        mostrarAbonos,

        invalidar() {

            version++;

        }

    };

}
