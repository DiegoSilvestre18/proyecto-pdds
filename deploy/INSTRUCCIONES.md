# Instrucciones de Despliegue en la Máquina Virtual

Una vez que hayas hecho `git commit` y `git push` de estos nuevos archivos (Dockerfile, docker-compose.yml y la carpeta deploy) hacia Github, sigue estos pasos conectándote por SSH a tu VM:

`ssh 1inf54.982.4d@200.16.7.174`

### 1. Clonar tu proyecto
Si aún no lo has clonado:
```bash
git clone https://github.com/Jyprex/proyecto-pdds.git
cd proyecto-pdds
```
*(Si ya lo tienes, simplemente haz `git pull` dentro de la carpeta).*

### 2. Construir el Frontend (Sin instalar Node.js)
Estando en la carpeta `proyecto-pdds`, ejecuta este comando de Docker. Lo que hace es levantar un contenedor temporal de Node.js, instalar dependencias (`npm install`) y compilar React (`npm run build`), y luego el contenedor se elimina, dejando la carpeta compilada `frontend/dist`.
```bash
sudo docker run --rm -v $(pwd)/frontend:/app -w /app node:20 /bin/bash -c "npm install && npm run build"
```

### 3. Levantar el Backend (Con Docker Compose)
Estando en la misma carpeta raíz `proyecto-pdds`, ejecuta:
```bash
sudo docker compose up -d --build
```
Esto creará la imagen del backend y la dejará corriendo en segundo plano exponiendo el puerto `8081`. 

### 4. Configurar el Reverse Proxy en Nginx
Reemplaza la configuración por defecto de Nginx con la configuración que hemos preparado en la carpeta `deploy`.

```bash
# Hacemos una copia de seguridad por si acaso
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak

# Copiamos nuestro archivo como el nuevo default
sudo cp deploy/nginx.conf /etc/nginx/sites-available/default

# Reiniciamos Nginx para aplicar los cambios
sudo systemctl restart nginx
```

### ¡Y listo!
Tu aplicación debe estar funcionando. Abre en tu navegador la IP `http://200.16.7.174`. El Nginx cargará el frontend al instante, y cualquier petición a `/api/` o `/ws/` viajará directo hacia el contenedor de Spring Boot en el puerto 8081.
