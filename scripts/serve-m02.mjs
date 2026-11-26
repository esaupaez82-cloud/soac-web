import express from 'express';
import auth from '../api/auth.js';
import m02 from '../api/m02.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({limit:'64kb'}));
app.get('/health', (_req, res) => res.status(204).end());
app.all('/api/auth', auth);
app.all('/api/m02', m02);
app.listen(Number(process.env.PORT || 10000), '0.0.0.0');
