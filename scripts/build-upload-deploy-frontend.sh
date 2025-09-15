#!/bin/bash

# scripts/build-upload-deploy-frontend.sh
# Script para compilar y desplegar frontend Angular

# === CONFIGURACIÓN ===
DEFAULT_SERVER="adminflima@10.0.10.200"
DEFAULT_REMOTE_PATH="/var/www/cotizaciones.cbes.org.bo/html"
DEFAULT_LOCAL_PATH="C:\\Users\\CBES\\Documents\\SISTEMAS\\COTIZACIONES\\FRONTEND-COTIZACIONES\\cotizaciones-frontend-produccion"

SERVER=${1:-$DEFAULT_SERVER}
REMOTE_PATH=${2:-$DEFAULT_REMOTE_PATH}
LOCAL_PATH=${3:-$DEFAULT_LOCAL_PATH}

echo "🚀 PROCESO COMPLETO FRONTEND: COMPILAR + SUBIR + DESPLEGAR"
echo "=========================================================="
echo "📁 Directorio local: $LOCAL_PATH"
echo "🖥️ Servidor: $SERVER"
echo "📂 Ruta remota: $REMOTE_PATH"
echo "🔐 Autenticación: Interactiva (se pedirá contraseña)"
echo ""

# === VERIFICACIÓN INICIAL ===
if [ ! -f "$LOCAL_PATH/package.json" ]; then
  echo "❌ ERROR: package.json no encontrado en $LOCAL_PATH"
  echo "💡 Verifica que la ruta del proyecto Angular sea correcta"
  exit 1
fi

if [ ! -f "$LOCAL_PATH/angular.json" ]; then
  echo "❌ ERROR: angular.json no encontrado en $LOCAL_PATH"
  echo "💡 Asegúrate de estar en el directorio raíz del proyecto Angular"
  exit 1
fi

cd "$LOCAL_PATH" || exit 1

# Funciones SSH sin sshpass
ssh_cmd() {
    ssh -o StrictHostKeyChecking=no "$SERVER" "$1"
}

scp_cmd() {
    scp -o StrictHostKeyChecking=no -r "$1" "$SERVER:$2"
}

# === PASO 1: COMPILACIÓN ===
echo ""
echo "🔨 PASO 1: COMPILANDO FRONTEND ANGULAR..."
echo "========================================"

# Limpiar build anterior
echo "🧹 Limpiando build anterior..."
[ -d "dist" ] && rm -rf dist/

# Verificar versión de Node y Angular
echo "📦 Verificando entorno..."
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
if command -v ng &> /dev/null; then
    echo "Angular CLI: $(ng version --skip-git 2>/dev/null | head -1)"
else
    echo "⚠️ Angular CLI no encontrado globalmente"
fi

# Instalar dependencias
echo ""
echo "📦 Instalando dependencias..."
if npm install; then
    echo "✅ Dependencias instaladas correctamente"
else
    echo "❌ ERROR en npm install"
    exit 1
fi

# Compilar para producción
echo ""
echo "⚙️ Compilando para producción..."
echo "🔧 Comando: ng build --configuration production"

if ng build --configuration production; then

    echo "✅ Compilación completada exitosamente"
else
    echo "❌ ERROR en la compilación"
    echo "💡 Verifica los errores de compilación arriba"
    exit 1
fi

# Verificar que se generó el build
if [ ! -d "dist/usuario" ]; then
    echo "❌ ERROR: No se generó el directorio dist/usuario"
    echo "💡 Verifica la configuración en angular.json"
    exit 1
fi

echo "📊 Archivos generados:"
ls -la dist/usuario/ | head -10

# === VERIFICACIÓN DE CONECTIVIDAD ===
echo ""
echo "🔐 VERIFICANDO CONECTIVIDAD..."
echo "============================="
echo "Se pedirá la contraseña para verificar conexión..."

if ! ssh_cmd "echo 'Conectado correctamente al servidor web'"; then
    echo "❌ ERROR: No se puede conectar al servidor"
    echo "💡 Verifica:"
    echo "   - La contraseña esté correcta"
    echo "   - El servidor esté disponible (10.0.10.200)"
    echo "   - El usuario adminflima tenga acceso"
    exit 1
fi
echo "✅ Conectividad verificada"

# === PASO 2: PREPARACIÓN DEL SERVIDOR ===
echo ""
echo "🔧 PASO 2: PREPARANDO SERVIDOR..."
echo "==============================="
echo "🔑 Se pedirá contraseña para preparar el directorio"

