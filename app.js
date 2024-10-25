const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear servidor HTTP y Express
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Crear la carpeta 'upload' en el directorio de tu proyecto si no existe
const uploadDir = path.join(__dirname, 'upload');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar multer para la subida de imágenes, audios y documentos
const storage = multer.diskStorage({
    destination: (_, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Rutas para subir archivos
app.post('/upload', upload.single('file'), (req, res) => {
    const fileUrl = `/upload/${req.file.filename}`;
    res.json({ imageUrl: fileUrl });
});

// Servir archivos estáticos desde la carpeta 'Chat'
app.use(express.static(path.join(__dirname, 'Chat')));

// Servir archivos estáticos desde la carpeta 'upload'
app.use('/upload', express.static(uploadDir));

// Ruta para servir el archivo 'index.html'
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Chat', 'index.html'));
});

// Manejo de WebSocket
let mensajes = [];
let usuariosConectados = [];

wss.on('connection', (ws) => {
    let nombreUsuario = ''; // Almacenará el nombre de usuario

    // Enviar el historial de mensajes al nuevo cliente
    ws.send(JSON.stringify({ tipo: 'historial', mensajes }));

    // Pedir el nombre del usuario al conectarse
    ws.on('message', (message) => {
        const mensaje = JSON.parse(message);
        // Si el mensaje es el nombre del usuario
        if (mensaje.tipo === 'nombreUsuario') {
            nombreUsuario = mensaje.usuario; // Guardar el nombre de usuario
            usuariosConectados.push(nombreUsuario);
            console.log(`Usuario conectado: ${nombreUsuario}`);
            return; // Terminar esta función para no seguir procesando este mensaje
        }

        // Procesar el mensaje como un mensaje de chat
        mensaje.usuario = nombreUsuario; // Asignar el nombre de usuario a los mensajes
        mensajes.push(mensaje); // Agregar el mensaje al historial
        console.log('Mensaje recibido:', mensaje); // Para depuración

        // Enviar el mensaje a todos los clientes conectados
        enviarMensajeATodos(mensaje);
    });
});

// Función para enviar un mensaje a todos los clientes
function enviarMensajeATodos(mensaje) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ tipo: 'nuevoMensaje', mensaje }));
        }
    });
}

// Iniciar servidor
server.listen(3000, () => {
    console.log('Servidor en funcionamiento en http://192.168.0.104:3000');
});
