const express = require('express');
const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.post('/itau-extract-text', async (req, res) => {
    const { filePath } = req.body;

    if (!filePath) {
        return res.status(400).json({ error: 'Caminho do arquivo é necessário' });
    }

    const fullPath = path.resolve(filePath);

    try {
        const dataBuffer = fs.readFileSync(fullPath);
        const data = await pdf(dataBuffer);
    
        const datePattern = /^\d{2}\/\d{2}\/\d{4}/;
        // Regex ajustado para capturar a data, valor numérico e permitir descrição no meio
        const linePattern = /^(\d{2}\/\d{2}\/\d{2,4})[\s\S]*?([-]?\d{1,3}(?:\.\d{3})*,\d{2})$/;
    
        const filteredLines = data.text
            .split('\n')
            .filter(line => datePattern.test(line))
            .map(line => {
                const match = line.match(linePattern);
                if (match) {
                    // Extração e normalização do valor
                    let valor = match[2].trim();
                    valor = valor.replace('.', '').replace(',', '.');
                    valor = parseFloat(valor);
    
                    // Obter a descrição usando a parte restante da linha
                    const descricao = line.substring(match[0].indexOf(match[1]) + match[1].length, line.indexOf(match[2])).trim();
    
                    return {
                        data: match[1],
                        descricao: descricao,
                        valor: valor
                    };
                }
                return null;
            })
            .filter(line => line !== null);
    
        res.json({ text: filteredLines });
    } catch (error) {
        console.error('Erro ao extrair texto:', error);
        res.status(500).json({ error: 'Erro ao extrair texto' });
    }
});

app.post('/caixa-extract-text', async (req, res) => {
    const { filePath } = req.body;

    if (!filePath) {
        return res.status(400).json({ error: 'Caminho do arquivo é necessário' });
    }

    const fullPath = path.resolve(filePath);

    try {
        const dataBuffer = fs.readFileSync(fullPath);
        const data = await pdf(dataBuffer);

        const datePattern = /^\d{2}\/\d{2}\/\d{4}/;
        // Regex ajustado para capturar a data, histórico, valor numérico, saldo numérico e natureza saldo
        const linePattern = /^(\d{2}\/\d{2}\/\d{4})(\d+)([\s\S]*?)(\d{1,3}(?:\.\d{3})*,\d{2})([\s\S]*?)(\d{1,3}(?:\.\d{3})*,\d{2})([\s\S]*?)(.*)$/;

        console.log(data.text);

        const filteredLines = data.text
            .split('\n')
            .filter(line => datePattern.test(line))
            .map(line => {
                const match = line.match(linePattern);
                if (match) {
                    // Extração e normalização do valor
                    let valor = match[4].trim();
                    valor = valor.replace('.', '').replace(',', '.');
                    valor = parseFloat(valor);
                    
                    // Extração da descrição
                    const naturesaSaldo = match[8].trim();
                    
                    // Obter o valor final
                    const saldo = match[6].trim().replace('.', '').replace(',', '.');
                    
                    // Extração do histórico
                    const historico = match[2].trim();
                    
                    return {
                        data: match[1],
                        historico: historico,
                        valoralor: valor,
                        saldo: parseFloat(saldo),
                        naturesaSaldo: naturesaSaldo,
                    };
                }
                return null;
            })
            .filter(line => line !== null);

        res.json({ text: filteredLines });
    } catch (error) {
        console.error('Erro ao extrair texto:', error);
        res.status(500).json({ error: 'Erro ao extrair texto' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