# Verificar y preparar directorio de destino
preparation_script=$(cat << 'EOF'
#!/bin/bash
echo "🔍 Verificando directorio de destino..."

# Verificar si el directorio existe
if [ ! -d "REMOTE_PATH_PLACEHOLDER" ]; then
    echo "📁 Creando directorio de destino..."
    sudo mkdir -p "REMOTE_PATH_PLACEHOLDER"
    sudo chown $USER:$USER "REMOTE_PATH_PLACEHOLDER" 2>/dev/null || true
fi

# Verificar permisos de escritura
if [ -w "REMOTE_PATH_PLACEHOLDER" ]; then
    echo "✅ Permisos de escritura verificados"
else
    echo "⚠️ Ajustando permisos..."
    sudo chown $USER:$USER "REMOTE_PATH_PLACEHOLDER" 2>/dev/null || true
    sudo chmod 755 "REMOTE_PATH_PLACEHOLDER" 2>/dev/null || true
fi

# Hacer backup si hay contenido existente
if [ "$(ls -A REMOTE_PATH_PLACEHOLDER 2>/dev/null)" ]; then
    BACKUP_DIR="REMOTE_PATH_PLACEHOLDER.backup.$(date +%Y%m%d_%H%M%S)"
    echo "💾 Creando backup en: $BACKUP_DIR"
    sudo cp -r "REMOTE_PATH_PLACEHOLDER" "$BACKUP_DIR" 2>/dev/null || echo "ℹ️ No se pudo crear backup automático"
fi

echo "✅ Servidor preparado para recibir archivos"
EOF
)

