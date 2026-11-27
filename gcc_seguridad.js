// =====================================================
// GCC TRACKING - SEGURIDAD WEB
// Versión 3.0
// =====================================================

export function instalarSeguridad({
    db,
    supabaseUrl,
    supabaseKey
}) {

    let ultimaSolicitud = 0;
    let solicitudEnCurso = false;

    const normalizarEmail = email =>
        String(email || "").trim().toLowerCase();

    function validarEmail(email) {

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("Ingresá un correo electrónico válido.");
        }

    }

    function validarClave(clave, confirmacion) {

        if (clave.length < 8) {
            throw new Error(
                "La contraseña debe tener al menos 8 caracteres."
            );
        }

        if (clave !== confirmacion) {
            throw new Error("Las contraseñas no coinciden.");
        }

    }

    async function solicitar(
        ruta,
        metodo,
        datos,
        token = null
    ) {

        const headers = {
            "apikey": supabaseKey,
            "Content-Type": "application/json"
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const controlador = new AbortController();

        const temporizador = setTimeout(
            () => controlador.abort(),
            20000
        );

        let respuesta;
        let texto;

        try {

        respuesta = await fetch(
            `${supabaseUrl}/auth/v1/${ruta}`,
            {
                method: metodo,
                headers,
                cache: "no-store",
                signal: controlador.signal,
                body: datos === null
                    ? undefined
                    : JSON.stringify(datos)
            }
        );

        texto = await respuesta.text();

        } catch (error) {

            if (error.name === "AbortError") {
                throw new Error(
                    "El servidor demoró demasiado. Verificá la conexión."
                );
            }

            throw new Error(
                "No se pudo conectar con el servicio de seguridad."
            );

        } finally {

            clearTimeout(temporizador);

        }

        let resultado = {};

        try {
            resultado = texto ? JSON.parse(texto) : {};
        } catch {
            resultado = {};
        }

        if (!respuesta.ok) {



            if (respuesta.status === 429) {
                throw new Error(
                    "Demasiados intentos. Esperá unos minutos."
                );
            }

            if (ruta === "recover") {

                if ([400, 404, 422].includes(respuesta.status)) {
                    return {};
                }

                throw new Error(
                    "El servicio de recuperación no está disponible. Intentá más tarde."
                );
            }

            if (ruta === "verify") {
                throw new Error(
                    respuesta.status >= 500
                        ? "El servicio de recuperación no está disponible."
                        : "El código es incorrecto, venció o ya fue utilizado."
                );
            }

            if ((resultado.error_code || resultado.code) === "same_password") {
                throw new Error(
                    "La nueva contraseña debe ser diferente de la anterior."
                );
            }

            if ((resultado.error_code || resultado.code) === "weak_password") {
                throw new Error(
                    "La contraseña no cumple los requisitos de seguridad."
                );
            }

            throw new Error(
                "No se pudo completar la operación de seguridad."
            );

        }

        return resultado;

    }

    // =================================================
    // SOLICITAR CÓDIGO DE RECUPERACIÓN
    // =================================================

    async function enviarCodigo(email) {

        email = normalizarEmail(email);

        validarEmail(email);

        if (solicitudEnCurso) {
            throw new Error("Hay una solicitud en curso.");
        }

        if (Date.now() - ultimaSolicitud < 60000) {
            throw new Error(
                "Esperá 60 segundos antes de solicitar otro código."
            );
        }

        solicitudEnCurso = true;
        ultimaSolicitud = Date.now();

        try {

            await solicitar(
                "recover",
                "POST",
                { email }
            );

            ultimaSolicitud = Date.now();

            return {
                ok: true,
                mensaje:
                    "Si el correo está registrado, recibirás un código de recuperación."
            };

        } finally {

            solicitudEnCurso = false;

        }

    }

    // =================================================
    // RESTABLECER CONTRASEÑA
    // =================================================

    async function recuperarContrasena(
        email,
        codigo,
        clave,
        confirmacion
    ) {

        email = normalizarEmail(email);
        codigo = String(codigo || "").trim();

        validarEmail(email);
        validarClave(clave, confirmacion);

        if (!/^\d{8}$/.test(codigo)) {

            throw new Error(
                "Ingresá el código de 8 dígitos recibido por correo."
            );

        }

        if (solicitudEnCurso) {
            throw new Error("Hay una solicitud en curso.");
        }

        solicitudEnCurso = true;

        let tokenTemporal = null;

        try {

            const sesion = await solicitar(
                "verify",
                "POST",
                {
                    email,
                    token: codigo,
                    type: "recovery"
                }
            );

            tokenTemporal = sesion.access_token;

            if (!tokenTemporal) {

                throw new Error(
                    "No se pudo validar la sesión de recuperación."
                );

            }

            try {

                await solicitar(
                    "user",
                    "PUT",
                    { password: clave },
                    tokenTemporal
                );

            } catch (error) {

                throw new Error(
                    error.message +
                    " El código ya fue validado. Si no podés ingresar con la nueva contraseña, solicitá otro código."
                );

            }

            return {
                ok: true,
                mensaje:
                    "Contraseña restablecida correctamente. Ya podés iniciar sesión."
            };

        } finally {

            if (tokenTemporal) {

                try {

                    await solicitar(
                        "logout?scope=local",
                        "POST",
                        null,
                        tokenTemporal
                    );

                } catch {

                    console.warn(
                        "No se pudo revocar la sesión temporal."
                    );

                }

            }

            tokenTemporal = null;
            solicitudEnCurso = false;

        }

    }

    // =================================================
    // CAMBIAR CONTRASEÑA DESDE EL PERFIL
    // =================================================

    async function cambiarContrasena(
        claveActual,
        claveNueva,
        confirmacion
    ) {

        validarClave(claveNueva, confirmacion);

        if (!claveActual) {
            throw new Error(
                "Ingresá tu contraseña actual."
            );
        }

        if (claveActual === claveNueva) {
            throw new Error(
                "La nueva contraseña debe ser diferente."
            );
        }

        if (solicitudEnCurso) {
            throw new Error("Hay una solicitud en curso.");
        }

        solicitudEnCurso = true;

        let tokenTemporal = null;

        try {

            const { data, error } =
                await db.auth.getUser();

            if (error || !data.user?.email) {

                throw new Error(
                    "La sesión no está disponible."
                );

            }

            let verificacion;

            try {

                verificacion = await solicitar(
                    "token?grant_type=password",
                    "POST",
                    {
                        email: data.user.email,
                        password: claveActual
                    }
                );

            } catch {

                throw new Error(
                    "No se pudo verificar la contraseña actual."
                );

            }

            tokenTemporal = verificacion.access_token;

            if (
                !tokenTemporal ||
                verificacion.user?.id !== data.user.id
            ) {

                throw new Error(
                    "No se pudo verificar la identidad."
                );

            }

            await solicitar(
                "user",
                "PUT",
                {
                    current_password: claveActual,
                    password: claveNueva
                },
                tokenTemporal
            );

            return {
                ok: true,
                mensaje:
                    "Contraseña modificada correctamente."
            };

        } finally {

            if (tokenTemporal) {

                try {

                    await solicitar(
                        "logout?scope=local",
                        "POST",
                        null,
                        tokenTemporal
                    );

                } catch {

                    console.warn(
                        "No se pudo revocar la sesión temporal."
                    );

                }

            }

            tokenTemporal = null;
            solicitudEnCurso = false;

        }

    }

    // =================================================
    // INTERFAZ PÚBLICA DEL MÓDULO
    // =================================================

    return Object.freeze({

        enviarCodigo,

        recuperarContrasena,

        cambiarContrasena

    });

}
