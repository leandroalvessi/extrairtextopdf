const express = require('express');
const multer = require('multer');
const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.post('/itau-extract-text', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Arquivo é necessário' });
    }

    const fullPath = path.resolve(req.file.path);

    try {
        const dataBuffer = fs.readFileSync(fullPath);
        const data = await pdf(dataBuffer);

        const datePattern = /^\d{2}\/\d{2}\/\d{4}/;
        const linePattern = /^(\d{2}\/\d{2}\/\d{2,4})[\s\S]*?([-]?\d{1,3}(?:\.\d{3})*,\d{2})$/;

        const filteredLines = data.text
            .split('\n')
            .filter(line => datePattern.test(line))
            .map(line => {
                const match = line.match(linePattern);
                if (match) {
                    let valor = match[2].trim();
                    valor = valor.replace('.', '').replace(',', '.');
                    valor = parseFloat(valor);

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
    } finally {
        // Remove o arquivo após processamento para economizar espaço em disco
        fs.unlinkSync(fullPath);
    }
});

app.post('/caixa-extract-text', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Arquivo é necessário' });
    }

    const fullPath = path.resolve(req.file.path);

    try {
        const dataBuffer = fs.readFileSync(fullPath);
        const data = await pdf(dataBuffer);

        const datePattern = /^\d{2}\/\d{2}\/\d{4}/;
        // Regex ajustada para capturar data, histórico, descrição, valor, natureza valor, saldo e natureza saldo
        const linePattern = /^(\d{2}\/\d{2}\/\d{4})\s*(\d{6})\s*([^\d]+?)\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*([A-Z])\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*([A-Z])$/;

        const filteredLines = data.text
            .split('\n')
            .filter(line => datePattern.test(line))
            .map(line => {
               // console.log("Linha original:", line);
                const match = line.match(linePattern);
                if (match) {
                    //console.log("Capturas regex:", match);
                    
                    // Extração e normalização do valor
                    let valor = match[4].trim();
                    valor = valor.replace('.', '').replace(',', '.');
                    valor = parseFloat(valor);

                    // Extração da descrição
                    const descricao = match[3].trim();
                    
                    // Obter o saldo final
                    const saldo = match[6].trim().replace('.', '').replace(',', '.');
                    
                    // Extração do histórico
                    const historico = match[2].trim();
                    
                    return {
                        data: match[1],
                        historico: historico,
                        descricao: descricao,
                        valor: valor,
                        naturezaValor: match[5].trim(),
                        saldo: parseFloat(saldo),
                        naturezaSaldo: match[7].trim(),
                    };
                }
                return null;
            })
            .filter(line => line !== null);

        res.json({ text: filteredLines });
    } catch (error) {
        console.error('Erro ao extrair texto:', error);
        res.status(500).json({ error: 'Erro ao extrair texto' });
    } finally {
        // Remove o arquivo após processamento para economizar espaço em disco
        fs.unlinkSync(fullPath);
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});

// DICA PARA MELHOR ORGANIZAR O REGEX 
// (Vamos ajustar a regex e a lógica para garantir que cada parte da linha seja 
// extraída corretamente. É importante garantir que o formato da regex corresponda 
// exatamente ao formato dos dados no seu PDF. Vamos criar uma regex mais detalhada 
// e adicionar algum logging para ajudar na depuração.)

// ajustar codigo para retornar  '15/07/2024151328CRED PIX138,78 C138,78 C'

// Data: 15/07/2024 (primeiros 10 caracteres)
// Histórico: 151328 (próximos 6 caracteres)
// Descrição: CRED PIX (próximos 9 caracteres)
// Valor: 138,78 (próximos 6 caracteres, ajustado para ser um número)
// Natureza Valor: C (próximo caractere)
// Saldo: 138,78 (próximos 6 caracteres, ajustado para ser um número)
// Natureza Saldo: C (último caractere ou caracteres)

//pkg . --targets node18-win-x64 --output meu-app.exe --assets "node_modules/pdf-parse/lib/pdf.js/**/*"



