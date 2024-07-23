const express = require('express');
const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const app = express();
const port = 3000;

// Middleware para lidar com arquivos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Endpoint para extrair texto de um PDF
app.post('/extract-text', async (req, res) => {
    const { filePath } = req.body;

    if (!filePath) {
        return res.status(400).json({ error: 'Caminho do arquivo é necessário' });
    }

    const fullPath = path.resolve(filePath);

    try {
        const dataBuffer = fs.readFileSync(fullPath);
        const data = await pdf(dataBuffer);
        res.json({ text: data.text });
    } catch (error) {
        console.error('Erro ao extrair texto:', error);
        res.status(500).json({ error: 'Erro ao extrair texto' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
