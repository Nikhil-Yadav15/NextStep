import express
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error(' API Key not found. Please set GEMINI_API_KEY in your .env file.');
    console.error('Get your API key from: https://makersuite.google.com/app/apikey');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const DATA_FILE = path.join(__dirname, 'saved_texts.json');

async function initDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, JSON.stringify({ texts: [] }), 'utf8');
        console.log(' Created data file:', DATA_FILE);
    }
}

async function readTexts() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading texts:', error);
        return { texts: [] };
    }
}

async function writeTexts(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing texts:', error);
        throw error;
    }
}


app.get('/', (req, res) => {
    res.json({
        status: 'running',
        message: ' Smart Text Saver Backend is running!',
        endpoints: {
            save: 'POST /api/save',
            query: 'POST /api/query',
            texts: 'GET /api/texts'
        }
    });
});

app.post('/api/save', async (req, res) => {
    try {
        const { text, url, title, timestamp } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const data = await readTexts();
        
        const newText = {
            id: Date.now().toString(),
            text,
            url: url || 'Unknown',
            title: title || 'Untitled',
            timestamp: timestamp || new Date().toISOString()
        };
        
        data.texts.unshift(newText);
        await writeTexts(data);
        
        console.log(` Saved text from: ${title}`);
        res.json({ 
            success: true, 
            message: 'Text saved successfully',
            data: newText 
        });
    } catch (error) {
        console.error('Error saving text:', error);
        res.status(500).json({ error: 'Failed to save text' });
    }
});


app.get('/api/texts', async (req, res) => {
    try {
        const data = await readTexts();
        res.json({ 
            success: true,
            texts: data.texts 
        });
    } catch (error) {
        console.error('Error fetching texts:', error);
        res.status(500).json({ error: 'Failed to fetch texts' });
    }
});

app.post('/api/query', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const data = await readTexts();
        
        if (data.texts.length === 0) {
            return res.json({
                success: true,
                answer: "You haven't saved any texts yet. Start by selecting text on any webpage and clicking the save button!",
                sources: []
            });
        }

        let context = "You are a helpful assistant with access to the user's saved text snippets. Here are the saved texts:\n\n";
        
        data.texts.forEach((item, idx) => {
            context += `[${idx + 1}] From "${item.title}" (${item.url}):\n${item.text}\n\n`;
        });
        
        context += `\nUser question: ${query}\n\nProvide a helpful answer based on the saved texts above. If the answer relates to specific saved texts, mention which ones.`;

        const result = await model.generateContent(context);
        const response = await result.response;
        const answer = response.text();

  
        const relevantSources = data.texts.filter(item => {
            const queryLower = query.toLowerCase();
            const textLower = item.text.toLowerCase();
            return textLower.includes(queryLower) || 
                   query.split(' ').some(word => word.length > 3 && textLower.includes(word.toLowerCase()));
        }).slice(0, 3); 

        console.log(` Query: "${query}"`);
        res.json({
            success: true,
            answer: answer,
            sources: relevantSources.map(s => ({
                title: s.title,
                url: s.url,
                snippet: s.text.substring(0, 100) + '...'
            }))
        });
    } catch (error) {
        console.error('Error querying chatbot:', error);
        res.status(500).json({ 
            error: 'Failed to generate response',
            message: error.message 
        });
    }
});

app.delete('/api/texts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readTexts();
        
        data.texts = data.texts.filter(item => item.id !== id);
        await writeTexts(data);
        
        res.json({ 
            success: true, 
            message: 'Text deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting text:', error);
        res.status(500).json({ error: 'Failed to delete text' });
    }
});

async function startServer() {
    await initDataFile();
    
    app.listen(port, () => {
        console.log(`Gemini AI: Connected`);
    });
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});