# Reemplazar placeholder con la ruta real
preparation_script=${preparation_script//REMOTE_PATH_PLACEHOLDER/$REMOTE_PATH}

if ssh_cmd "$preparation_script"; then
    echo "✅ Servidor preparado correctamente"
else
    echo "⚠️ Problemas preparando servidor, continuando..."
fi

# === PASO 3: SUBIDA DE ARCHIVOS ===
echo ""
echo "📤 PASO 3: SUBIENDO ARCHIVOS..."
echo "=============================="
echo "🔑 Se pedirá contraseña para subir los archivos"
echo "📁 Subiendo contenido del build Angular a $REMOTE_PATH"

# Limpiar directorio de destino y subir archivos
upload_script=$(cat << 'EOF'
#!/bin/bash
echo "🧹 Limpiando directorio de destino..."

# Eliminar contenido anterior (pero no el directorio raíz)
find "REMOTE_PATH_PLACEHOLDER" -mindepth 1 -delete 2>/dev/null || {
    sudo find "REMOTE_PATH_PLACEHOLDER" -mindepth 1 -delete 2>/dev/null || {
        echo "⚠️ No se pudo limpiar completamente el directorio"
    }
}

echo "✅ Directorio limpiado, listo para recibir archivos"
EOF
)

# Reemplazar placeholder
upload_script=${upload_script//REMOTE_PATH_PLACEHOLDER/$REMOTE_PATH}

echo "🧹 Limpiando directorio de destino..."
ssh_cmd "$upload_script"

echo ""
echo "📦 Subiendo archivos compilados..."
echo "🔄 Esto puede tomar unos minutos dependiendo del tamaño..."

# Detectar directorio de build en el momento de la subida - ir al contenido final
if [ -d "dist/usuario/browser" ]; then
    BUILD_PATH="dist/usuario/browser"
    echo "📁 Detectado: Angular con estructura dist/usuario/browser/"
elif [ -d "dist/browser" ]; then
    BUILD_PATH="dist/browser"
    echo "📁 Detectado: Angular moderno (dist/browser/)"
elif [ -d "dist" ] && [ -f "dist/index.html" ]; then
    BUILD_PATH="dist"
    echo "📁 Detectado: Build directo en dist/ con index.html"
else
    echo "❌ ERROR: No se encontró directorio de build válido"
    echo "🔍 Estructura actual:"
    echo "dist/:"
    ls -la dist/ 2>/dev/null || echo "No existe directorio dist/"
    if [ -d "dist/usuario" ]; then
        echo "dist/usuario/:"
        ls -la dist/usuario/
    fi
    exit 1
fi

echo "📁 Origen: $BUILD_PATH"
echo "📁 Destino: $REMOTE_PATH"
echo "📋 Archivos a subir:"
ls -la "$BUILD_PATH/" | head -5

# Subir todos los archivos del directorio de build usando rsync-style con scp
echo "🔄 Iniciando subida..."

# Primero verificamos que hay archivos para subir
if [ ! "$(ls -A "$BUILD_PATH" 2>/dev/null)" ]; then
    echo "❌ ERROR: El directorio $BUILD_PATH está vacío"
    exit 1
fi

# Subir archivos uno por uno para evitar problemas con wildcards
cd "$BUILD_PATH" || exit 1
echo "📁 Cambiado al directorio: $(pwd)"

# Subir todos los archivos y carpetas
if tar -cf - . | ssh -o StrictHostKeyChecking=no "$SERVER" "cd $REMOTE_PATH && tar -xf -"; then
    echo "✅ Archivos subidos exitosamente usando tar+ssh"
else
    echo "⚠️ Método tar falló, intentando con scp individual..."
    
    # Método alternativo: subir archivos individualmente
    for item in *; do
        if [ -f "$item" ]; then
            echo "📄 Subiendo archivo: $item"
            scp -o StrictHostKeyChecking=no "$item" "$SERVER:$REMOTE_PATH/"
        elif [ -d "$item" ]; then
            echo "📁 Subiendo carpeta: $item"
            scp -o StrictHostKeyChecking=no -r "$item" "$SERVER:$REMOTE_PATH/"
        fi
    done
    echo "✅ Archivos subidos individualmente"
fi

# Volver al directorio original
cd - > /dev/null

# === PASO 4: CONFIGURACIÓN FINAL ===
echo ""
echo "⚙️ PASO 4: CONFIGURACIÓN FINAL..."
echo "==============================="
echo "🔑 Se pedirá contraseña para configurar permisos"

final_config_script=$(cat << 'EOF'
#!/bin/bash
echo "🔧 Configurando permisos finales..."

# Ajustar permisos de archivos y directorios
find "REMOTE_PATH_PLACEHOLDER" -type f -exec chmod 644 {} \; 2>/dev/null || true
find "REMOTE_PATH_PLACEHOLDER" -type d -exec chmod 755 {} \; 2>/dev/null || true

# Verificar archivos principales
echo "📊 Verificando archivos principales:"
ls -la "REMOTE_PATH_PLACEHOLDER" | head -10

# Verificar tamaño total
TOTAL_SIZE=$(du -sh "REMOTE_PATH_PLACEHOLDER" 2>/dev/null | cut -f1 || echo "N/A")
echo "📈 Tamaño total del sitio: $TOTAL_SIZE"

# Reiniciar servidor web si es necesario
echo "🔄 Reiniciando servidor web..."
sudo systemctl reload nginx 2>/dev/null && echo "✅ Nginx recargado" || {
    sudo systemctl reload apache2 2>/dev/null && echo "✅ Apache recargado" || {
        echo "ℹ️ No se pudo reiniciar el servidor web automáticamente"
    }
}

echo "✅ Configuración final completada"
EOF
)

# Reemplazar placeholder
final_config_script=${final_config_script//REMOTE_PATH_PLACEHOLDER/$REMOTE_PATH}

if ssh_cmd "$final_config_script"; then
    echo "✅ Configuración final completada"
else
    echo "⚠️ Problemas en configuración final"
fi

# === VERIFICACIÓN FINAL ===
echo ""
echo "🔍 VERIFICACIÓN FINAL..."
echo "======================="

verification_script=$(cat << 'EOF'
#!/bin/bash
echo "📊 ESTADO FINAL DEL DESPLIEGUE:"
echo "=============================="

echo "📁 Contenido del directorio:"
ls -la "REMOTE_PATH_PLACEHOLDER" | head -15

echo ""
echo "📈 Estadísticas:"
FILE_COUNT=$(find "REMOTE_PATH_PLACEHOLDER" -type f | wc -l)
echo "   Archivos totales: $FILE_COUNT"

TOTAL_SIZE=$(du -sh "REMOTE_PATH_PLACEHOLDER" 2>/dev/null | cut -f1 || echo "N/A")
echo "   Tamaño total: $TOTAL_SIZE"

# Verificar archivos clave de Angular
if [ -f "REMOTE_PATH_PLACEHOLDER/index.html" ]; then
    echo "✅ index.html encontrado"
else
    echo "⚠️ index.html no encontrado"
fi

if [ -f "REMOTE_PATH_PLACEHOLDER/main."*.js ]; then
    echo "✅ Archivos JavaScript principales encontrados"
else
    echo "⚠️ Archivos JavaScript principales no encontrados"
fi

echo ""
echo "🌐 Tu aplicación debería estar disponible en:"
echo "   http://10.0.10.200"
echo "   (o el dominio configurado en tu servidor)"
EOF
)

# Reemplazar placeholder
verification_script=${verification_script//REMOTE_PATH_PLACEHOLDER/$REMOTE_PATH}

ssh_cmd "$verification_script"

# === RESUMEN FINAL ===
echo ""
echo "🎉 ¡FRONTEND DESPLEGADO EXITOSAMENTE!"
echo "===================================="
echo "⏰ Finalizado en: $(date)"
echo ""
echo "📊 RESUMEN DEL DESPLIEGUE:"
echo "========================="
echo "📁 Proyecto: Angular $(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)"
echo "🖥️ Servidor: $SERVER"
echo "📂 Directorio: $REMOTE_PATH"
echo "🌐 URL: http://10.0.10.200"
echo ""
echo "💡 Comandos útiles para el futuro:"
echo "   ssh $SERVER"
echo "   cd $REMOTE_PATH"
echo "   ls -la  # Ver archivos"
echo "   sudo systemctl status nginx  # Estado del servidor web"
echo ""
echo "🔧 Para actualizaciones futuras:"
echo "   Ejecuta nuevamente: ./scripts/build-upload-deploy-frontend.sh"
echo ""
echo "🎯 SIGUIENTE PASO: Probar la aplicación en el navegador"
echo "   http://10.0.10.200"