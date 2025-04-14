# Explicación del Script Malicioso JavaScript (Stealer)

> **⚠️ ADVERTENCIA DE SEGURIDAD MUY IMPORTANTE ⚠️**
>
> Este script es **MALWARE PELIGROSO** (un *infostealer* o ladrón de información). **NO LO EJECUTES BAJO NINGUNA CIRCUNSTANCIA** en ningún sistema que valores. Su propósito es robar información sensible y comprometer tu seguridad. Esta explicación es únicamente con fines educativos y de análisis.

## Resumen General

Este script está diseñado para infiltrarse en un sistema (es compatible con Windows, macOS y Linux), recolectar una gran cantidad de datos sensibles, y enviarlos a un servidor remoto controlado por el atacante (servidor de Comando y Control o C2). Además, tiene la capacidad de descargar y ejecutar código adicional para extender su funcionalidad o instalar más malware.

## Funcionalidades Detalladas

El script realiza las siguientes acciones principales:

1.  **Recolecta Información Inicial del Sistema:**
    *   Obtiene el nombre del host (`hostname`).
    *   Identifica el sistema operativo (`platform` - Windows, 'darwin' para macOS, Linux).
    *   Determina el directorio principal del usuario (`homedir`) y el directorio temporal (`tmpdir`).

2.  **Define Rutas Objetivo:**
    *   Contiene listas predefinidas de rutas donde navegadores web y aplicaciones de criptomonedas suelen guardar sus datos sensibles en diferentes sistemas operativos.
    *   Incluye rutas para AppData\Local, AppData\Roaming (Windows), Library/Application Support (macOS) y .config (Linux).

3.  **Busca y Roba Datos de Navegadores:**
    *   **Navegadores Afectados:** Chrome, Edge, Brave, Opera, Opera GX, Yandex, Firefox.
    *   **Datos Buscados:**
        *   `Local State`: A menudo contiene la clave necesaria para descifrar contraseñas y cookies (requiere el archivo `dpapi_tool` descargado en Windows).
        *   `Login Data`: Bases de datos con contraseñas guardadas (en navegadores basados en Chromium).
        *   `Web Data`: Puede contener datos de autocompletar, incluyendo información personal y a veces tarjetas de crédito.
        *   `Cookies`: Permiten secuestrar sesiones activas (acceder a cuentas sin contraseña).
        *   `logins.json` y `key4.db` (Firefox): Archivos específicos de Firefox para credenciales y claves de descifrado.
    *   **Método:** Itera sobre perfiles comunes (`Default`, `Profile 1`, `Profile 2`, etc.) dentro de las rutas de los navegadores y copia los archivos mencionados.

4.  **Busca y Roba Datos de Wallets de Criptomonedas y Extensiones:**
    *   **Wallets/Extensiones Afectadas:**
        *   Metamask (por ID de extensión)
        *   Exodus Wallet (busca la carpeta `exodus.wallet`)
        *   Solana (busca `id.json` en `.config/solana`)
        *   Phantom Wallet (por ID de extensión)
        *   Posiblemente otras wallets basadas en los IDs de extensión de la lista `Bt`.
    *   **Datos Buscados:**
        *   Archivos `.log` y `.ldb` dentro de `Local Extension Settings`: Pueden contener información sensible o claves.
        *   Contenido completo de la carpeta `exodus.wallet`.
        *   Archivo de configuración de Solana `id.json`.
    *   **Método:** Busca en las rutas específicas de estas aplicaciones/extensiones y copia los archivos relevantes.

5.  **Intenta Robar Keychain de macOS:**
    *   Busca los archivos `login.keychain-db` o `login.keychain` en `~/Library/Keychains/`.
    *   Intenta ejecutar el comando `security dump-keychain -d login.keychain` para volcar el contenido del llavero (requiere contraseña del usuario o privilegios elevados).
    *   Intenta comprimir (`zip`) el volcado antes de enviarlo.

6.  **Mecanismo de Preparación:**
    *   Copia los archivos robados a un directorio temporal (`%TEMP%` en Windows, `~/.n3` en Linux/macOS). Utiliza nombres de archivo temporales como `tp0`, `tp1`, etc.
    *   Lee el contenido de estos archivos temporales para prepararlos para el envío.

7.  **Exfiltración de Datos (Envío al Atacante):**
    *   Utiliza la función `Upload`.
    *   Empaqueta los archivos robados (su contenido y un nombre de archivo identificativo) junto con metadatos (tipo `htype`/`gtype`, `hostname`, `timestamp`).
    *   Envía toda esta información mediante una petición HTTP POST a la URL del servidor C2 hardcodeada: `http://45.15.154.103:1224/upload`.

8.  **Capacidad de Segunda Etapa (Descarga y Ejecución):**
    *   Las funciones `runP`, `Ht`, `Xt` intentan descargar código adicional (probablemente un script Python llamado `init.py` o una herramienta llamada `dpapi_tool`) desde el servidor C2 usando `curl` o `request`.
    *   Intenta ejecutar este código descargado usando `python`/`python3` o directamente si es un ejecutable.
    *   En Linux/macOS, intenta usar `tar` para extraer archivos descargados (posiblemente payloads adicionales).
    *   Esto permite al atacante instalar más malware (ransomware, troyanos, keyloggers) o tomar control remoto del sistema.

9.  **Persistencia/Ejecución Periódica:**
    *   Utiliza `setInterval` para ejecutar la función `main` (que inicia la recolección) cada 30 minutos.
    *   Intenta ejecutar la lógica de descarga/ejecución de Python (`Ht`, `runP`) también periódicamente.

## Riesgos y Consecuencias

Si este script se ejecuta en un sistema, las consecuencias pueden ser graves:

*   **Robo de todas las contraseñas guardadas** en los navegadores (cuentas bancarias, correos, redes sociales, etc.).
*   **Robo de sesiones activas**, permitiendo al atacante acceder a cuentas sin necesidad de contraseña.
*   **Robo de fondos de criptomonedas** de las wallets afectadas.
*   **Compromiso total del sistema** si la segunda etapa descarga y ejecuta más malware.
*   **Robo de información personal** de los datos de autocompletar.
*   **Posible robo de identidad.**

## Conclusión

Este script es una pieza de malware **altamente peligrosa** clasificada como *infostealer* con capacidades de *downloader* y *executor*. Su objetivo principal es el robo masivo de credenciales y datos financieros (criptomonedas), pero su capacidad para ejecutar código adicional lo hace extremadamente versátil y dañino.